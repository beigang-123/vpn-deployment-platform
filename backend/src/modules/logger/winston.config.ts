import * as winston from 'winston';

/**
 * 自定义日志格式
 * 包含时间戳、级别、上下文和消息
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, stack }) => {
    let log = `${timestamp} [${level}]`;

    if (context) {
      log += ` [${context}]`;
    }

    log += `: ${message}`;

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

/**
 * 控制台日志格式（带颜色）
 */
const consoleFormat = winston.format.combine(
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
);

/**
 * Winston 日志配置
 */
export const winstonConfig = {
  // 开发环境配置
  development: {
    level: 'debug',
    format: consoleFormat,
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true,
      }),
    ],
  },

  // 生产环境配置
  production: {
    level: 'info',
    format: customFormat,
    transports: [
      // 控制台输出
      new winston.transports.Console({
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true,
      }),
      // 文件输出 - 所有日志
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: customFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: customFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
    ],
  },

  // 测试环境配置
  test: {
    level: 'warn',
    format: consoleFormat,
    transports: [
      new winston.transports.Console({
        silent: true, // 测试时不输出日志
      }),
    ],
  },
};

/**
 * 获取当前环境的配置
 */
export function getWinstonConfig() {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return winstonConfig.production;
  } else if (env === 'test') {
    return winstonConfig.test;
  } else {
    return winstonConfig.development;
  }
}
