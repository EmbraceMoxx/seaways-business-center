import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, retry, timer } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { BusinessException } from '@src/dto/common/common.dto';
import * as config from 'config';

@Injectable()
export class HttpProxyService {
  private readonly baseURL = config.get('httpProxy.baseURL');
  private readonly timeout = 10000;
  private readonly maxRetries = 3;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {}

  async request<T = any>(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    endpoint: string,
    token: string,
    data?: any,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const { headers, ...restConfig } = config;

    try {
      const { data: response } = await firstValueFrom(
        this.httpService
          .request({
            url,
            method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              ...headers,
            },
            timeout: this.timeout,
            ...restConfig,
            data: method !== 'get' ? data : undefined,
          })
          .pipe(
            retry({
              count: this.maxRetries,
              delay: this.retryDelay,
            }),
          ),
      );

      if (response?.code !== 200) {
        throw new Error(response?.message || `业务错误: ${response?.code}`);
      }

      return response.data;
    } catch (error) {
      throw new BusinessException(`内部代理错误: ${error.message}`);
    }
  }

  // 延迟重试延迟
  private retryDelay(error: any, retryCount: number) {
    this.logger.warn(`请求失败，第${retryCount}次重试...`, error.message);
    return timer(1000 * Math.pow(2, retryCount - 1));
  }

  get = <T = any>(
    endpoint: string,
    token: string,
    config?: AxiosRequestConfig,
  ): Promise<T> => this.request<T>('get', endpoint, token, undefined, config);

  post = <T = any>(
    endpoint: string,
    token: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => this.request<T>('post', endpoint, token, data, config);

  patch = <T = any>(
    endpoint: string,
    token: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => this.request<T>('patch', endpoint, token, data, config);

  put = <T = any>(
    endpoint: string,
    token: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => this.request<T>('put', endpoint, token, data, config);

  delete = <T = any>(
    endpoint: string,
    token: string,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    this.request<T>('delete', endpoint, token, undefined, config);
}
