import { IsString, IsInt, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { VpnType } from '../../entities/deployment.entity';

export class StartDeployDto {
  @IsString()
  @IsNotEmpty()
  serverIp: string;

  @IsInt()
  @IsNotEmpty()
  sshPort: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(VpnType)
  @IsNotEmpty()
  vpnType: VpnType;

  @IsOptional()
  @IsString()
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
