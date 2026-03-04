/**
 * SSH Configuration interfaces
 * Type definitions for SSH connections and command execution
 */

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  timeout?: number;
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

export interface SystemMetrics {
  cpuUsage: number;          // CPU使用率 (0-100)
  memoryUsage: number;       // 内存使用率 (0-100)
  memoryUsed: number;        // 已用内存 (MB)
  memoryTotal: number;       // 总内存 (MB)
  diskUsage: number;         // 磁盘使用率 (0-100)
  networkRx: number;         // 网络接收 (KB/s)
  networkTx: number;         // 网络发送 (KB/s)
  uptime: number;            // 运行时长 (秒)
}

export interface BandwidthMetrics {
  totalRx: number;           // 总接收流量 (GB)
  totalTx: number;           // 总发送流量 (GB)
  currentRx: number;         // 当前接收速率 (MB/s)
  currentTx: number;         // 当前发送速率 (MB/s)
}

export interface OnlineUser {
  id: string;
  ip: string;
  connectedAt: Date;
  trafficRx: number;         // 接收流量 (MB)
  trafficTx: number;         // 发送流量 (MB)
}

export interface ScriptExecutionOptions {
  onOutput?: (output: string) => void;
  timeout?: number;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
}
