import { Injectable, Logger } from '@nestjs/common';
import { VpnType } from '../../entities/deployment.entity';
import { VpnConfig, VmessConfig, VlessConfig, ClashConfig } from '../../interfaces/vpn-config.interface';
import { ParsedConfig, ConfigGenerationOptions, ShareLinkOptions } from '../../interfaces/parsed-config.interface';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { createAxiosInstance } from '../../config/axios.config';
import { API_ENDPOINTS } from '../../constants/deployment.constants';

@Injectable()
export class ConfigGeneratorService {
  private readonly logger = new Logger(ConfigGeneratorService.name);

  /**
   * Parse script output to extract VPN configuration
   */
  parseVpnConfig(output: string, serverIp: string, vpnType: VpnType): ParsedConfig {
    // Try to extract UUID, port from script output
    let uuid = '';
    let port = 0;

    const uuidMatch = output.match(/UUID[:\s]+([a-f0-9-]{36})/i);
    if (uuidMatch) {
      uuid = uuidMatch[1];
    } else {
      uuid = uuidv4();
      this.logger.warn(`无法从输出中解析UUID，生成新UUID: ${uuid}`);
    }

    // 优先匹配 "服务器端口: 端口号" 格式
    const portMatch = output.match(/服务器端口[:\s]+(\d+)/);
    if (!portMatch) {
      // 备用：匹配 "port": 端口号 格式（JSON中）
      const jsonPortMatch = output.match(/"port":\s*(\d+)/);
      if (jsonPortMatch) {
        port = parseInt(jsonPortMatch[1], 10);
      }
    } else {
      port = parseInt(portMatch[1], 10);
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
    const shareLink = this.generateShareLink({ serverIp, port, uuid, protocol });

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
  generateClientConfig(
    serverIp: string,
    port: number,
    uuid: string,
    protocol: string
  ): VmessConfig | VlessConfig {
    if (protocol === 'vmess') {
      return this.generateVmessConfig(serverIp, port, uuid);
    } else {
      return this.generateVlessConfig(serverIp, port, uuid);
    }
  }

  /**
   * Generate VMess configuration
   */
  generateVmessConfig(serverIp: string, port: number, uuid: string): VmessConfig {
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
  }

  /**
   * Generate VLESS configuration
   */
  generateVlessConfig(serverIp: string, port: number, uuid: string): VlessConfig {
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

  /**
   * Generate share link
   */
  generateShareLink(options: ShareLinkOptions): string {
    const { serverIp, port, uuid, protocol } = options;

    if (protocol === 'vmess') {
      const config = this.generateVmessConfig(serverIp, port, uuid);
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
   * Generate Clash configuration
   */
  generateClashConfig(config: ParsedConfig): string {
    const isVless = config.protocol.toLowerCase() === 'vless';

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
   * Convert VLESS/VMess config to Clash format using subconverter API
   */
  async convertToClash(config: ParsedConfig): Promise<string> {
    // 调用 subconverter API
    // 默认 subconverter 运行在 localhost:25500
    const subconverterUrl = process.env.SUBCONVERTER_URL || API_ENDPOINTS.SUBCONVERTER;

    try {
      const encodedUrl = encodeURIComponent(config.shareLink);
      const apiUrl = `${subconverterUrl}/sub?target=clash&url=${encodedUrl}&config=https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full_Adblock.ini`;

      this.logger.log(`Converting to Clash: ${apiUrl}`);

      // 使用带重试功能的 axios 实例
      const axiosWithRetry = createAxiosInstance();
      const response = await axiosWithRetry.get(apiUrl);

      this.logger.log(`Successfully converted to Clash config`);

      return response.data as string;
    } catch (error) {
      this.logger.error(`Failed to convert to Clash: ${error.message}`);
      this.logger.error(`Error details: ${error.code || 'Unknown code'}`);

      // 如果 subconverter 不可用，直接生成 Clash 配置
      this.logger.log(`Using fallback Clash config generation`);
      return this.generateClashConfig(config);
    }
  }

  /**
   * Generate share link from parsed config
   */
  regenerateShareLink(config: ParsedConfig): string {
    if (!config.shareLink) {
      config.shareLink = this.generateShareLink({
        serverIp: config.address,
        port: config.port,
        uuid: config.uuid,
        protocol: config.protocol as 'vmess' | 'vless',
      });
    }
    return config.shareLink;
  }
}
