import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as genericPool from 'generic-pool';
import { Client } from 'ssh2';
import { SshConfig } from '../deploy/ssh.service';
import { DEPLOYMENT_TIMEOUTS, SSH_ALGORITHMS } from '../../constants/deployment.constants';

/**
 * SSH 连接包装类
 * 用于跟踪连接状态
 */
export class SSHConnectionWrapper {
  readonly client: Client;
  readonly config: SshConfig;
  createdAt: Date;
  lastUsedAt: Date;
  isConnected: boolean = false;

  constructor(config: SshConfig) {
    this.config = config;
    this.client = new Client();
    this.createdAt = new Date();
    this.lastUsedAt = new Date();
  }

  markAsConnected() {
    this.isConnected = true;
    this.lastUsedAt = new Date();
  }

  markAsUsed() {
    this.lastUsedAt = new Date();
  }
}

/**
 * SSH 连接池工厂类
 * 用于创建和销毁 SSH 连接
 */
class SSHPoolFactory {
  private readonly logger = new Logger(SSHPoolFactory.name);

  /**
   * 创建新的 SSH 连接
   */
  create(wrapper: SSHConnectionWrapper): Promise<SSHConnectionWrapper> {
    return new Promise((resolve, reject) => {
      const { client, config } = wrapper;

      let resolved = false;

      client
        .on('ready', () => {
          this.logger.log(`SSH 连接已建立: ${config.host}:${config.port}`);
          wrapper.markAsConnected();
          resolved = true;
          resolve(wrapper);
        })
        .on('error', (err) => {
          this.logger.error(`SSH 连接失败: ${err.message}`);
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        })
        .connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey,
          readyTimeout: DEPLOYMENT_TIMEOUTS.SSH_CONNECTION,
          keepaliveInterval: 15000,
          algorithms: SSH_ALGORITHMS,
        });
    });
  }

  /**
   * 销毁 SSH 连接
   */
  destroy(wrapper: SSHConnectionWrapper): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (wrapper.isConnected) {
          wrapper.client.end();
          wrapper.isConnected = false;
        }
        resolve();
      } catch (error) {
        this.logger.error(`销毁 SSH 连接失败: ${error.message}`);
        resolve(); // 即使失败也resolve
      }
    });
  }

  /**
   * 验证 SSH 连接是否仍然有效
   */
  validate(wrapper: SSHConnectionWrapper): boolean {
    if (!wrapper.isConnected) {
      return false;
    }

    // 检查连接是否超时（5分钟未使用）
    const idleTime = Date.now() - wrapper.lastUsedAt.getTime();
    if (idleTime > 5 * 60 * 1000) {
      this.logger.warn(`SSH 连接空闲超时: ${wrapper.config.host}:${wrapper.config.port}`);
      return false;
    }

    return true;
  }
}

/**
 * SSH 连接池服务
 * 管理 SSH 连接池以提高性能
 */
@Injectable()
export class SSHPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(SSHPoolService.name);
  private readonly pools = new Map<string, genericPool.Pool<SSHConnectionWrapper>>();
  private readonly factory = new SSHPoolFactory();

  // 连接池配置
  private readonly minConnections: number = 2;
  private readonly maxConnections: number = 10;
  private readonly acquireTimeoutMillis: number = 30000; // 30秒获取超时

  constructor(private configService: ConfigService) {
    // 从环境变量读取配置
    this.minConnections = this.configService.get<number>('SSH_POOL_MIN', 2);
    this.maxConnections = this.configService.get<number>('SSH_POOL_MAX', 10);
  }

  /**
   * 获取连接池的键
   */
  private getPoolKey(config: SshConfig): string {
    return `${config.host}:${config.port}:${config.username}`;
  }

  /**
   * 获取或创建连接池
   */
  private getPool(config: SshConfig): genericPool.Pool<SSHConnectionWrapper> {
    const key = this.getPoolKey(config);

    if (!this.pools.has(key)) {
      this.logger.log(`创建新的 SSH 连接池: ${key}`);

      const pool = genericPool.createPool(
        {
          create: () => this.factory.create(new SSHConnectionWrapper(config)),
          destroy: (wrapper) => this.factory.destroy(wrapper),
          validate: (wrapper) => this.factory.validate(wrapper),
        },
        {
          min: this.minConnections,
          max: this.maxConnections,
          acquireTimeoutMillis: this.acquireTimeoutMillis,
          idleTimeoutMillis: 60000, // 1分钟空闲超时
          evictionRunIntervalMillis: 30000, // 每30秒清理一次
        }
      );

      // 监听池事件
      pool.on('factoryCreateError', (err) => {
        this.logger.error(`创建连接失败: ${err.message}`);
      });

      pool.on('factoryDestroyError', (err) => {
        this.logger.error(`销毁连接失败: ${err.message}`);
      });

      this.pools.set(key, pool);
    }

    return this.pools.get(key)!;
  }

  /**
   * 从连接池获取 SSH 连接
   */
  async acquire(config: SshConfig): Promise<Client> {
    const pool = this.getPool(config);
    const wrapper = await pool.acquire();
    wrapper.markAsUsed();
    return wrapper.client;
  }

  /**
   * 归还 SSH 连接到池
   */
  async release(config: SshConfig, client: Client): Promise<void> {
    const key = this.getPoolKey(config);
    const pool = this.pools.get(key);

    if (pool) {
      // 创建一个临时的 wrapper 对象用于归还
      const wrapper = new SSHConnectionWrapper(config);
      wrapper.client = client;
      wrapper.isConnected = true;

      await pool.release(wrapper);
    }
  }

  /**
   * 销毁指定的 SSH 连接池
   */
  async destroyPool(config: SshConfig): Promise<void> {
    const key = this.getPoolKey(config);
    const pool = this.pools.get(key);

    if (pool) {
      await pool.drain();
      await pool.clear();
      this.pools.delete(key);
      this.logger.log(`SSH 连接池已销毁: ${key}`);
    }
  }

  /**
   * 获取连接池统计信息
   */
  getPoolStats(config: SshConfig): any {
    const key = this.getPoolKey(config);
    const pool = this.pools.get(key);

    if (!pool) {
      return null;
    }

    return pool.pool;
  }

  /**
   * 模块销毁时清理所有连接池
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('清理所有 SSH 连接池...');

    const destroyPromises = Array.from(this.pools.values()).map((pool) =>
      pool.drain().then(() => pool.clear())
    );

    await Promise.allSettled(destroyPromises);
    this.pools.clear();

    this.logger.log('所有 SSH 连接池已清理');
  }

  /**
   * 清理所有连接池（用于手动清理）
   */
  async flushAll(): Promise<void> {
    await this.onModuleDestroy();
  }
}
