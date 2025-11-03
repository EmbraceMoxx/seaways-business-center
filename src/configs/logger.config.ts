import { WinstonModule } from 'nest-winston';
import 'winston-daily-rotate-file';
import { transports, format } from 'winston';
import * as config from 'config';
import * as dayjs from 'dayjs';

// 获取容器ID（Docker环境变量）
const HOSTNAME = process.env.HOSTNAME || 'local'; // Docker默认会将容器ID作为HOSTNAME

export const winstonLogger = WinstonModule.createLogger({
  level: config.get<string>('logLevel') || 'debug',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ context, level, message, timestamp }) => {
          const time = dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
          return `${time} ${level} ${context} ${message} `;
        }),
      ),
    }),
    new transports.DailyRotateFile({
      format: format.combine(
        format.printf(({ context, level, message, timestamp }) => {
          const time = dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
          return `${time} ${level} ${context} ${message} `;
        }),
      ),
      level: config.get<string>('logLevel') || 'debug',
      dirname: 'logs',
      filename: `%DATE%-${HOSTNAME}.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m', // 10M
    }),
  ],
  exceptionHandlers: [
    new transports.File({
      dirname: 'logs',
      filename: `error-${HOSTNAME}.log`,
      maxsize: 1024 * 1024 * 10, // 10M
    }),
  ],
  rejectionHandlers: [
    new transports.File({
      dirname: 'logs',
      filename: `rejection-${HOSTNAME}.log`,
      maxsize: 1024 * 1024 * 10, // 10M
    }),
  ],
});
