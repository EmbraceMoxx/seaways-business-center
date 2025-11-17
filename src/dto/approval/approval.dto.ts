import { ApiProperty } from '@nestjs/swagger';
import { ApprovalActionEnum } from '@src/enums/approval.enum';

/**
 * 流程审批DTO
 */
export class TaskApprovalDto {
  @ApiProperty({ description: '任务ID' })
  taskId: string;

  @ApiProperty({ description: '审批操作' })
  action: ApprovalActionEnum;

  @ApiProperty({ description: '审批意见，可为空。' })
  remark: string;
}
