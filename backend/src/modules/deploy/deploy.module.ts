import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';
import { SshService } from './ssh.service';
import { Deployment } from '../../entities/deployment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deployment])],
  controllers: [DeployController],
  providers: [DeployService, SshService],
  exports: [DeployService, SshService],
})
export class DeployModule {}
