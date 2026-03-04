import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { getWinstonConfig } from './winston.config';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          let log = `${timestamp} ${level}`;

          if (context) {
            log += ` [${context}]`;
          }

          log += `: ${message}`;
          return log;
        })
      ),
      transports: [
        new winston.transports.Console({
          handleExceptions: true,
          handleRejections: true,
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
