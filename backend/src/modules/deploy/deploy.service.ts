import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment, DeploymentStatus, VpnType } from '../../entities/deployment.entity';
import { SshService } from './ssh.service';
import { StartDeployDto, VpnConfig } from './dto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  constructor(
    @InjectRepository(Deployment)
    private deploymentRepository: Repository<Deployment>,
    private sshService: SshService,
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
    const deployment = this.deploymentRepository.create({
      serverIp: dto.serverIp,
      sshPort: dto.sshPort,
      username: dto.username,
      password: dto.password,
      privateKey: dto.privateKey,
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
      const region = await this.getServerRegion(dto.serverIp);
      if (region) {
        deployment.region = region;
        await this.deploymentRepository.save(deployment);
        onLog(`服务器地区: ${region}`);
      }

      const sshConfig = {
        host: dto.serverIp,
        port: dto.sshPort,
        username: dto.username,
        password: dto.password,
        privateKey: dto.privateKey,
      };

      // Test connection
      onLog('正在测试 SSH 连接...');
      const connected = await this.sshService.testConnection(sshConfig);
      if (!connected) {
        throw new Error('无法通过 SSH 连接到服务器');
      }
      onLog('SSH 连接成功！');

      // Load and upload script
      const scriptName = dto.vpnType === VpnType.V2RAY ? 'install-v2ray.sh' : 'install-xray.sh';
      // Scripts are in the project root, not in backend directory
      const scriptPath = join(process.cwd(), '..', 'scripts', scriptName);
      const scriptContent = readFileSync(scriptPath, 'utf-8');

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

      // 使用完整路径执行 bash
      const result = await this.sshService.executeCommand(
        sshConfig,
        `/bin/bash /tmp/${scriptName}`,
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

      // 从日志中解析配置（不依赖退出码）
      const config = this.parseVpnConfig(result.stdout, dto.serverIp, dto.vpnType);

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
      onComplete(config);
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
   * Parse script output to extract VPN configuration
   */
  private parseVpnConfig(output: string, serverIp: string, vpnType: VpnType): any {
    // Try to extract UUID, port from script output
    let uuid = '';
    let port = 0;

    const uuidMatch = output.match(/UUID[:\s]+([a-f0-9-]{36})/i);
    if (uuidMatch) {
      uuid = uuidMatch[1];
    } else {
      uuid = uuidv4();
    }

    // 优先匹配 "服务器端口: 端口号" 格式
    const portMatch = output.match(/服务器端口[:\s]+(\d+)/);
    if (!portMatch) {
      // 备用：匹配 "port": 端口号 格式（JSON中）
      const jsonPortMatch = output.match(/"port":\s*(\d+)/);
      if (jsonPortMatch) {
        port = parseInt(jsonPortMatch[1]);
      }
    } else {
      port = parseInt(portMatch[1]);
    }

    // 如果还是找不到端口，使用默认值
    if (port === 0) {
      this.logger.warn('无法从输出中解析端口，使用默认端口 443');
      port = 443;
    }

    const protocol = vpnType === VpnType.V2RAY ? 'vmess' : 'vless';

    // Generate client configuration
    const clientConfig = this.generateClientConfig(serverIp, port, uuid, protocol);

    // Generate share link
    const shareLink = this.generateShareLink(serverIp, port, uuid, protocol);

    return {
      address: serverIp,
      port,
      uuid,
      protocol,
      network: 'tcp',
      security: 'none',
      shareLink,
      clientConfig,
    };
  }

  /**
   * Generate client configuration JSON
   */
  private generateClientConfig(serverIp: string, port: number, uuid: string, protocol: string): any {
    if (protocol === 'vmess') {
      return {
        v: '2',
        ps: serverIp,
        add: serverIp,
        port: port.toString(),
        id: uuid,
        aid: '0',
        net: 'tcp',
        type: 'none',
        host: '',
        path: '',
        tls: 'none',
      };
    } else {
      // VLESS configuration
      return {
        protocol: 'vless',
        settings: {
          vnext: [
            {
              address: serverIp,
              port: port,
              users: [
                {
                  id: uuid,
                  encryption: 'none',
                },
              ],
            },
          ],
        },
      };
    }
  }

  /**
   * Generate share link
   */
  private generateShareLink(serverIp: string, port: number, uuid: string, protocol: string): string {
    if (protocol === 'vmess') {
      const config = {
        v: '2',
        ps: serverIp,
        add: serverIp,
        port: port.toString(),
        id: uuid,
        aid: '0',
        net: 'tcp',
        type: 'none',
        host: '',
        path: '',
        tls: 'none',
      };
      const jsonStr = JSON.stringify(config);
      const base64 = Buffer.from(jsonStr).toString('base64');
      return `vmess://${base64}`;
    } else {
      // VLESS 格式：sing-box, v2rayNG 等客户端支持
      // 移除 encryption 参数，使用更简洁的格式
      return `vless://${uuid}@${serverIp}:${port}?security=none&type=tcp#${serverIp}`;
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(id: string): Promise<Deployment> {
    return this.deploymentRepository.findOne({ where: { id } });
  }

  /**
   * Get deployment config
   */
  async getConfig(id: string): Promise<any> {
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment?.configJson) {
      return null;
    }

    const config = deployment.configJson;

    // 如果没有 shareLink，从现有配置生成
    if (!config.shareLink && config.address && config.port && config.uuid && config.protocol) {
      config.shareLink = this.generateShareLink(
        config.address,
        config.port,
        config.uuid,
        config.protocol
      );

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
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      return { success: false, message: '部署记录不存在' };
    }

    const sshConfig = {
      host: deployment.serverIp,
      port: deployment.sshPort,
      username: deployment.username,
      password: deployment.password,
      privateKey: deployment.privateKey,
    };

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
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      return { success: false, message: '部署记录不存在' };
    }

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
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      throw new Error('部署记录不存在');
    }

    const sshConfig = {
      host: deployment.serverIp,
      port: deployment.sshPort,
      username: deployment.username,
      password: deployment.password,
      privateKey: deployment.privateKey,
    };

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
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      return { success: false, message: '部署记录不存在' };
    }

    const sshConfig = {
      host: deployment.serverIp,
      port: deployment.sshPort,
      username: deployment.username,
      password: deployment.password,
      privateKey: deployment.privateKey,
    };

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
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      return { success: false, message: '部署记录不存在' };
    }

    const sshConfig = {
      host: deployment.serverIp,
      port: deployment.sshPort,
      username: deployment.username,
      password: deployment.password,
      privateKey: deployment.privateKey,
    };

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
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      return { success: false, message: '部署记录不存在' };
    }

    const sshConfig = {
      host: deployment.serverIp,
      port: deployment.sshPort,
      username: deployment.username,
      password: deployment.password,
      privateKey: deployment.privateKey,
    };

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
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      throw new Error('部署记录不存在');
    }

    const sshConfig = {
      host: deployment.serverIp,
      port: deployment.sshPort,
      username: deployment.username,
      password: deployment.password,
      privateKey: deployment.privateKey,
    };

    return this.sshService.getServiceLogs(sshConfig, deployment.vpnType, lines);
  }

  /**
   * Execute custom command
   */
  async executeCommand(id: string, command: string): Promise<any> {
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      throw new Error('部署记录不存在');
    }

    const sshConfig = {
      host: deployment.serverIp,
      port: deployment.sshPort,
      username: deployment.username,
      password: deployment.password,
      privateKey: deployment.privateKey,
    };

    return this.sshService.executeCustomCommand(sshConfig, command);
  }

  /**
   * Open firewall port for VPN
   */
  async openFirewallPort(id: string): Promise<{ success: boolean; message: string; output?: string }> {
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment) {
      throw new Error('部署记录不存在');
    }

    const sshConfig = {
      host: deployment.serverIp,
      port: deployment.sshPort,
      username: deployment.username,
      password: deployment.password,
      privateKey: deployment.privateKey,
    };

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
    return this.deploymentRepository.findOne({ where: { id } });
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
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment?.configJson) {
      throw new Error('配置不存在');
    }

    const config = deployment.configJson;

    // 确保 shareLink 存在
    if (!config.shareLink) {
      config.shareLink = this.generateShareLink(
        config.address,
        config.port,
        config.uuid,
        config.protocol
      );
    }

    // 调用 subconverter API
    // 默认 subconverter 运行在 localhost:25500
    const subconverterUrl = process.env.SUBCONVERTER_URL || 'http://localhost:25500';

    try {
      const encodedUrl = encodeURIComponent(config.shareLink);
      const apiUrl = `${subconverterUrl}/sub?target=clash&url=${encodedUrl}&config=https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full_Adblock.ini`;

      this.logger.log(`Converting to Clash: ${apiUrl}`);

      const response = await axios.get(apiUrl, { timeout: 10000 });

      this.logger.log(`Successfully converted to Clash config for deployment ${id}`);

      return response.data as string;
    } catch (error) {
      this.logger.error(`Failed to convert to Clash: ${error.message}`);

      // 如果 subconverter 不可用，直接生成 Clash 配置
      this.logger.log(`Using fallback Clash config generation`);
      return this.generateClashConfig(config);
    }
  }

  /**
   * Generate Clash config directly (fallback)
   */
  private generateClashConfig(config: any): string {
    const isVless = config.protocol.toLowerCase() === 'vless';

    const clashConfig = {
      port: 7890,
      socks_port: 7891,
      'allow-lan': false,
      mode: 'rule',
      'log-level': 'info',
      'external-controller': '127.0.0.1:9090',
      proxies: [
        isVless
          ? {
              name: config.address,
              type: 'vless',
              server: config.address,
              port: config.port,
              uuid: config.uuid,
              udp: true,
              'skip-cert-verify': false,
              network: 'tcp',
            }
          : {
              name: config.address,
              type: 'vmess',
              server: config.address,
              port: config.port,
              uuid: config.uuid,
              alterId: 0,
              cipher: 'auto',
              udp: true,
              'skip-cert-verify': false,
              network: 'tcp',
            },
      ],
      'proxy-groups': [
        {
          name: 'PROXY',
          type: 'select',
          proxies: [config.address, 'DIRECT'],
        },
      ],
      rules: [
        'DOMAIN-SUFFIX,local,DIRECT',
        'IP-CIDR,127.0.0.0/8,DIRECT',
        'IP-CIDR,172.16.0.0/12,DIRECT',
        'IP-CIDR,192.168.0.0/16,DIRECT',
        'GEOIP,CN,DIRECT',
        'MATCH,PROXY',
      ],
    };

    return `mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
external-controller: 127.0.0.1:9090

proxies:
  - name: ${config.address}
    type: ${config.protocol}
    server: ${config.address}
    port: ${config.port}
    uuid: ${config.uuid}
    ${!isVless ? 'alterId: 0\n    cipher: auto' : ''}
    udp: true
    network: tcp
    skip-cert-verify: false

proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - ${config.address}
      - DIRECT

rules:
  - DOMAIN-SUFFIX,local,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT
  - IP-CIDR,172.16.0.0/12,DIRECT
  - IP-CIDR,192.168.0.0/16,DIRECT
  - GEOIP,CN,DIRECT
  - MATCH,PROXY
`;
  }

  /**
   * 获取服务器地区（通过 IP）
   */
  private async getServerRegion(ip: string): Promise<string> {
    try {
      // 使用免费的 IP 地理位置 API
      const apiUrl = `http://ip-api.com/json/${ip}?lang=zh-CN`;

      const response = await axios.get<any>(apiUrl, { timeout: 5000 });

      if (response.data?.status === 'success') {
        const country = response.data.country || '';
        const city = response.data.city || '';
        const isp = response.data.isp || '';

        // 组合地区信息
        if (city && country) {
          return `${country} ${city}`;
        } else if (country) {
          return country;
        } else if (isp) {
          return isp;
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to get server region: ${error.message}`);
      return null;
    }
  }
}
