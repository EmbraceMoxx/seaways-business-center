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

  /* =============== 运算 =============== */
  add(other: MoneyUtil | number): MoneyUtil {
    const otherCent =
      typeof other === 'number' ? Math.round(other * 100) : other.cents;
    return new MoneyUtil(this.cents + otherCent);
  }
  sub(other: MoneyUtil | number): MoneyUtil {
    const otherCent =
      typeof other === 'number' ? Math.round(other * 100) : other.cents;
    return new MoneyUtil(this.cents - otherCent);
  }

  /* =============== 输出 =============== */
  toYuan(): string {
    return (this.cents / 100).toFixed(2);
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
