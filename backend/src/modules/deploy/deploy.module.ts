import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';
import { SshService } from './ssh.service';
import { SSHPoolService } from './ssh-pool.service';
import { Deployment } from '../../entities/deployment.entity';
import { ConfigModule as AppConfig } from '../config/config.module';
import { IpLocationModule } from '../ip-location/ip-location.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deployment]),
    AppConfig,
    IpLocationModule,
  ],
  controllers: [DeployController],
  providers: [DeployService, SshService, SSHPoolService],
  exports: [DeployService, SshService, SSHPoolService],
})
export class DeployModule {}
