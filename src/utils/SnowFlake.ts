// snowflake.ts
export class SnowFlake {
  private readonly twepoch = BigInt(1609459200000); // 2021-01-01
  private readonly workerIdBits = BigInt(5);
  private readonly datacenterIdBits = BigInt(5);
  private readonly sequenceBits = BigInt(12);

  private readonly maxWorkerId = (BigInt(1) << this.workerIdBits) - BigInt(1);
  private readonly maxDatacenterId = (BigInt(1) << this.datacenterIdBits) - BigInt(1);

  private readonly workerIdShift = this.sequenceBits;
  private readonly datacenterIdShift = this.sequenceBits + this.workerIdBits;
  private readonly timestampShift = this.sequenceBits + this.workerIdBits + this.datacenterIdBits;

  private readonly sequenceMask = (BigInt(1) << this.sequenceBits) - BigInt(1);

  private sequence = BigInt(0);
  private lastTimestamp = BigInt(-1);

  constructor(
    private readonly workerId: bigint,
    private readonly datacenterId: bigint,
  ) {
    if (workerId > this.maxWorkerId || datacenterId > this.maxDatacenterId) {
      throw new Error('workerId/datacenterId 超出范围');
    }
  }

  nextId(): string {
    let timestamp = BigInt(Date.now());

    if (timestamp < this.lastTimestamp) {
      throw new Error('时钟回拨');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + BigInt(1)) & this.sequenceMask;
      if (this.sequence === BigInt(0)) {
        while (Date.now() <= Number(this.lastTimestamp)) { /* busy wait */ }
        timestamp = BigInt(Date.now());
      }
    } else {
      this.sequence = BigInt(0);
    }

    this.lastTimestamp = timestamp;

    const id =
      ((timestamp - this.twepoch) << this.timestampShift) |
      (this.datacenterId << this.datacenterIdShift) |
      (this.workerId << this.workerIdShift) |
      this.sequence;

    return id.toString(); // 转字符串，防精度丢失
  }
}
export const SnowFlakeProvider = {
  provide: 'SNOWFLAKE',
  useValue: new SnowFlake(BigInt(1), BigInt(1)), // workerId, datacenterId
};