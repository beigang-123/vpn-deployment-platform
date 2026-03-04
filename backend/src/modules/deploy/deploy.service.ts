import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment, DeploymentStatus, VpnType } from '../../entities/deployment.entity';
import { SshService, SshConfig } from './ssh.service';
import { StartDeployDto, VpnConfig } from './dto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigGeneratorService } from '../config/config-generator.service';
import { IpLocationService } from '../ip-location/ip-location.service';
import { EncryptionService } from '../encryption/encryption.service';
import { SCRIPT_PATHS } from '../../constants/deployment.constants';
import { ParsedConfig } from '../../interfaces/parsed-config.interface';

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  constructor(
    @InjectRepository(Deployment)
    private deploymentRepository: Repository<Deployment>,
    private sshService: SshService,
    private configGenerator: ConfigGeneratorService,
    private ipLocationService: IpLocationService,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Start deployment process
   */
  async startDeploy(
    dto: StartDeployDto,
    onLog: (log: string) => void,
    onComplete: (config: VpnConfig) => void,
    onError: (error: string) => void,
  ): Promise<Deployment> {
    // Encrypt sensitive data before saving
    const deployment = this.deploymentRepository.create({
      serverIp: dto.serverIp,
      sshPort: dto.sshPort,
      username: dto.username,
      password: this.encryptionService.encrypt(dto.password),
      privateKey: dto.privateKey ? this.encryptionService.encrypt(dto.privateKey) : null,
      vpnType: dto.vpnType,
      status: DeploymentStatus.PENDING,
    });

    await this.deploymentRepository.save(deployment);

    // Start async deployment
    this.deploy(deployment, dto, onLog, onComplete, onError);

    return deployment;
  }

  /**
   * Execute deployment
   */
  private async deploy(
    deployment: Deployment,
    dto: StartDeployDto,
    onLog: (log: string) => void,
    onComplete: (config: VpnConfig) => void,
    onError: (error: string) => void,
  ) {
    try {
      await this.updateStatus(deployment.id, DeploymentStatus.DEPLOYING);
      onLog('开始部署流程...');

      // 自动获取服务器地区
      onLog('正在识别服务器地区...');
      const region = await this.ipLocationService.getServerRegion(dto.serverIp);
      if (region) {
        deployment.region = region;
        await this.deploymentRepository.save(deployment);
        onLog(`服务器地区: ${region}`);
      }

      const sshConfig = this.buildSshConfig(dto);
      const decryptedPassword = dto.password;
      const decryptedPrivateKey = dto.privateKey;

      // Test connection
      onLog('正在测试 SSH 连接...');
      const connected = await this.sshService.testConnection(sshConfig);
      if (!connected) {
        throw new Error('无法通过 SSH 连接到服务器');
      }
      onLog('SSH 连接成功！');

      // Load and upload script
      const scriptName = dto.vpnType === VpnType.V2RAY ? 'install-v2ray.sh' : 'install-xray.sh';
      const scriptPath = join(process.cwd(), '..', 'scripts', scriptName);
      let scriptContent = readFileSync(scriptPath, 'utf-8');

      // Remove Windows line endings (CRLF -> LF)
      scriptContent = scriptContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      onLog(`正在上传 ${scriptName}...`);
      await this.sshService.uploadScript(sshConfig, scriptContent, `/tmp/${scriptName}`);

      // 验证脚本上传成功
      const verifyResult = await this.sshService.executeCommand(
        sshConfig,
        `ls -lh /tmp/${scriptName}`
      );
      onLog('脚本上传成功！');
      onLog(`文件信息: ${verifyResult.stdout.trim()}`);

      // Execute script
      onLog(`正在执行 ${dto.vpnType === VpnType.V2RAY ? 'V2Ray' : 'Xray'} 安装...`);
      onLog('这可能需要几分钟时间，请耐心等待...');

      // 确保脚本有执行权限
      await this.sshService.executeCommand(
        sshConfig,
        `chmod +x /tmp/${scriptName}`
      );

      // 准备脚本参数（如果指定了VPN端口）
      const scriptArgs = dto.vpnPort ? `PORT=${dto.vpnPort}` : '';

      // 使用完整路径执行 bash
      const result = await this.sshService.executeCommand(
        sshConfig,
        `/bin/bash -c '${scriptArgs} /tmp/${scriptName}'`,
        (output) => {
          onLog(output);
        },
        600000, // 10分钟超时
      );

      // 检查是否成功（即使退出码不是0）
      const success = result.stdout.includes('安装完成') ||
                      result.stdout.includes('Installation completed') ||
                      result.stdout.includes('Xray 安装完成') ||
                      result.stdout.includes('V2Ray 安装完成');

      if (!success) {
        this.logger.error(`安装可能失败，退出码: ${result.exitCode}`);
        this.logger.error(`最后输出: ${result.stdout.substring(result.stdout.length - 500)}`);
        if (result.stderr) {
          this.logger.error(`错误输出: ${result.stderr}`);
        }
        throw new Error(`安装失败，未检测到成功标识`);
      }

      // 从日志中解析配置
      const config = this.configGenerator.parseVpnConfig(result.stdout, dto.serverIp, dto.vpnType);

      if (!config || !config.uuid || !config.port) {
        this.logger.error(`无法从输出中解析配置`);
        throw new Error(`配置解析失败`);
      }

      this.logger.log(`成功解析配置: ${config.address}:${config.port}`);

      // Update deployment with config
      await this.deploymentRepository.update(deployment.id, {
        status: DeploymentStatus.COMPLETED,
        configJson: config,
        vpnPort: config.port,
        uuid: config.uuid,
      });

      onLog('部署成功完成！');
      onComplete(config as VpnConfig);
    } catch (error) {
      this.logger.error(`部署失败: ${error.message}`);
      await this.deploymentRepository.update(deployment.id, {
        status: DeploymentStatus.FAILED,
        errorMessage: error.message,
      });
      onError(error.message);
    }
  }

  /**
   * Build SSH config from deployment or DTO
   */
  buildSshConfig(deploymentOrDto: Deployment | StartDeployDto): SshConfig {
    if (deploymentOrDto instanceof Deployment) {
      // It's a Deployment entity
      const deployment = deploymentOrDto;
      return {
        host: deployment.serverIp,
        port: deployment.sshPort,
        username: deployment.username,
        password: deployment.getDecryptedPassword(this.encryptionService),
        privateKey: deployment.getDecryptedPrivateKey(this.encryptionService),
      };
    } else {
      // It's a StartDeployDto
      const dto = deploymentOrDto;
      return {
        host: dto.serverIp,
        port: dto.sshPort,
        username: dto.username,
        password: dto.password,
        privateKey: dto.privateKey,
      };
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(id: string): Promise<Deployment> {
    const deployment = await this.findDeploymentOrThrow(id);
    return deployment;
  }

  /**
   * Get deployment config
   */
  async getConfig(id: string): Promise<any> {
    const deployment = await this.findDeploymentOrThrow(id);

    if (!deployment.configJson) {
      return null;
    }

    const config = deployment.configJson;

    // 如果没有 shareLink，从现有配置生成
    if (!config.shareLink && config.address && config.port && config.uuid && config.protocol) {
      config.shareLink = this.configGenerator.regenerateShareLink(config as ParsedConfig);

      // 更新数据库
      await this.deploymentRepository.update(id, { configJson: config });
      this.logger.log(`Generated shareLink for deployment ${id}`);
    }

    return config;
  }

  /**
   * Get all deployments
   */
  async getAllDeployments(): Promise<Deployment[]> {
    return this.deploymentRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Test server connection
   */
  async testServerConnection(id: string): Promise<{ success: boolean; message: string }> {
    const deployment = await this.findDeploymentOrThrow(id);
    const sshConfig = this.buildSshConfig(deployment);

    const connected = await this.sshService.testConnection(sshConfig);
    if (connected) {
      return { success: true, message: '连接成功' };
    } else {
      return { success: false, message: '连接失败' };
    }
  }

  /**
   * Delete deployment
   */
  async deleteDeployment(id: string): Promise<{ success: boolean; message: string }> {
    const deployment = await this.findDeploymentOrThrow(id);
    await this.deploymentRepository.remove(deployment);
    return { success: true, message: '删除成功' };
  }

  /**
   * Update deployment status
   */
  private async updateStatus(id: string, status: DeploymentStatus): Promise<void> {
    await this.deploymentRepository.update(id, { status });
  }

  /**
   * Perform health check on deployment
   */
  async healthCheck(id: string): Promise<any> {
    const deployment = await this.findDeploymentOrThrow(id);
    const sshConfig = this.buildSshConfig(deployment);

    // 从configJson中获取端口，如果不存在则使用vpnPort字段
    const configPort = deployment.configJson?.port;
    const vpnPort = deployment.vpnPort;
    const port = configPort || vpnPort || 443;

    const result = await this.sshService.healthCheck(
      sshConfig,
      port,
      deployment.vpnType
    );

    // 添加端口信息到返回结果（优先显示配置端口）
    (result as any).port = configPort || vpnPort || port;
    (result as any).sshConnected = result.isHealthy || result.serviceRunning || result.portAccessible;

    // Update deployment with health check results (只更新检查时间，不改变状态)
    await this.deploymentRepository.update(id, {
      lastHealthCheck: new Date(),
      latency: result.latency,
      // 不更新 status 字段，避免影响部署状态
    });

    return result;
  }

  /**
   * Start VPN service
   */
  async startService(id: string): Promise<{ success: boolean; message: string }> {
    const deployment = await this.findDeploymentOrThrow(id);
    const sshConfig = this.buildSshConfig(deployment);

    await this.updateStatus(id, DeploymentStatus.STARTING);
    const result = await this.sshService.startService(sshConfig, deployment.vpnType);

    if (result.success) {
      await this.updateStatus(id, DeploymentStatus.RUNNING);
    }

    return result;
  }

  /**
   * Stop VPN service
   */
  async stopService(id: string): Promise<{ success: boolean; message: string }> {
    const deployment = await this.findDeploymentOrThrow(id);
    const sshConfig = this.buildSshConfig(deployment);

    const result = await this.sshService.stopService(sshConfig, deployment.vpnType);

    if (result.success) {
      await this.updateStatus(id, DeploymentStatus.STOPPED);
    }

    return result;
  }

  /**
   * Restart VPN service
   */
  async restartService(id: string): Promise<{ success: boolean; message: string }> {
    const deployment = await this.findDeploymentOrThrow(id);
    const sshConfig = this.buildSshConfig(deployment);

    await this.updateStatus(id, DeploymentStatus.RESTARTING);
    const result = await this.sshService.restartService(sshConfig, deployment.vpnType);

    if (result.success) {
      await this.updateStatus(id, DeploymentStatus.RUNNING);
    }

    return result;
  }

  /**
   * Get service logs
   */
  async getServiceLogs(id: string, lines: number = 100): Promise<string> {
    const deployment = await this.findDeploymentOrThrow(id);
    const sshConfig = this.buildSshConfig(deployment);

    return this.sshService.getServiceLogs(sshConfig, deployment.vpnType, lines);
  }

  /**
   * Execute custom command
   */
  async executeCommand(id: string, command: string): Promise<any> {
    const deployment = await this.findDeploymentOrThrow(id);
    const sshConfig = this.buildSshConfig(deployment);

    return this.sshService.executeCustomCommand(sshConfig, command);
  }

  /**
   * Open firewall port for VPN
   */
  async openFirewallPort(id: string): Promise<{ success: boolean; message: string; output?: string }> {
    const deployment = await this.findDeploymentOrThrow(id);
    const sshConfig = this.buildSshConfig(deployment);

    const port = deployment.configJson?.port || deployment.vpnPort || 443;

    try {
      // 尝试使用 firewall-cmd (CentOS/RHEL)
      const firewalldCmd = `firewall-cmd --permanent --add-port=${port}/tcp && firewall-cmd --reload`;
      let result = await this.sshService.executeCustomCommand(sshConfig, firewalldCmd);

      if (result.exitCode === 0) {
        return {
          success: true,
          message: `端口 ${port} 已通过 firewalld 开放`,
          output: result.stdout,
        };
      }

      // 尝试使用 ufw (Ubuntu/Debian)
      const ufwCmd = `ufw allow ${port}/tcp`;
      result = await this.sshService.executeCustomCommand(sshConfig, ufwCmd);

      if (result.exitCode === 0) {
        return {
          success: true,
          message: `端口 ${port} 已通过 ufw 开放`,
          output: result.stdout,
        };
      }

      // 如果都失败，返回错误信息
      return {
        success: false,
        message: `无法自动开放端口 ${port}，请手动配置防火墙`,
        output: result.stderr || result.stdout,
      };
    } catch (error) {
      return {
        success: false,
        message: `开放端口失败: ${error.message}`,
      };
    }
  }

  /**
   * Batch restart services
   */
  async batchRestart(ids: string[]): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        const result = await this.restartService(id);
        if (result.success) {
          success.push(id);
        } else {
          failed.push({ id, error: result.message });
        }
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }

  /**
   * Batch delete deployments
   */
  async batchDelete(ids: string[]): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        const result = await this.deleteDeployment(id);
        if (result.success) {
          success.push(id);
        } else {
          failed.push({ id, error: result.message });
        }
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }

  /**
   * Batch health check
   */
  async batchHealthCheck(ids: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    for (const id of ids) {
      try {
        const result = await this.healthCheck(id);
        results.set(id, result);
      } catch (error) {
        results.set(id, { error: error.message });
      }
    }

    return results;
  }

  /**
   * Update deployment metadata
   */
  async updateDeployment(
    id: string,
    updates: {
      region?: string;
      nodeName?: string;
      expiryDate?: Date;
      autoRestart?: boolean;
      tags?: string;
    }
  ): Promise<Deployment> {
    await this.deploymentRepository.update(id, updates);
    return this.findDeploymentOrThrow(id);
  }

  /**
   * Search and filter deployments
   */
  async searchDeployments(filters: {
    status?: DeploymentStatus;
    vpnType?: VpnType;
    region?: string;
    search?: string; // Search in IP, nodeName
  }): Promise<Deployment[]> {
    const queryBuilder = this.deploymentRepository.createQueryBuilder('deployment');

    if (filters.status) {
      queryBuilder.andWhere('deployment.status = :status', { status: filters.status });
    }

    if (filters.vpnType) {
      queryBuilder.andWhere('deployment.vpnType = :vpnType', { vpnType: filters.vpnType });
    }

    if (filters.region) {
      queryBuilder.andWhere('deployment.region = :region', { region: filters.region });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(deployment.serverIp LIKE :search OR deployment.nodeName LIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return queryBuilder.orderBy('deployment.createdAt', 'DESC').getMany();
  }

  /**
   * Convert VLESS/VMess config to Clash format
   */
  async convertToClash(id: string): Promise<string> {
    const deployment = await this.findDeploymentOrThrow(id);

    if (!deployment.configJson) {
      throw new Error('配置不存在');
    }

    const config = deployment.configJson;

    // 确保 shareLink 存在
    if (!config.shareLink) {
      config.shareLink = this.configGenerator.regenerateShareLink(config as ParsedConfig);
    }

    // 使用 ConfigGeneratorService 进行转换
    return this.configGenerator.convertToClash(config as ParsedConfig);
  }

  /**
   * Find deployment or throw exception
   */
  private async findDeploymentOrThrow(id: string): Promise<Deployment> {
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      throw new NotFoundException('部署记录不存在');
    }
    return deployment;
  }
}
