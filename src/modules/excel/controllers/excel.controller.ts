import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ExcelService } from '../services/excel.service';
import { UserData } from '../dto/user-data.dto';
import { SuccessResponseDto, BusinessException } from '@src/dto';

@Controller('excel')
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Post('export')
  async exportUsers(@Body() users: UserData[], @Res() res: Response) {
    if (!users || users.length === 0) {
      throw new BusinessException('没有数据可导出');
    }

    try {
      const buffer = await this.excelService.exportUsers(users);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error) {
      throw new BusinessException(`导出失败: ${error.message}`);
    }
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BusinessException('请选择要导入的Excel文件');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BusinessException('只支持Excel文件(.xlsx, .xls)');
    }

    try {
      const users = await this.excelService.importUsers(file.buffer);
      return new SuccessResponseDto(users, `成功导入 ${users.length} 条数据`);
    } catch (error) {
      throw new BusinessException(`导入失败: ${error.message}`);
    }
  }

  @Get('template')
  async downloadTemplate(
    @Res() res: Response,
    @Query('method') method: 'direct' | 'url' = 'direct',
  ) {
    try {
      const result = await this.excelService.downloadTemplate(method);

      if (result.type === 'buffer') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${result.filename}"`,
        );
        res.setHeader('Content-Length', (result.data as Buffer).length);
        res.send(result.data);
      } else {
        // 重定向到预签名URL
        res.redirect(302, result.data as string);
      }
    } catch (error) {
      throw new BusinessException(`模板下载失败: ${error.message}`);
    }
  }

  @Get('template/url')
  async getTemplateUrl() {
    try {
      const result = await this.excelService.downloadTemplate('url');
      return new SuccessResponseDto({ url: result.data });
    } catch (error) {
      throw new BusinessException(`获取模板链接失败: ${error.message}`);
    }
  }

  @Get('sample-data')
  async getSampleData() {
    const data = this.excelService.getSampleData();
    return new SuccessResponseDto(data);
  }
}
