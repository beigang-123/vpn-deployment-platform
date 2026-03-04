import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigGeneratorService } from './config-generator.service';
import { Deployment } from '../../entities/deployment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deployment])],
  controllers: [ConfigController],
  providers: [ConfigService, ConfigGeneratorService],
  exports: [ConfigGeneratorService],
})
export class ConfigModule {}
