import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 简单的内存缓存服务
 * 如果配置了 Redis，可以使用 @nestjs/cache-manager 的 Redis 适配器
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, { value: any; expiry: number }>();
  private readonly defaultTTL: number;

  constructor(private configService: ConfigService) {
    // 默认 TTL 1小时（秒）
    this.defaultTTL = this.configService.get<number>('CACHE_TTL', 3600);

    // 每10分钟清理一次过期缓存
    setInterval(() => this.cleanExpiredCache(), 10 * 60 * 1000);
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return cached.value as T;
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），默认使用配置的 TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = Date.now() + (ttl || this.defaultTTL) * 1000;

    this.cache.set(key, { value, expiry });
    this.logger.debug(`Cache set: ${key} (TTL: ${ttl || this.defaultTTL}s)`);
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<void> {
    this.cache.clear();
    this.logger.log('Cache flushed');
  }

  /**
   * 检查缓存是否存在且未过期
   */
  async has(key: string): Promise<boolean> {
    const cached = this.cache.get(key);

    if (!cached) {
      return false;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，调用工厂函数获取值
    const value = await factory();
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * 清理过期的缓存条目
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 批量删除缓存（支持模式匹配）
   */
  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    this.logger.log(`Deleted ${deleted} cache entries matching pattern: ${pattern}`);
  }
}
