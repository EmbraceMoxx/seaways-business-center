import { ApiTags } from '@nestjs/swagger';
import { Controller } from '@nestjs/common';
import { OrderService } from '@modules/order/service/order.service';

@ApiTags('订单管理')
@Controller('order')
export class OrderController {
  constructor(private orderService:OrderService) {}

}