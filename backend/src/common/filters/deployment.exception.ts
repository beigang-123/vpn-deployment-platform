import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for deployment-related errors
 */
export class DeploymentException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        error: 'DeploymentError',
      },
      status
    );
  }
}

/**
 * Exception thrown when deployment is not found
 */
export class DeploymentNotFoundException extends DeploymentException {
  constructor(id: string) {
    super(`Deployment with ID "${id}" not found`, HttpStatus.NOT_FOUND);
    this.name = 'DeploymentNotFoundException';
  }
}

/**
 * Exception thrown when deployment is in invalid state
 */
export class DeploymentInvalidStateException extends DeploymentException {
  constructor(currentStatus: string, expectedStatus: string | string[]) {
    const expected = Array.isArray(expectedStatus) ? expectedStatus.join(' or ') : expectedStatus;
    super(
      `Deployment is in invalid state. Current: ${currentStatus}, Expected: ${expected}`,
      HttpStatus.BAD_REQUEST
    );
    this.name = 'DeploymentInvalidStateException';
  }
}

/**
 * Exception thrown when SSH connection fails
 */
export class SSHConnectionException extends DeploymentException {
  constructor(host: string, port: number, reason?: string) {
    const message = reason
      ? `Failed to connect to SSH server ${host}:${port} - ${reason}`
      : `Failed to connect to SSH server ${host}:${port}`;
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
    this.name = 'SSHConnectionException';
  }
}

/**
 * Exception thrown when script execution fails
 */
export class ScriptExecutionException extends DeploymentException {
  constructor(script: string, reason?: string) {
    const message = reason
      ? `Script execution failed for ${script} - ${reason}`
      : `Script execution failed for ${script}`;
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    this.name = 'ScriptExecutionException';
  }
}

/**
 * Exception thrown when config parsing fails
 */
export class ConfigParseException extends DeploymentException {
  constructor(reason: string) {
    super(`Failed to parse VPN configuration: ${reason}`, HttpStatus.INTERNAL_SERVER_ERROR);
    this.name = 'ConfigParseException';
  }
}

/**
 * Exception thrown when encryption/decryption fails
 */
export class EncryptionException extends DeploymentException {
  constructor(operation: 'encrypt' | 'decrypt', reason?: string) {
    const message = reason
      ? `Failed to ${operation} data: ${reason}`
      : `Failed to ${operation} data`;
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    this.name = 'EncryptionException';
  }
}

/**
 * Exception thrown when health check fails
 */
export class HealthCheckException extends DeploymentException {
  constructor(id: string, reason?: string) {
    const message = reason
      ? `Health check failed for deployment ${id}: ${reason}`
      : `Health check failed for deployment ${id}`;
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
    this.name = 'HealthCheckException';
  }
}

/**
 * Exception thrown when authentication fails
 */
export class AuthenticationException extends HttpException {
  constructor(message: string = 'Authentication failed') {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        timestamp: new Date().toISOString(),
        error: 'AuthenticationError',
      },
      HttpStatus.UNAUTHORIZED
    );
    this.name = 'AuthenticationException';
  }
}

/**
 * Exception thrown when authorization fails
 */
export class AuthorizationException extends HttpException {
  constructor(resource?: string) {
    const message = resource
      ? `You do not have permission to access ${resource}`
      : 'You do not have permission to perform this action';
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        timestamp: new Date().toISOString(),
        error: 'AuthorizationError',
      },
      HttpStatus.FORBIDDEN
    );
    this.name = 'AuthorizationException';
  }
}
