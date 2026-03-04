import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'ssh2';
import { Readable } from 'stream';
import { SystemMetrics, BandwidthMetrics } from '../../entities/deployment.entity';

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  timeout?: number; // 命令执行超时时间（毫秒）
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  serviceRunning: boolean;
  portAccessible: boolean;
  metrics?: SystemMetrics;
  latency?: number;
  error?: string;
}

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);

  /**
   * Test SSH connection to server
   */
  async testConnection(config: SshConfig): Promise<boolean> {
    return new Promise((resolve) => {
      const conn = new Client();
      let resolved = false;

      conn
        .on('ready', () => {
          this.logger.log(`SSH连接成功: ${config.host}:${config.port}`);
          conn.end();
          resolved = true;
          resolve(true);
        })
        .on('error', (err) => {
          this.logger.error(`SSH连接失败: ${err.message}`);
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        })
        .connect({
          ...config,
          readyTimeout: 30000,
          keepaliveInterval: 10000,
        });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!resolved) {
          conn.end();
          resolved = true;
          resolve(false);
        }
      }, 10000);
    });
  }

  /**
   * Execute command and return output
   */
  async executeCommand(
    config: SshConfig,
    command: string,
    onOutput?: (data: string) => void,
    timeout: number = 300000, // 默认5分钟超时
  ): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';
      let exitCode = 0;
      let timer: NodeJS.Timeout;

      conn
        .on('ready', () => {
          this.logger.log(`执行命令: ${command}`);

          // 设置超时
          timer = setTimeout(() => {
            this.logger.warn(`命令执行超时: ${command}`);
            conn.end();
            resolve({ stdout, stderr: '命令执行超时', exitCode: -1 });
          }, timeout);

          conn.exec(command, (err, stream) => {
            if (err) {
              clearTimeout(timer);
              conn.end();
              return reject(err);
            }

            stream
              .on('close', (code: number) => {
                clearTimeout(timer);
                exitCode = code;
                conn.end();
                resolve({ stdout, stderr, exitCode });
              })
              .on('data', (data: Buffer) => {
                const output = data.toString('utf8');
                stdout += output;
                if (onOutput) {
                  onOutput(output);
                }
              })
              .stderr.on('data', (data: Buffer) => {
                const error = data.toString('utf8');
                stderr += error;
                if (onOutput) {
                  onOutput(error);
                }
              });
          });
        })
        .on('error', (err) => {
          clearTimeout(timer);
          this.logger.error(`SSH执行错误: ${err.message}`);
          reject(err);
        })
        .connect({
          ...config,
          readyTimeout: 90000,  // 增加到 90 秒
          keepaliveInterval: 15000,  // 15 秒心跳
          algorithms: {
            kex: [
              'diffie-hellman-group-exchange-sha256',
              'diffie-hellman-group14-sha256',
              'ecdh-sha2-nistp256',
              'curve25519-sha256'
            ],
            cipher: [
              'aes128-ctr',
              'aes192-ctr',
              'aes256-ctr',
              'aes128-gcm',
              'aes256-gcm'
            ]
          }
        });
    });
  }

  /**
   * Upload script file to remote server
   */
  async uploadScript(
    config: SshConfig,
    localScript: string,
    remotePath: string,
    onProgress?: (data: string) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn
        .on('ready', () => {
          this.logger.log(`上传脚本到 ${remotePath}`);
          conn.sftp((err, sftp) => {
            if (err) {
              conn.end();
              return reject(err);
            }

            const stream = Readable.from([localScript]);
            const writeStream = sftp.createWriteStream(remotePath);

            writeStream
              .on('close', () => {
                this.logger.log('脚本上传成功');
                sftp.end();
                conn.end();
                resolve();
              })
              .on('error', (err) => {
                this.logger.error(`上传错误: ${err.message}`);
                sftp.end();
                conn.end();
                reject(err);
              });

            stream.pipe(writeStream);
          });
        })
        .on('error', (err) => {
          this.logger.error(`SSH上传错误: ${err.message}`);
          reject(err);
        })
        .connect({
          ...config,
          readyTimeout: 60000,  // 增加到 60 秒
          keepaliveInterval: 15000,  // 15 秒心跳
          algorithms: {
            kex: [
              'diffie-hellman-group-exchange-sha256',
              'diffie-hellman-group14-sha256',
              'ecdh-sha2-nistp256',
              'curve25519-sha256'
            ],
            cipher: [
              'aes128-ctr',
              'aes192-ctr',
              'aes256-ctr',
              'aes128-gcm',
              'aes256-gcm'
            ]
          }
        });
    });
  }

  /**
   * Execute shell script with real-time output
   */
  async executeScript(
    config: SshConfig,
    scriptPath: string,
    onOutput: (data: string) => void,
    timeout: number = 300000,
  ): Promise<ExecResult> {
    const command = `chmod +x ${scriptPath} && ${scriptPath}`;
    return this.executeCommand(config, command, onOutput, timeout);
  }

  /**
   * Get system metrics (CPU, memory, network, etc.)
   */
  async getSystemMetrics(config: SshConfig): Promise<SystemMetrics> {
    try {
      // Get CPU usage
      const cpuResult = await this.executeCommand(
        config,
        "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'"
      );
      const cpuUsage = parseFloat(cpuResult.stdout.trim()) || 0;

      // Get memory info
      const memResult = await this.executeCommand(config, 'free -m | grep Mem');
      const memLines = memResult.stdout.trim().split(/\s+/);
      const memoryTotal = parseFloat(memLines[1]) || 0;
      const memoryUsed = parseFloat(memLines[2]) || 0;
      const memoryUsage = memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0;

      // Get disk usage
      const diskResult = await this.executeCommand(config, "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
      const diskUsage = parseFloat(diskResult.stdout.trim()) || 0;

      // Get network stats (RX/TX)
      const netResult = await this.executeCommand(
        config,
        "cat /proc/net/dev | grep eth0 | awk '{print $2, $10}' || cat /proc/net/dev | tail -1 | awk '{print $2, $10}'"
      );
      const netLines = netResult.stdout.trim().split(/\s+/);
      const networkRx = (parseFloat(netLines[0]) || 0) / 1024; // Convert to KB
      const networkTx = (parseFloat(netLines[1]) || 0) / 1024;

      // Get system uptime
      const uptimeResult = await this.executeCommand(config, 'cat /proc/uptime | awk \'{print $1}\'');
      const uptime = parseFloat(uptimeResult.stdout.trim()) || 0;

      return {
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        memoryUsed: Math.round(memoryUsed),
        memoryTotal: Math.round(memoryTotal),
        diskUsage: Math.round(diskUsage * 100) / 100,
        networkRx: Math.round(networkRx),
        networkTx: Math.round(networkTx),
        uptime: Math.round(uptime),
      };
    } catch (error) {
      this.logger.error(`获取系统指标失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if VPN service is running
   */
  async checkServiceStatus(config: SshConfig, serviceName: string = 'v2ray'): Promise<boolean> {
    try {
      const result = await this.executeCommand(
        config,
        `systemctl is-active ${serviceName} 2>/dev/null || service ${serviceName} status 2>/dev/null | grep running`
      );
      return result.stdout.includes('active') || result.stdout.includes('running');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if port is accessible
   */
  async checkPortAccessible(config: SshConfig, port: number): Promise<boolean> {
    try {
      const result = await this.executeCommand(
        config,
        `netstat -tuln | grep :${port} || ss -tuln | grep :${port} || lsof -i :${port}`
      );
      return result.stdout.includes(`:${port}`);
    } catch (error) {
      return false;
    }
  }

  /**
   * Test network latency (ping)
   */
  async testLatency(config: SshConfig): Promise<number> {
    const startTime = Date.now();
    try {
      await this.executeCommand(config, 'echo "latency-test"', null, 5000);
      return Date.now() - startTime;
    } catch (error) {
      return -1;
    }
  }

  /**
   * Perform health check
   */
  async healthCheck(config: SshConfig, vpnPort: number, vpnType: string): Promise<HealthCheckResult> {
    try {
      // Test connection latency
      const startTime = Date.now();
      const connected = await this.testConnection(config);
      if (!connected) {
        return {
          isHealthy: false,
          serviceRunning: false,
          portAccessible: false,
          error: 'SSH连接失败',
        };
      }
      const latency = Date.now() - startTime;

      // Get system metrics (使用较短超时，避免卡住)
      let metrics: SystemMetrics = null;
      try {
        metrics = await this.executeCommand(config, 'echo "quick-check"', null, 3000)
          .then(() => null)
          .catch(() => null);
      } catch (error) {
        this.logger.warn(`System metrics check skipped: ${error.message}`);
      }

      // Check service status (并行检查以节省时间)
      const serviceName = vpnType.toLowerCase();
      let serviceRunning = false;
      try {
        const serviceCheck = this.executeCommand(
          config,
          `systemctl is-active ${serviceName} || service ${serviceName} status`,
          null,
          5000
        );
        const result = await Promise.race([
          serviceCheck,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]) as ExecResult;
        serviceRunning = result.stdout.includes('active') || result.stdout.includes('running');
      } catch (error) {
        this.logger.warn(`Service status check failed: ${error.message}`);
        serviceRunning = false;
      }

      // Check port accessibility (并行检查)
      let portAccessible = false;
      try {
        const portCheck = this.executeCommand(
          config,
          `netstat -tuln | grep :${vpnPort} || ss -tuln | grep :${vpnPort}`,
          null,
          5000
        );
        const result = await Promise.race([
          portCheck,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]) as ExecResult;
        portAccessible = result.stdout.includes(`:${vpnPort}`);
      } catch (error) {
        this.logger.warn(`Port check failed: ${error.message}`);
        portAccessible = false;
      }

      // Determine overall health
      const isHealthy = serviceRunning && portAccessible;

      return {
        isHealthy,
        serviceRunning,
        portAccessible,
        metrics,
        latency,
      };
    } catch (error) {
      this.logger.error(`健康检查失败: ${error.message}`);
      return {
        isHealthy: false,
        serviceRunning: false,
        portAccessible: false,
        error: error.message,
      };
    }
  }

  /**
   * Restart VPN service
   */
  async restartService(config: SshConfig, serviceName: string = 'v2ray'): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.executeCommand(
        config,
        `systemctl restart ${serviceName} 2>/dev/null || service ${serviceName} restart 2>/dev/null`
      );

      if (result.exitCode === 0) {
        return { success: true, message: '服务重启成功' };
      } else {
        return { success: false, message: result.stderr || '服务重启失败' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop VPN service
   */
  async stopService(config: SshConfig, serviceName: string = 'v2ray'): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.executeCommand(
        config,
        `systemctl stop ${serviceName} 2>/dev/null || service ${serviceName} stop 2>/dev/null`
      );

      if (result.exitCode === 0) {
        return { success: true, message: '服务已停止' };
      } else {
        return { success: false, message: result.stderr || '停止服务失败' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Start VPN service
   */
  async startService(config: SshConfig, serviceName: string = 'v2ray'): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.executeCommand(
        config,
        `systemctl start ${serviceName} 2>/dev/null || service ${serviceName} start 2>/dev/null`
      );

      if (result.exitCode === 0) {
        return { success: true, message: '服务已启动' };
      } else {
        return { success: false, message: result.stderr || '启动服务失败' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get VPN service logs
   */
  async getServiceLogs(config: SshConfig, serviceName: string = 'v2ray', lines: number = 100): Promise<string> {
    try {
      const result = await this.executeCommand(
        config,
        `journalctl -u ${serviceName} -n ${lines} --no-pager 2>/dev/null || tail -n ${lines} /var/log/${serviceName}.log 2>/dev/null || echo "日志文件不存在"`
      );
      return result.stdout;
    } catch (error) {
      return `获取日志失败: ${error.message}`;
    }
  }

  /**
   * Execute custom command
   */
  async executeCustomCommand(config: SshConfig, command: string): Promise<ExecResult> {
    return this.executeCommand(config, command);
  }
}
