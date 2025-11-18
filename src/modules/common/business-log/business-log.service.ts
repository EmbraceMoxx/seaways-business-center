import { InjectRepository } from '@nestjs/typeorm';
import { BusinessLogEntity } from './entity/business-log.entity';
import { Repository } from 'typeorm';
import { BusinessLogInput } from './interface/business-log.interface';
import * as dayjs from 'dayjs';
import { Logger } from '@nestjs/common';

export class BusinessLogService {
  private readonly logger = new Logger(BusinessLogService.name);
  constructor(
    @InjectRepository(BusinessLogEntity)
    private readonly logRepo: Repository<BusinessLogEntity>,
  ) {}

  /**
   * 统一写日志
   */
  async writeLog(input: BusinessLogInput): Promise<BusinessLogEntity | null> {
    try {
      const newLog = this.logRepo.create({
        businessType: input.businessType,
        businessId: input.businessId,
        action: input.action,
        params: input.params || {},
        result: input.result || {},
        ipAddress: input.ipAddress || '',
        creatorId: input.creatorId,
        creatorName: input.creatorName,
        createdTime: dayjs().toDate(),
        operateProgram: input.operateProgram,
      });

      const insertResult = await this.logRepo.insert(newLog);
      newLog.id = insertResult.identifiers[0].id;
      return newLog;
    } catch (err) {
      // 记录日志失败时，返回null
      this.logger.error(
        `Failed to write business log: ${err.message}} `,
        err.stack,
      );
      return null;
    }
  }

  /**
   * 查询指定ID的日志
   */
  async findLogsByBusinessId(businessId: string): Promise<BusinessLogEntity[]> {
    return this.logRepo.find({
      where: { businessId },
      order: { createdTime: 'DESC' },
    });
  }
}
