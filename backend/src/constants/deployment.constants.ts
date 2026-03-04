/**
 * Deployment-related constants
 * Centralized configuration values for easy maintenance
 */

export const DEPLOYMENT_TIMEOUTS = {
  SSH_CONNECTION: 30000,         // 30 seconds
  COMMAND_EXECUTION: 300000,     // 5 minutes
  SCRIPT_UPLOAD: 60000,          // 1 minute
  HEALTH_CHECK: 5000,            // 5 seconds
  LATENCY_TEST: 5000,            // 5 seconds
  REGION_API: 8000,              // 8 seconds
} as const;

export const DEFAULT_PORTS = {
  VPN: 443,
  SSH: 22,
  CLASH_MIXED: 7890,
  CLASH_SOCKS: 7891,
  CLASH_EXTERNAL: 9090,
} as const;

export const API_ENDPOINTS = {
  SUBCONVERTER: 'http://localhost:25500',
  IP_API: 'http://ip-api.com/json/',
  IPAPI_CO: 'https://ipapi.co/',
  IP_API_IO: 'https://ip-api.io/api/json',
} as const;

export const SCRIPT_PATHS = {
  V2RAY: '../scripts/install-v2ray.sh',
  XRAY: '../scripts/install-xray.sh',
} as const;

export const VPN_PROTOCOLS = {
  VMESS: 'vmess',
  VLESS: 'vless',
  TROJAN: 'trojan',
  SHADOWSOCKS: 'shadowsocks',
} as const;

export const CACHE_TTL = {
  IP_LOCATION: 86400,      // 24 hours in seconds
  CONFIG_GENERATION: 300,  // 5 minutes in seconds
  HEALTH_CHECK: 60,        // 1 minute in seconds
} as const;

export const SSH_ALGORITHMS = {
  KEX: [
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group14-sha256',
    'ecdh-sha2-nistp256',
    'curve25519-sha256',
  ] as const,
  CIPHER: [
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-gcm',
    'aes256-gcm',
  ] as const,
} as const;
