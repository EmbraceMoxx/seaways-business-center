export class MoneyUtil {
  private readonly cents: number;

  private constructor(cents: number) {
    this.cents = Math.round(cents);
  }

  static fromYuan(v?: string | number | null): MoneyUtil {
    const y = Number(v || 0);
    if (Number.isNaN(y)) throw new Error(`Invalid money: ${v}`);
    return new MoneyUtil(Math.round(y * 100));
  }

  static fromCent(cent: number): MoneyUtil {
    return new MoneyUtil(cent);
  }
  static fromYuan3(v?: string | number | null): MoneyUtil {
    const y = Number(v || 0);
    return new MoneyUtil(Math.round(y * 1000)); // 以厘为单位
  }

  toYuan3(): string {
    return (this.cents / 1000).toFixed(3);
  }
  /* =============== 运算 =============== */
  add(other: MoneyUtil | number): MoneyUtil {
    const otherCent =
      typeof other === 'number' ? Math.round(other * 100) : other.cents;
    return new MoneyUtil(this.cents + otherCent);
  }

  static add(a: string, b: string): string {
    const aCent = Math.round(Number(a || 0) * 100);
    const bCent = Math.round(Number(b || 0) * 100);
    return ((aCent + bCent) / 100).toFixed(3);
  }
  sub(other: MoneyUtil | number): MoneyUtil {
    const otherCent =
      typeof other === 'number' ? Math.round(other * 100) : other.cents;
    return new MoneyUtil(this.cents - otherCent);
  }
  /* ======== 新增：小于比较 ======== */
  lt(other: MoneyUtil | number): boolean {
    const otherCent =
      typeof other === 'number' ? Math.round(other * 100) : other.cents;
    return this.cents < otherCent;
  }
  static sub(a: string, b: string): string {
    const aCent = Math.round(Number(a || 0) * 100);
    const bCent = Math.round(Number(b || 0) * 100);
    return ((aCent - bCent) / 100).toFixed(3);
  }
  /**
   * 安全除法
   * @returns 除数为 0 时返回 0，否则返回 numerator / denominator
   */
  static safeDivide = (
    numerator: number,
    denominator: number,
    precision = 4,
  ): number => {
    if (!denominator) return 0;
    return Number((numerator / denominator).toFixed(precision));
  };

  /* =============== 输出 =============== */
  toYuan(): string {
    return (this.cents / 100).toFixed(3);
  }

  toCent(): number {
    return this.cents;
  }
  toNumber(): number {
    return this.cents / 100;
  }

  /* 调试用 */
  valueOf(): string {
    return this.toYuan();
  }
}
