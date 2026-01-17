import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { StorageService } from '@modules/storage/services/storage.service';
import { UserData } from '../dto/user-data.dto';

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);
  private readonly templatePath: string;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.templatePath =
      this.configService.get('EXCEL_TEMPLATE_PATH') ||
      'templates/user-template.xlsx';
  }

  async exportUsers(users: UserData[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // 设置表头
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '姓名', key: 'name', width: 20 },
      { header: '邮箱', key: 'email', width: 30 },
      { header: '年龄', key: 'age', width: 10 },
      { header: '部门', key: 'department', width: 20 },
    ];

    // 表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // 添加数据
    users.forEach((user, index) => {
      worksheet.addRow({
        id: user.id || index + 1,
        name: user.name,
        email: user.email,
        age: user.age,
        department: user.department,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importUsers(fileBuffer: Buffer): Promise<UserData[]> {
    // const workbook = new ExcelJS.Workbook();
    // await workbook.xlsx.load(fileBuffer);
    // const worksheet = workbook.getWorksheet(1);
    // if (!worksheet) {
    //   throw new Error('Excel文件为空');
    // }
    // const users: UserData[] = [];
    // let isFirstRow = true;
    // worksheet.eachRow((row) => {
    //   if (isFirstRow) {
    //     isFirstRow = false;
    //     return; // 跳过表头
    //   }
    //   const rowData = row.values as any[];
    //   if (!rowData || rowData.length < 5) return;
    //   const user: UserData = {
    //     id: this.parseNumber(rowData[1]),
    //     name: String(rowData[2] || '').trim(),
    //     email: String(rowData[3] || '').trim(),
    //     age: this.parseNumber(rowData[4]),
    //     department: String(rowData[5] || '').trim(),
    //   };
    //   if (user.name || user.email) {
    //     users.push(user);
    //   }
    // });
    // return users;
    return [];
  }

  async downloadTemplate(method: 'direct' | 'url' = 'direct'): Promise<{
    type: 'buffer' | 'url';
    data: Buffer | string;
    filename: string;
  }> {
    try {
      // 检查模板是否存在
      const exists = await this.storageService.exists(this.templatePath);
      if (!exists) {
        throw new Error(`模板文件不存在: ${this.templatePath}`);
      }

      if (method === 'direct') {
        const buffer = await this.storageService.download(this.templatePath);
        return {
          type: 'buffer',
          data: buffer,
          filename: 'user-template.xlsx',
        };
      } else {
        const url = await this.storageService.getSignedUrl(
          this.templatePath,
          3600,
        );
        return {
          type: 'url',
          data: url,
          filename: 'user-template.xlsx',
        };
      }
    } catch (error) {
      this.logger.error(`下载模板失败: ${error.message}`);

      // 如果模板不存在，生成一个默认模板
      if (error.message.includes('不存在')) {
        return await this.generateDefaultTemplate(method);
      }

      throw error;
    }
  }

  private async generateDefaultTemplate(method: 'direct' | 'url'): Promise<{
    type: 'buffer' | 'url';
    data: Buffer | string;
    filename: string;
  }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // 设置表头
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '姓名', key: 'name', width: 20 },
      { header: '邮箱', key: 'email', width: 30 },
      { header: '年龄', key: 'age', width: 10 },
      { header: '部门', key: 'department', width: 20 },
    ];

    // 表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // 示例数据
    worksheet.addRow([1, '张三', 'zhangsan@example.com', 28, '技术部']);
    worksheet.addRow([2, '李四', 'lisi@example.com', 32, '产品部']);

    const buffer = await workbook.xlsx.writeBuffer();
    const excelBuffer = Buffer.from(buffer);

    if (method === 'direct') {
      return {
        type: 'buffer',
        data: excelBuffer,
        filename: 'user-template.xlsx',
      };
    } else {
      // 上传到MinIO然后返回URL
      const file: Express.Multer.File = {
        fieldname: 'template',
        originalname: 'user-template.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: excelBuffer,
        size: excelBuffer.length,
      } as any;

      const result = await this.storageService.upload(file, {
        path: this.templatePath,
      });
      const url = await this.storageService.getSignedUrl(result.path, 3600);

      return {
        type: 'url',
        data: url,
        filename: 'user-template.xlsx',
      };
    }
  }

  getSampleData(): UserData[] {
    return [
      {
        id: 1,
        name: '张三',
        email: 'zhangsan@example.com',
        age: 28,
        department: '技术部',
      },
      {
        id: 2,
        name: '李四',
        email: 'lisi@example.com',
        age: 32,
        department: '产品部',
      },
      {
        id: 3,
        name: '王五',
        email: 'wangwu@example.com',
        age: 25,
        department: '设计部',
      },
      {
        id: 4,
        name: '赵六',
        email: 'zhaoliu@example.com',
        age: 30,
        department: '运营部',
      },
      {
        id: 5,
        name: '孙七',
        email: 'sunqi@example.com',
        age: 27,
        department: '技术部',
      },
    ];
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
}
