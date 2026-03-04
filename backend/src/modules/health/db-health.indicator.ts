import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { HealthIndicator, HealthCheckResult } from '@nestjs/terminus';

@Injectable()
export class DbHealthIndicator extends HealthIndicator {
  constructor(private connection: Connection) {
    super();
  }

  async isHealthy(key: string): Promise<HealthCheckResult> {
    try {
      // Try to execute a simple query
      await this.connection.query('SELECT 1');

      return this.getStatus(key, true, {
        message: 'Database connection is healthy',
        type: this.connection.options.type,
      });
    } catch (error) {
      return this.getStatus(key, false, {
        message: 'Database connection failed',
        error: error.message,
      });
    }
  }
}
