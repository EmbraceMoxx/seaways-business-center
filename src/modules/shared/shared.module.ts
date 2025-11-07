import { Module, Global, Logger } from '@nestjs/common';
import { HttpProxyService } from './http-proxy.service';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [HttpModule],
  providers: [Logger, HttpProxyService],
  exports: [Logger, HttpProxyService],
})
export class SharedModule {}
