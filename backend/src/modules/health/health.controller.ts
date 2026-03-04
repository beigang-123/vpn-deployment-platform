import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { DbHealthIndicator } from './db-health.indicator';

@Controller('health')
@Public()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private dbHealth: DbHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  healthCheck(): HealthCheckResult {
    return this.health.check([
      () => this.dbHealth.isHealthy('database'),
      // Memory check - fail if heap > 1GB
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024),
      // Memory check - fail if RSS > 1.5GB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024 * 1.5),
      // Disk check - fail if used > 90%
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 90 }),
    ]);
  }

  @Get('simple')
  simpleHealthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
