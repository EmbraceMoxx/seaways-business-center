import { InjectRepository } from '@nestjs/typeorm';
import { BusinessLogEntity } from './entity/business-log.entity';
import { EntityManager, Repository } from 'typeorm';
import { BusinessLogInput } from './interface/business-log.interface';
import * as dayjs from 'dayjs';
import { Logger } from '@nestjs/common';
import { generateId } from '@src/utils';

export class BusinessLogService {
  private readonly logger = new Logger(BusinessLogService.name);
  constructor(
    @InjectRepository(BusinessLogEntity)
    private readonly logRepo: Repository<BusinessLogEntity>,
  ) {}

  /**
   * 统一写日志
   * @param input 日志输入参数
   * @param manager 可选的 EntityManager，用于事务操作
   */
  async writeLog(
    input: BusinessLogInput,
    manager?: EntityManager,
  ): Promise<BusinessLogEntity | null> {
    try {
      const repo = manager
        ? manager.getRepository(BusinessLogEntity)
        : this.logRepo;
      const newLog = repo.create({
        id: generateId(),
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

      const insertResult = await repo.insert(newLog);
      newLog.id = insertResult.identifiers[0].id;
      return newLog;
    } catch (err) {
      // 记录日志失败时，返回null
      this.logger.error(
        `Failed to write business log: ${err.message}`,
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
      order: { createdTime: 'DESC', id: 'DESC' },
    });
  }
}
