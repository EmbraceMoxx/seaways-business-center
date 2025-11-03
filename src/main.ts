import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './exceptions/http-exception.filter';
import { AllExceptionFilter } from './exceptions/all-exception.filter';
import { winstonLogger } from './configs/logger.config';
import { CatchErrorInterceptor } from './interceptors/catch-error.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

process.env.TZ = 'Asia/Shanghai';

async function bootstrap() {
  const httpApp = await NestFactory.create(AppModule, {
    cors: true,
    bufferLogs: true,
    logger: winstonLogger,
  });

  // 信任代理
  // httpApp.getHttpAdapter().getInstance().set('trust proxy', true);

  httpApp.useGlobalFilters(new AllExceptionFilter(), new HttpExceptionFilter());
  httpApp.useGlobalPipes(new ValidationPipe({ transform: true }));
  httpApp.useGlobalInterceptors(new CatchErrorInterceptor());

  // 设置全局路径前缀
  httpApp.setGlobalPrefix('business');

  // 配置Swagger文档
  const config = new DocumentBuilder()
    .setTitle('Seaways Business Center API')
    .setDescription('Seaways业务中心API文档')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('商品管理', '商品管理相关接口')
    .build();

  const document = SwaggerModule.createDocument(httpApp, config);
  SwaggerModule.setup('api-docs', httpApp, document, {
    useGlobalPrefix: true, // 明确使用全局前缀
    swaggerOptions: {
      persistAuthorization: true, // 保持授权状态
    },
  });

  console.log(`🚀 Swagger文档已启动: http://localhost:8081/business/api-docs`);

  await httpApp.listen(8081);
}
bootstrap();
