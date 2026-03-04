import { IsString, IsEnum, IsOptional, IsNotEmpty, IsEmail } from 'class-validator';
import { VpnType } from '../../entities/deployment.entity';
import { IsIP, IsPort, IsMinPassword, IsPrivateKey } from '../../common/validators';

export class StartDeployDto {
  @IsIP()
  @IsNotEmpty()
  serverIp: string;

  @IsPort()
  @IsNotEmpty()
  sshPort: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsMinPassword()
  @IsNotEmpty()
  password: string;

  @IsEnum(VpnType)
  @IsNotEmpty()
  vpnType: VpnType;

  @IsOptional()
  @IsPort()
  vpnPort?: number;

  @IsOptional()
  @IsString()
  @IsPrivateKey()
  privateKey?: string;
}

export interface VpnConfig {
  address: string;
  port: number;
  uuid: string;
  protocol: string;
  network: string;
  security: string;
  shareLink: string;
  clientConfig: any;
}

// Auth DTOs with strong password validation
export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsMinPassword()
  @IsNotEmpty()
  password: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

