import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const res = exception.getResponse() as any;

    // 如果响应体已经是完整的格式（包含 code, data/result, message, timestamp），直接返回
    if (res && typeof res === 'object' && res.code !== undefined) {
      response.status(200).json(res);
    } else {
      // 否则使用默认格式
      let message = res?.message?.join
        ? res?.message?.join(',')
        : exception.message;

      // 特殊处理401未授权错误
      if (status === 401) {
        message = '用户未登录';
      }

      response.status(200).json({
        code: status,
        data: null,
        message: message,
      });
    }
  }
}
