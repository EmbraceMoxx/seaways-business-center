import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as dayjs from 'dayjs';
import * as config from 'config';
import * as crypto from 'crypto';

@Injectable()
export class JstHttpService {
  protected readonly APP_KEY: string;
  protected readonly APP_SECRET: string;
  protected readonly ACCESS_TOKEN: string;

  protected readonly axiosInstance: AxiosInstance;

  constructor() {
    if (config.has('jushuitan')) {
      const jstConfig = config.get('jushuitan');
      this.APP_KEY = jstConfig.appKey;
      this.APP_SECRET = jstConfig.appSecret;
      this.ACCESS_TOKEN = jstConfig.accessToken;
    } else {
      console.warn(
        '✖  未配置聚水潭参数，请在 config 目录下相应文件中配置 jushuitan 节点',
      );
      this.APP_KEY = '';
      this.APP_SECRET = '';
      this.ACCESS_TOKEN = '';
    }

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    });

    this.axiosInstance.defaults.baseURL = 'https://openapi.jushuitan.com';

    // 设置响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // if (response.data.code === 40002) {
        //   return Promise.reject(response.data);

        // }
        return response;
      },
      (error) => {
        if (!error.response) {
          return Promise.reject(error);
        }
        return Promise.reject(error);
      },
    );
  }

  private juShuiTanCommonSign = (apiParams, app_secret) => {
    /** 通用 md5 签名函数 */
    const shasum = crypto.createHash('md5');
    if (apiParams == null || !(apiParams instanceof Object)) {
      return '';
    }

    /** 获取 apiParms中的key 去除 sign key,并排序 */
    const sortedKeys = Object.keys(apiParams)
      .filter((item) => item !== 'sign')
      .sort();
    /** 排序后字符串 */
    let sortedParamStr = '';
    // 拼接字符串参数
    sortedKeys.forEach((key) => {
      let keyValue = apiParams[key];
      if (keyValue instanceof Object) keyValue = JSON.stringify(keyValue);
      if (key != 'sign' && keyValue != null && keyValue != '') {
        sortedParamStr += `${key}${keyValue}`;
      }
    });
    /** 拼接加密字符串 */
    const paraStr = app_secret + sortedParamStr;

    // https://openweb.jushuitan.com/doc?docId=140&name=API%E6%B5%8B%E8%AF%95%E5%B7%A5%E5%85%B7
    // console.info(`待加密字符串,可与官网测试工具对比：`, paraStr);

    shasum.update(paraStr);
    const sign = (apiParams.sign = shasum.digest('hex'));
    return sign;
  };

  // 封装 POST 请求
  post(url: string, data?: any, config?: any) {
    const param: any = {
      app_key: this.APP_KEY,
      access_token: this.ACCESS_TOKEN,
      timestamp: dayjs().unix(),
      charset: 'utf-8',
      version: 2,
      biz: JSON.stringify(data),
    };

    const sign = this.juShuiTanCommonSign(param, this.APP_SECRET);
    param.sign = sign;

    return this.axiosInstance.post(url, param, config);
  }
}
