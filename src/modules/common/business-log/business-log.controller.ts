import { Controller, Get, Param } from '@nestjs/common';
import { BusinessLogService } from './business-log.service';
import { SuccessResponseDto } from '@src/dto';
import { BusinessLogEntity } from './entity/business-log.entity';

@Controller('business-log')
export class BusinessLogController {
  constructor(private readonly logService: BusinessLogService) {}

  @Get('/:businessId')
  async getLogs(
    @Param('businessId') businessId: string,
  ): Promise<SuccessResponseDto<BusinessLogEntity[]>> {
    const logs = await this.logService.findLogsByBusinessId(businessId);
    return new SuccessResponseDto(logs, '获取业务操作日志成功');
  }
}
