import { Controller, Get, Param } from '@nestjs/common';
import { BusinessLogService } from './business-log.service';

@Controller('business-log')
export class BusinessLogController {
  constructor(private readonly logService: BusinessLogService) {}

  @Get('/:businessId')
  async getLogs(@Param('businessId') businessId: string) {
    return this.logService.findLogsByBusinessId(businessId);
  }
}
