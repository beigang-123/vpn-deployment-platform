import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Deployment, DeploymentStatus } from '../../../entities/deployment.entity';
import { EncryptionService } from '../../encryption/encryption.service';
import { SshConfig } from '../ssh.service';

/**
 * Find deployment by ID or throw NotFoundException
 */
export async function findDeploymentOrThrow(
  repository: Repository<Deployment>,
  id: string
): Promise<Deployment> {
  const deployment = await repository.findOne({ where: { id } });
  if (!deployment) {
    throw new NotFoundException('部署记录不存在');
  }
  return deployment;
}

/**
 * Build SSH config from deployment entity
 * Automatically decrypts password and private key
 */
export function buildSshConfigFromDeployment(
  deployment: Deployment,
  encryptionService: EncryptionService
): SshConfig {
  return {
    host: deployment.serverIp,
    port: deployment.sshPort,
    username: deployment.username,
    password: deployment.getDecryptedPassword(encryptionService),
    privateKey: deployment.getDecryptedPrivateKey(encryptionService),
  };
}

/**
 * Validate deployment status
 * Throws BadRequestException if status doesn't match expected
 */
export function validateDeploymentStatus(
  deployment: Deployment,
  expectedStatus: DeploymentStatus | DeploymentStatus[]
): void {
  const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  if (!expected.includes(deployment.status)) {
    throw new BadRequestException(
      `部署状态错误。期望: ${expected.join(' 或 ')}，当前: ${deployment.status}`
    );
  }
}

/**
 * Check if deployment is in a transitional state
 */
export function isTransitionalStatus(status: DeploymentStatus): boolean {
  return [
    DeploymentStatus.PENDING,
    DeploymentStatus.DEPLOYING,
    DeploymentStatus.STARTING,
    DeploymentStatus.RESTARTING,
  ].includes(status);
}

/**
 * Check if deployment is in a terminal state
 */
export function isTerminalStatus(status: DeploymentStatus): boolean {
  return [
    DeploymentStatus.COMPLETED,
    DeploymentStatus.RUNNING,
    DeploymentStatus.STOPPED,
    DeploymentStatus.ERROR,
    DeploymentStatus.FAILED,
  ].includes(status);
}

/**
 * Handle deployment error and update database
 */
export async function handleDeploymentError(
  repository: Repository<Deployment>,
  deploymentId: string,
  error: Error
): Promise<void> {
  await repository.update(deploymentId, {
    status: DeploymentStatus.FAILED,
    errorMessage: error.message,
  });
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: Error): string {
  if (error.message) {
    return error.message;
  }

  if (error.name) {
    return `${error.name}: ${JSON.stringify(error)}`;
  }

  return '未知错误';
}

/**
 * Validate IP address format (basic validation)
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

/**
 * Validate port number
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Parse region string to extract country and city
 */
export function parseRegionString(region: string): { country?: string; city?: string } {
  if (!region) return {};

  const parts = region.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { country: parts[0], city: parts.slice(1).join(' ') };
  } else if (parts.length === 1) {
    return { country: parts[0] };
  }

  return {};
}

/**
 * Calculate success rate from results
 */
export function calculateSuccessRate(
  total: number,
  success: number
): number {
  if (total === 0) return 100;
  return Math.round((success / total) * 100);
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to human readable time
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Sanitize deployment name/nodeName
 */
export function sanitizeNodeName(name: string): string {
  if (!name) return '';
  return name.trim().replace(/[^\w\s\-]/g, '').substring(0, 100);
}

/**
 * Extract UUID from various config formats
 */
export function extractUUID(config: any): string | null {
  if (!config) return null;

  // Direct UUID property
  if (config.uuid && typeof config.uuid === 'string') {
    return config.uuid;
  }

  // VMess format
  if (config.id && typeof config.id === 'string') {
    return config.id;
  }

  // VLESS settings format
  if (config.settings?.vnext?.[0]?.users?.[0]?.id) {
    return config.settings.vnext[0].users[0].id;
  }

  return null;
}

/**
 * Extract port from various config formats
 */
export function extractPort(config: any): number | null {
  if (!config) return null;

  // Direct port property
  if (config.port && typeof config.port === 'number') {
    return config.port;
  }

  // VLESS settings format
  if (config.settings?.vnext?.[0]?.port) {
    return config.settings.vnext[0].port;
  }

  return null;
}
