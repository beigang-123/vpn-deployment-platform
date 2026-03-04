import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../src/modules/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ENCRYPTION_KEY') {
        return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      }
      return null;
    }),
  } as unknown as ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('应该成功加密文本', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      // 加密后的格式应该是 iv:authTag:encryptedData
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('应该返回空字符串当输入为空', () => {
      const encrypted = service.encrypt('');
      expect(encrypted).toBe('');
    });
  });

  describe('decrypt', () => {
    it('应该成功解密加密的文本', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('应该返回空字符串当输入为空', () => {
      const decrypted = service.decrypt('');
      expect(decrypted).toBe('');
    });

    it('应该处理无效的加密数据', () => {
      const invalidData = 'invalid:encrypted:data';
      const decrypted = service.decrypt(invalidData);

      // 对于无效数据，应该返回原始数据（向后兼容）
      expect(decrypted).toBe(invalidData);
    });
  });

  describe('isEncrypted', () => {
    it('应该正确识别加密的数据', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);

      expect(service.isEncrypted(encrypted)).toBe(true);
      expect(service.isEncrypted(plaintext)).toBe(false);
    });
  });

  describe('generateKey', () => {
    it('应该生成 64 字符的十六进制密钥', () => {
      const key = EncryptionService.generateKey();

      expect(key).toBeTruthy();
      expect(key.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('每次生成的密钥应该是唯一的', () => {
      const key1 = EncryptionService.generateKey();
      const key2 = EncryptionService.generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('hash', () => {
    it('应该生成一致的哈希值', () => {
      const data = 'Hello, World!';
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it('相同的数据应该产生相同的哈希', () => {
      const data1 = 'test';
      const data2 = 'test';
      const data3 = 'different';

      expect(service.hash(data1)).toBe(service.hash(data2));
      expect(service.hash(data1)).not.toBe(service.hash(data3));
    });
  });
});
