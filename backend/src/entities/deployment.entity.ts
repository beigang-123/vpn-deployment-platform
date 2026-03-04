import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, AfterLoad, BeforeInsert, BeforeUpdate, Index } from 'typeorm';
import { EncryptionService } from '../modules/encryption/encryption.service';

export enum DeploymentStatus {
  PENDING = 'pending',           // 等待中
  DEPLOYING = 'deploying',       // 部署中
  RUNNING = 'running',           // 运行中
  STOPPED = 'stopped',           // 已停止
  STARTING = 'starting',         // 启动中
  RESTARTING = 'restarting',     // 重启中
  ERROR = 'error',               // 异常
  COMPLETED = 'completed',       // 已完成（保留兼容）
  FAILED = 'failed',             // 失败（保留兼容）
}

export enum VpnType {
  V2RAY = 'v2ray',
  XRAY = 'xray',
  WIREGUARD = 'wireguard',
  OPENVPN = 'openvpn',
  TROJAN = 'trojan',
  SHADOWSOCKS = 'shadowsocks',
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

@Entity('deployments')
@Index(['status', 'region'])
@Index(['serverIp', 'status'])
@Index(['createdAt'])
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  serverIp: string;

  @Column({ type: 'int' })
  sshPort: number;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'text', nullable: true })
  password: string;           // SSH密码（加密存储）

  @Column({ type: 'text', nullable: true })
  privateKey: string;         // SSH私钥（加密存储）

  @Column({
    type: 'enum',
    enum: VpnType,
  })
  vpnType: VpnType;

  @Column({
    type: 'enum',
    enum: DeploymentStatus,
    default: DeploymentStatus.PENDING,
  })
  status: DeploymentStatus;

  @Column({ type: 'json', nullable: true })
  configJson: any;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', nullable: true })
  vpnPort: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  uuid: string;

  // 新增字段

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string;             // 地区/节点位置

  @Column({ type: 'varchar', length: 100, nullable: true })
  nodeName: string;           // 节点名称

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;           // 到期时间

  @Column({ type: 'json', nullable: true })
  systemMetrics: SystemMetrics;  // 系统监控指标

  @Column({ type: 'json', nullable: true })
  bandwidthMetrics: BandwidthMetrics;  // 带宽使用情况

  @Column({ type: 'int', default: 0 })
  onlineUsers: number;        // 在线用户数

  @Column({ type: 'json', nullable: true })
  onlineUsersList: OnlineUser[];  // 在线用户列表

  @Column({ type: 'varchar', length: 255, nullable: true })
  deployPath: string;         // 部署路径

  @Column({ type: 'varchar', length: 100, nullable: true })
  systemVersion: string;      // 系统版本

  @Column({ type: 'timestamp', nullable: true })
  lastHealthCheck: Date;      // 最后健康检查时间

  @Column({ type: 'int', nullable: true })
  latency: number;            // 网络延迟 (ms)

  @Column({ type: 'boolean', default: true })
  autoRestart: boolean;       // 异常时自动重启

  @Column({ type: 'text', nullable: true })
  tags: string;               // 标签 (JSON字符串)

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Temporary storage for decrypted values (not persisted)
  private _decryptedPassword?: string;
  private _decryptedPrivateKey?: string;

  /**
   * Get decrypted password
   */
  getDecryptedPassword(encryptionService: EncryptionService): string {
    if (!this.password) return '';

    // Return cached decrypted value if available
    if (this._decryptedPassword) {
      return this._decryptedPassword;
    }

    // Decrypt and cache
    this._decryptedPassword = encryptionService.decrypt(this.password);
    return this._decryptedPassword;
  }

  /**
   * Set password (will be encrypted on save)
   */
  setPassword(password: string, encryptionService: EncryptionService): void {
    this._decryptedPassword = password;
    this.password = encryptionService.encrypt(password);
  }

  /**
   * Get decrypted private key
   */
  getDecryptedPrivateKey(encryptionService: EncryptionService): string {
    if (!this.privateKey) return '';

    // Return cached decrypted value if available
    if (this._decryptedPrivateKey) {
      return this._decryptedPrivateKey;
    }

    // Decrypt and cache
    this._decryptedPrivateKey = encryptionService.decrypt(this.privateKey);
    return this._decryptedPrivateKey;
  }

  /**
   * Set private key (will be encrypted on save)
   */
  setPrivateKey(privateKey: string, encryptionService: EncryptionService): void {
    this._decryptedPrivateKey = privateKey;
    this.privateKey = encryptionService.encrypt(privateKey);
  }

  /**
   * Before insert - encrypt sensitive data
   * Note: This is handled at the service level for better control
   */
  @BeforeInsert()
  @BeforeUpdate()
  encryptSensitiveData() {
    // Encryption is handled at service level to avoid circular dependency
    // This hook is kept for future use if needed
  }

  /**
   * After load - keep encrypted data as is
   * Decryption happens on-demand via getDecryptedPassword/getDecryptedPrivateKey
   */
  @AfterLoad()
  onLoad() {
    // Data remains encrypted in memory
    // Decryption happens on-demand via getter methods
  }
}
