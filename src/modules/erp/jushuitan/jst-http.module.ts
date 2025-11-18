import { Module } from '@nestjs/common';
import { JstHttpService } from './jst-http.service';

@Module({
  imports: [],
  providers: [JstHttpService],
  exports: [JstHttpService],
})
export class JstHttpModule {}
