import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuccessResponseDto } from '@src/dto';
import { ApprovalEngineService } from '../services/approval-engine.service';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import {
  CreateApprovalDto,
  ApprovalCommand,
} from '@src/dto/approval/approval.dto';

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

  @ApiOperation({ summary: '查看审批状态' })
  @Get('status/:orderId')
  async getApprovalStatus(@Param('orderId') orderId: string) {
    const result = await this.approvalEngineService.getApprovalStatus(orderId);
    return new SuccessResponseDto(result);
  }

  @ApiOperation({ summary: '订单审批' })
  @Post('process')
  async processApproval(
    @Body() command: ApprovalCommand,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const result = await this.approvalEngineService.processApproval(
      command,
      user,
    );
    return new SuccessResponseDto(result);
  }
}
