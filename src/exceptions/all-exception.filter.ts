import {
  ExceptionFilter,
  Catch,
  HttpException,
  ArgumentsHost,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 如果是HttpException类型，交给后续的HttpExceptionFilter处理
    if (exception instanceof HttpException) {
      throw exception;
    }

    response.status(200).json({
      code: 500,
      data: null,
      message: this.getErrorMessage(exception),
    });
  }

  private getErrorMessage(exception): string {
    if (exception instanceof Error) {
      return exception.message || 'Internal server error';
    }

    if (typeof exception === 'string') {
      return exception;
    }

    return 'Unhandled exception occurred';
  }
}
