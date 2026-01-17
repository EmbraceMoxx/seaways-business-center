import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../services/storage.service';
import { SuccessResponseDto, BusinessException } from '@src/dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BusinessException('请选择要上传的文件');
    }

    try {
      const result = await this.storageService.upload(file);
      return new SuccessResponseDto(result, '文件上传成功');
    } catch (error) {
      throw new BusinessException(`上传失败: ${error.message}`);
    }
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BusinessException('请选择要上传的文件');
    }

    try {
      const results = await this.storageService.uploadMultiple(files);
      return new SuccessResponseDto(
        results,
        `成功上传 ${results.length} 个文件`,
      );
    } catch (error) {
      throw new BusinessException(`上传失败: ${error.message}`);
    }
  }

  @Get('download/:path(*)')
  async downloadFile(
    @Res() res: Response,
    @Param('path') path: string,
    @Query('filename') filename?: string,
  ) {
    try {
      const buffer = await this.storageService.download(path);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename || path.split('/').pop()}"`,
      );
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error) {
      throw new BusinessException(`下载失败: ${error.message}`);
    }
  }

  @Get('url/:path(*)')
  async getFileUrl(
    @Param('path') path: string,
    @Query('expires') expires?: number,
  ) {
    try {
      const url = await this.storageService.getSignedUrl(path, expires);
      return new SuccessResponseDto({ url });
    } catch (error) {
      throw new BusinessException(`获取链接失败: ${error.message}`);
    }
  }

  @Delete(':path(*)')
  async deleteFile(@Param('path') path: string) {
    try {
      await this.storageService.delete(path);
      return new SuccessResponseDto(null, '文件删除成功');
    } catch (error) {
      throw new BusinessException(`删除失败: ${error.message}`);
    }
  }
}
