import { SnowFlake } from './SnowFlake';

/**
 * ID生成工具类
 * 提供基于雪花算法的ID生成方法
 */
export class IdUtil {
  private static snowFlake: SnowFlake;

  /**
   * 初始化雪花ID生成器
   * @param workerId 工作机器ID (0-31)
   * @param datacenterId 数据中心ID (0-31)
   */
  static initialize(workerId = 1, datacenterId = 1): void {
    this.snowFlake = new SnowFlake(BigInt(workerId), BigInt(datacenterId));
  }

  /**
   * 生成雪花ID作为主键
   * @returns 返回字符串格式的雪花ID
   */
  static generateId(): string {
    if (!this.snowFlake) {
      this.initialize();
    }
    return this.snowFlake.nextId();
  }

  /**
   * 生成多个雪花ID
   * @param count 生成数量
   * @returns 返回字符串数组格式的雪花ID列表
   */
  static generateIds(count: number): string[] {
    if (!this.snowFlake) {
      this.initialize();
    }

    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.snowFlake.nextId());
    }
    return ids;
  }

  /**
   * 生成带前缀的雪花ID
   * @param prefix 前缀字符串
   * @returns 返回带前缀的雪花ID
   */
  static generateIdWithPrefix(prefix: string): string {
    return `${prefix}_${this.generateId()}`;
  }

  /**
   * 生成带后缀的雪花ID
   * @param suffix 后缀字符串
   * @returns 返回带后缀的雪花ID
   */
  static generateIdWithSuffix(suffix: string): string {
    return `${this.generateId()}_${suffix}`;
  }
}

/**
 * 便捷的ID生成函数
 * @returns 返回雪花ID字符串
 */
export const generateId = (): string => IdUtil.generateId();

/**
 * 生成多个ID的便捷函数
 * @param count 生成数量
 * @returns 返回ID字符串数组
 */
export const generateIds = (count: number): string[] =>
  IdUtil.generateIds(count);

/**
 * 生成带前缀ID的便捷函数
 * @param prefix 前缀
 * @returns 返回带前缀的ID字符串
 */
export const generateIdWithPrefix = (prefix: string): string =>
  IdUtil.generateIdWithPrefix(prefix);

/**
 * 生成带后缀ID的便捷函数
 * @param suffix 后缀
 * @returns 返回带后缀的ID字符串
 */
export const generateIdWithSuffix = (suffix: string): string =>
  IdUtil.generateIdWithSuffix(suffix);
