import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as dayjs from 'dayjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, body, query, params } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip || request.connection.remoteAddress || '';

    // 记录请求信息
    const requestInfo = {
      method,
      url,
      query: Object.keys(query).length > 0 ? query : undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: this.truncateData(body),
      userAgent: this.truncateString(userAgent, 200),
      ip,
    };

    const requestLog = JSON.stringify(requestInfo);
    this.logger.log(
      `[REQUEST] ${method} ${url}`,
      this.truncateString(requestLog, 500),
    );

    const startTime = dayjs().valueOf();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = dayjs().valueOf() - startTime;
          const responseInfo = {
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            data: this.truncateData(data),
          };

          const responseLog = JSON.stringify(responseInfo);
          this.logger.log(
            `[RESPONSE] ${method} ${url} - ${response.statusCode} (${duration}ms)`,
            this.truncateString(responseLog, 500),
          );
        },
        error: (error) => {
          const duration = dayjs().valueOf() - startTime;
          const errorInfo = {
            statusCode: error.status || 500,
            duration: `${duration}ms`,
            error: {
              message: error.message,
              stack: this.truncateString(error.stack, 500),
            },
          };

          const errorLog = JSON.stringify(errorInfo);
          this.logger.error(
            `[ERROR] ${method} ${url} - ${error.status || 500} (${duration}ms)`,
            this.truncateString(errorLog, 500),
          );
        },
      }),
    );
  }

  /**
   * 截断字符串，超过指定长度则截断并添加省略号
   * @param str 要截断的字符串
   * @param maxLength 最大长度
   * @returns 截断后的字符串
   */
  private truncateString(str: string, maxLength: number): string {
    if (!str || typeof str !== 'string') {
      return str;
    }
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength) + '...';
  }

  /**
   * 截断数据，递归处理对象和数组
   * @param data 要截断的数据
   * @param maxLength 最大长度，默认500
   * @returns 截断后的数据
   */
  private truncateData(data: any, maxLength = 500): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.truncateString(data, maxLength);
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return data;
      }
      // 对于数组，只保留前几个元素
      const maxItems = Math.min(10, data.length);
      return data
        .slice(0, maxItems)
        .map((item) => this.truncateData(item, maxLength));
    }

    if (typeof data === 'object') {
      const truncated: any = {};
      const keys = Object.keys(data);
      const maxKeys = Math.min(20, keys.length); // 最多处理20个属性

      for (let i = 0; i < maxKeys; i++) {
        const key = keys[i];
        const value = data[key];

        if (typeof value === 'string') {
          truncated[key] = this.truncateString(value, maxLength);
        } else if (typeof value === 'object') {
          truncated[key] = this.truncateData(value, maxLength);
        } else {
          truncated[key] = value;
        }
      }

      if (keys.length > maxKeys) {
        truncated['...'] = `还有 ${keys.length - maxKeys} 个属性未显示`;
      }

      return truncated;
    }

    return data;
  }
}
