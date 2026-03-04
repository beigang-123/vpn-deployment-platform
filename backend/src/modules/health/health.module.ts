import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { DbHealthIndicator } from './db-health.indicator';

@Module({
  imports: [TypeOrmModule, TerminusModule],
  controllers: [HealthController],
  providers: [DbHealthIndicator],
})
export class HealthModule {}
