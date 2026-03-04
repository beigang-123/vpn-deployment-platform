/**
 * VPN Configuration interfaces
 * Type definitions for various VPN protocol configurations
 */

export interface VpnConfig {
  address: string;
  port: number;
  uuid: string;
  protocol: string;
  network: string;
  security: string;
  shareLink: string;
  clientConfig: VmessConfig | VlessConfig;
}

export interface VmessConfig {
  v: string;
  ps: string;
  add: string;
  port: string;
  id: string;
  aid: string;
  net: string;
  type: string;
  host: string;
  path: string;
  tls: string;
}

export interface VlessConfig {
  protocol: 'vless';
  settings: {
    vnext: Array<{
      address: string;
      port: number;
      users: Array<{
        id: string;
        encryption: string;
      }>;
    }>;
  };
}

export interface ClashProxyConfig {
  name: string;
  type: 'vmess' | 'vless' | 'trojan' | 'shadowsocks';
  server: string;
  port: number;
  uuid?: string;
  alterId?: number;
  cipher?: string;
  udp?: boolean;
  network?: string;
  'skip-cert-verify'?: boolean;
}

export interface ClashConfig {
  'mixed-port'?: number;
  port?: number;
  'socks-port'?: number;
  'allow-lan'?: boolean;
  mode: 'rule' | 'global' | 'direct';
  'log-level'?: string;
  'external-controller'?: string;
  proxies: ClashProxyConfig[];
  'proxy-groups'?: Array<{
    name: string;
    type: 'select' | 'url-test' | 'load-balance';
    proxies: string[];
  }>;
  rules: string[];
}
