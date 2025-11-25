import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuccessResponseDto } from '@src/dto';
import { ApprovalEngineService } from '../services/approval-engine.service';
import { CreateApprovalDto } from '@src/dto/approval/approval.dto';

@ApiTags('审批管理')
@ApiBearerAuth()
@Controller('approval')
export class ApprovalController {
  constructor(private approvalEngineService: ApprovalEngineService) {}

  @ApiOperation({ summary: '启动审批流程' })
  @Post('start')
  async start(@Body() createDto: CreateApprovalDto) {
    const result = await this.approvalEngineService.startApprovalProcess(
      createDto,
    );
    return new SuccessResponseDto(result);
  }
}
