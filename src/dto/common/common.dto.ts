import { ApiProperty } from '@nestjs/swagger';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { Max } from 'class-validator';
/**
 * 抽象API响应DTO
 */
export abstract class ApiResponseDto<T = any> {
  @ApiProperty({ description: '响应码', example: 200 })
  code: number;

  @ApiProperty({
    description: '响应数据',
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  data: T;

  @ApiProperty({ description: '响应消息', example: '操作成功' })
  message: string;

  @ApiProperty({ description: '时间戳', example: 1640995200000 })
  timestamp?: number;

  constructor(code: number, data: T, message: string) {
    this.code = code;
    this.data = data;
    this.message = message;
    this.timestamp = dayjs().valueOf();
  }
}

/**
 * 成功响应DTO
 */
export class SuccessResponseDto<T = any> extends ApiResponseDto<T> {
  constructor(data: T, message = '操作成功') {
    super(200, data, message);
  }
}

/**
 * 失败响应DTO
 */
export class ErrorResponseDto<T = any> extends ApiResponseDto<T> {
  constructor(message = '操作失败', data: T = null as T) {
    super(500, data, message);
  }
}

/**
 * 自定义响应DTO
 */
export class CustomResponseDto<T = any> extends ApiResponseDto<T> {
  constructor(code: number, data: T, message: string) {
    super(code, data, message);
  }
}

/**
 * 分页响应DTO
 */
export class PageResponseDto {
  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  pageSize: number;

  @ApiProperty({ description: '总数量', example: 100 })
  total: number;

  @ApiProperty({ description: '总页数', example: 10 })
  totalPages: number;
}

/**
 * 分页查询请求DTO
 */
export class PageRequestDto {
  @ApiProperty({ description: '页码', example: 1, required: false })
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @Max(1000, { message: '每页数量最大值不能超过1000' })
  pageSize?: number = 20;

  @ApiProperty({
    description: '排序字段',
    example: 'createdTime',
    required: false,
  })
  sortBy?: string;

  @ApiProperty({ description: '排序方向', example: 'DESC', required: false })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
  @ApiProperty({
    description: '查询开始时间',
    example: '2025-10-22T00:00:00.000Z',
    required: false,
  })
  startTime?: string;
  @ApiProperty({
    description: '查询结束时间',
    example: '2025-10-22T23:59:59.999Z',
    required: false,
  })
  endTime?: string;
}

/**
 * ID参数DTO
 */
export class IdDto {
  @ApiProperty({ description: 'ID', example: 1 })
  id: number;
}

/**
 * 业务异常类
 * 继承 HttpException，自动包装成统一的响应格式
 */
export class BusinessException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        code: status,
        data: null,
        message: message,
        timestamp: dayjs().valueOf(),
      },
      status,
    );
  }
}
