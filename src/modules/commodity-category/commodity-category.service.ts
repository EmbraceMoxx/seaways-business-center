import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CommodityCategoryEntity } from './commodity-category.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { BusinessException } from '@src/dto/common/common.dto';

@Injectable()
export class CommodityCategoryService {
  constructor(
    @InjectRepository(CommodityCategoryEntity)
    private categoryRepositor: Repository<CommodityCategoryEntity>,
  ) {}
}
