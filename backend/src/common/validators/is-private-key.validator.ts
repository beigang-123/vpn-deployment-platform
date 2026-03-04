import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

/**
 * Custom validator for SSH private key format
 * Accepts:
 * - RSA private keys (PEM format)
 * - ECDSA private keys
 * - Ed25519 private keys
 *
 * Usage: @IsPrivateKey()
 */
@ValidatorConstraint({ name: 'isPrivateKey', async: false })
export class IsPrivateKeyConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const privateKey = value.trim();

    // Check for RSA/ECDSA/Ed25519 PEM format
    // Format: -----BEGIN [TYPE] PRIVATE KEY-----

    // RSA private key
    if (/-----BEGIN RSA PRIVATE KEY-----/.test(privateKey) &&
        /-----END RSA PRIVATE KEY-----/.test(privateKey)) {
      return true;
    }

    // ECDSA private key
    if (/-----BEGIN EC PRIVATE KEY-----/.test(privateKey) &&
        /-----END EC PRIVATE KEY-----/.test(privateKey)) {
      return true;
    }

    // Ed25519/OpenSSH private key
    if (/-----BEGIN OPENSSH PRIVATE KEY-----/.test(privateKey) &&
        /-----END OPENSSH PRIVATE KEY-----/.test(privateKey)) {
      return true;
    }

    // Generic private key
    if (/-----BEGIN PRIVATE KEY-----/.test(privateKey) &&
        /-----END PRIVATE KEY-----/.test(privateKey)) {
      return true;
    }

    return false;
  }

  defaultMessage(): string {
    return 'Invalid private key format. Must be a valid PEM format (RSA, ECDSA, or Ed25519)';
  }
}

export function IsPrivateKey(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPrivateKeyConstraint,
    });
  };
}

/**
 * Index file to export all validators
 */
export * from './is-ip.validator';
export * from './is-port.validator';
export * from './is-strong-password.validator';
export * from './is-private-key.validator';
