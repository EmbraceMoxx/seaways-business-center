import * as dayjs from 'dayjs';
import { Logger } from '@nestjs/common';

/**
 * 时间格式化工具类（基于dayjs）
 */
export class TimeFormatterUtil {
  private static readonly logger = new Logger(TimeFormatterUtil.name);

  // 支持的时间格式模式（按优先级排序）
  private static readonly TIME_FORMATS = [
    'YYYY-MM-DD HH:mm:ss', // 标准日期时间
    'YYYY-MM-DD HH:mm:ss.SSS', // 精确到毫秒
    'YYYY-MM-DD', // 仅日期
    'YYYY/MM/DD HH:mm:ss', // 斜杠分隔
    'YYYY/MM/DD', // 斜杠分隔仅日期
    'MM-DD-YYYY HH:mm:ss', // 美式日期时间
    'MM-DD-YYYY', // 美式日期
    'DD-MM-YYYY HH:mm:ss', // 欧式日期时间
    'DD-MM-YYYY', // 欧式日期
  ];

  /**
   * 格式化时间为标准格式
   * @param timeString 时间字符串
   * @param type 时间类型：start（开始时间）或 end（结束时间）
   * @returns 格式化后的Date对象
   */
  static formatToStandard(timeString: string, type: 'start' | 'end'): Date {
    if (!timeString) {
      return dayjs().toDate();
    }

    // 使用dayjs解析时间，支持多种格式和严格模式
    let dayjsTime = dayjs(timeString, this.TIME_FORMATS, true);

    // 如果严格模式解析失败，尝试宽松模式
    if (!dayjsTime.isValid()) {
      dayjsTime = dayjs(timeString);
    }

    // 如果仍然无效，抛出错误
    if (!dayjsTime.isValid()) {
      this.logger.error(`无效的时间格式: ${timeString}`);
      throw new Error(`无效的时间格式: ${timeString}`);
    }

    // 根据时间类型进行标准化处理
    const standardizedTime =
      type === 'start'
        ? dayjsTime.startOf('day') // 开始时间：当天 00:00:00.000
        : dayjsTime.endOf('day'); // 结束时间：当天 23:59:59.999

    // 记录格式化过程（调试级别）
    this.logger.debug(
      `时间格式化: "${timeString}" -> "${standardizedTime.format(
        'YYYY-MM-DD HH:mm:ss.SSS',
      )}" (${type})`,
    );

    return standardizedTime.toDate();
  }

  /**
   * 解析时间字符串为dayjs对象
   * @param timeString 时间字符串
   * @returns dayjs对象
   */
  static parseTime(timeString: string): dayjs.Dayjs {
    if (!timeString) {
      return dayjs();
    }

    // 尝试严格模式解析
    let dayjsTime = dayjs(timeString, this.TIME_FORMATS, true);

    // 如果严格模式解析失败，尝试宽松模式
    if (!dayjsTime.isValid()) {
      dayjsTime = dayjs(timeString);
    }

    if (!dayjsTime.isValid()) {
      throw new Error(`无效的时间格式: ${timeString}`);
    }

    return dayjsTime;
  }

  /**
   * 格式化时间为指定格式
   * @param timeString 时间字符串
   * @param format 输出格式
   * @returns 格式化后的时间字符串
   */
  static formatTime(
    timeString: string,
    format: string = 'YYYY-MM-DD HH:mm:ss',
  ): string {
    const dayjsTime = this.parseTime(timeString);
    return dayjsTime.format(format);
  }

  /**
   * 获取时间范围
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 时间范围对象
   */
  static getTimeRange(
    startTime?: string,
    endTime?: string,
  ): {
    start: Date;
    end: Date;
    isValid: boolean;
  } {
    try {
      const start = startTime
        ? this.formatToStandard(startTime, 'start')
        : dayjs().startOf('day').toDate();
      const end = endTime
        ? this.formatToStandard(endTime, 'end')
        : dayjs().endOf('day').toDate();

      return {
        start,
        end,
        isValid: true,
      };
    } catch (error) {
      this.logger.error(`时间范围解析失败: ${error.message}`);
      return {
        start: dayjs().startOf('day').toDate(),
        end: dayjs().endOf('day').toDate(),
        isValid: false,
      };
    }
  }

  /**
   * 验证时间格式是否有效
   * @param timeString 时间字符串
   * @returns 是否有效
   */
  static isValidTime(timeString: string): boolean {
    if (!timeString) {
      return false;
    }

    try {
      const dayjsTime = this.parseTime(timeString);
      return dayjsTime.isValid();
    } catch {
      return false;
    }
  }

  /**
   * 获取相对时间
   * @param timeString 基准时间
   * @param amount 数量
   * @param unit 单位
   * @returns 相对时间
   */
  static getRelativeTime(
    timeString: string,
    amount: number,
    unit: dayjs.ManipulateType,
  ): Date {
    const dayjsTime = this.parseTime(timeString);
    return dayjsTime.add(amount, unit).toDate();
  }

  /**
   * 获取时间差
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param unit 单位
   * @returns 时间差
   */
  static getTimeDiff(
    startTime: string,
    endTime: string,
    unit: dayjs.QUnitType = 'millisecond',
  ): number {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    return end.diff(start, unit);
  }
  /**
   * 根据年月获取月份的第一天和最后一天
   * @param yearMonth 年月字符串，格式如 '202511'
   * @returns 包含月份第一天和最后一天的对象
   */
  static getMonthRange(yearMonth: string): { startTime: Date; endTime: Date } {
    if (!yearMonth || yearMonth.length !== 6) {
      throw new Error('无效的年月格式，应为6位数字，如202511');
    }

    const year = parseInt(yearMonth.substring(0, 4), 10);
    const month = parseInt(yearMonth.substring(4, 6), 10) - 1; // month是0-indexed

    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      throw new Error('无效的年月数值');
    }

    const startTime = dayjs(new Date(year, month, 1)).startOf('day').toDate();
    const endTime = dayjs(new Date(year, month + 1, 0))
      .endOf('day')
      .toDate();

    this.logger.debug(
      `月份范围计算: "${yearMonth}" -> 第一天: "${dayjs(startTime).format(
        'YYYY-MM-DD HH:mm:ss.SSS',
      )}", 最后一天: "${dayjs(endTime).format('YYYY-MM-DD HH:mm:ss.SSS')}"`,
    );

    return { startTime, endTime };
  }
}
