import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable()
export class CatchErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CatchErrorInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    const userAgent = request.headers['user-agent'];
    const handler = context.getHandler();
    const controllerName = context.getClass().name;

    const { method, url, user, body } = request as any;

    return next.handle().pipe(
      catchError((err) => {
        const errorDetails = {
          method,
          url,
          body: this.truncateData(body),
          handler: `${controllerName}.${handler.name}`,
          userAgent: this.truncateString(userAgent, 200),
          user: this.truncateData(user),
        };

        const errorLog = JSON.stringify(errorDetails);
        this.logger.log(
          `[${method}] ${url}`,
          this.truncateString(errorLog, 500),
        );
        this.logger.error(err?.message || JSON.stringify(err), err.stack);
        return throwError(() => err);
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
  private truncateData(data: any, maxLength: number = 500): any {
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
