import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encryption Service using AES-256-GCM
 * Provides secure encryption/decryption for sensitive data like SSH credentials
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    // Get encryption key from environment variable (32 bytes for AES-256)
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');

    if (!keyString) {
      this.logger.warn('ENCRYPTION_KEY not set, using default key (NOT SECURE FOR PRODUCTION)');
      // Generate a warning for development
      this.logger.warn('Please set ENCRYPTION_KEY environment variable with a 32-byte hex key');
    }

    // Use the key from env or generate a warning key for development
    this.key = keyString
      ? Buffer.from(keyString, 'hex')
      : Buffer.from('0123456789abcdef0123456789abcdef', 'hex'); // 32 bytes
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param text Plain text to encrypt
   * @returns Encrypted string in format: iv:authTag:encryptedData (all hex encoded)
   */
  encrypt(text: string): string {
    if (!text) {
      return '';
    }

    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt the data
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Return format: iv:authTag:encryptedData (all hex encoded)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error(`Failed to encrypt data: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param encryptedText Encrypted string in format: iv:authTag:encryptedData
   * @returns Decrypted plain text
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      return '';
    }

    try {
      // Parse the encrypted string
      const parts = encryptedText.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedData = parts[2];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

      // Set auth tag
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      // For backward compatibility with existing unencrypted data
      // If decryption fails, return the original text (assume it's not encrypted)
      this.logger.warn('Returning original text (may be unencrypted legacy data)');
      return encryptedText;
    }
  }

  /**
   * Generate a secure random encryption key (32 bytes for AES-256)
   * @returns Hex-encoded encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a value using SHA-256 (for one-way hashing)
   * @param text Text to hash
   * @returns Hex-encoded hash
   */
  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Check if data appears to be encrypted
   * @param text Text to check
   * @returns True if text appears to be encrypted
   */
  isEncrypted(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    // Check if it matches our encrypted format: iv:authTag:encryptedData
    const parts = text.split(':');

    return (
      parts.length === 3 &&
      parts[0].length === 32 && // IV is 16 bytes = 32 hex chars
      parts[1].length === 32 && // AuthTag is 16 bytes = 32 hex chars
      parts[2].length > 0 && // Has encrypted data
      /^[0-9a-fA-F]+$/.test(parts[0]) && // IV is hex
      /^[0-9a-fA-F]+$/.test(parts[1]) && // AuthTag is hex
      /^[0-9a-fA-F]+$/.test(parts[2]) // Encrypted data is hex
    );
  }
}
