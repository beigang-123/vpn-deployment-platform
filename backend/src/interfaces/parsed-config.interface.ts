/**
 * Parsed configuration interfaces
 * Type definitions for parsed deployment configurations
 */

import { VpnType } from '../entities/deployment.entity';

export interface ParsedConfig {
  address: string;
  port: number;
  uuid: string;
  protocol: string;
  network: string;
  security: string;
  shareLink: string;
  clientConfig: any;
}

export interface ConfigGenerationOptions {
  serverIp: string;
  port: number;
  uuid: string;
  protocol: 'vmess' | 'vless';
}

export interface ShareLinkOptions {
  serverIp: string;
  port: number;
  uuid: string;
  protocol: 'vmess' | 'vless';
}

export interface DeploymentScriptOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RegionInfo {
  country?: string;
  city?: string;
  isp?: string;
  region: string;
}

export interface IpApiResponse {
  status?: 'success' | 'fail';
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
}

export interface IpapiCoResponse {
  country_name?: string;
  city?: string;
  region?: string;
  org?: string;
  ip?: string;
}

export interface IpApiIoResponse {
  country_name?: string;
  city?: string;
  organization?: string;
  ip?: string;
}
