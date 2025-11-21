import { Controller, Get } from '@nestjs/common';
import { OrderEventTaskService } from '../service/order-event-task.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuccessResponseDto } from '@src/dto';
import { ProcessedResult } from '../interface/order-event-task.interface';

@ApiTags('订单任务处理')
@Controller('order/task')
export class OrderTaskController {
  constructor(private orderEventTaskService: OrderEventTaskService) {}

  @Get('processOrderEvents')
  @ApiOperation({ summary: '处理订单事件任务' })
  async processOrderEvents(): Promise<SuccessResponseDto<ProcessedResult>> {
    const result = await this.orderEventTaskService.orderEventTaskProcess();
    return new SuccessResponseDto(result, '调用成功');
  }
}
