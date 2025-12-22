import { Injectable, Logger } from '@nestjs/common';
import { OrderSyncService } from './order-sync.service';
import { JstHttpService } from '@src/modules/erp/jushuitan/jst-http.service';
import { SyncOrderStatusDto } from '@src/dto/order/order.sync.dto';
import { ERP_JST_API } from '@modules/erp/jushuitan/jst-http.constant';
import { BusinessException } from '@src/dto/common/common.dto';
import { withRetry } from '@src/utils';
import { groupBy } from 'lodash';

interface JstOrderStatus {
  soId: string;
  status: string;
  isSplit: boolean;
}

@Injectable()
export class OrderJstService {
  private readonly logger = new Logger(OrderJstService.name);
  private readonly BATCH_SIZE = 100;

  private readonly ORDER_STATUS = {
    SENT: 'Sent', // 已发货
    CANCELLED: 'Cancelled', // 已取消
    QUESTION: 'Question', // 异常
  };

  private readonly OPERATE_TYPE = {
    SENT: 1,
    CANCELLED: 2,
  };
  constructor(
    private readonly orderSyncService: OrderSyncService,
    private readonly jstHttpService: JstHttpService,
  ) {}

  /**
   * 执行订单状态同步完整流程
   */
  async executeOrderStatusSync(): Promise<void> {
    this.logger.log('开始执行订单状态同步流程');

    try {
      // 获取需要同步状态的订单
      const { orderCodes, startTime, endTime } =
        await this.orderSyncService.getSyncOrderCodes();

      if (!orderCodes?.length) {
        this.logger.log('没有需要同步状态的订单');
        return;
      }

      this.logger.log(
        `订单数量: ${orderCodes.length}, 时间范围: ${startTime} - ${endTime}`,
      );

      // 从聚水潭查询订单状态
      const jstOrderStatuses = await this.fetchJstOrderStatus(orderCodes);
      if (!jstOrderStatuses?.length) {
        this.logger.log('从聚水潭未查询到订单状态信息');
        return;
      }

      const syncRequests: SyncOrderStatusDto[] =
        this.buildSyncRequests(jstOrderStatuses);
      if (!syncRequests?.length) {
        this.logger.log('没有需要更新状态的订单');
        return;
      }

      await this.orderSyncService.syncJstOrderStatus(syncRequests);
      this.logger.log(`成功处理 ${syncRequests.length} 个订单的状态同步`);
    } catch (error) {
      this.logger.error(
        `订单状态同步流程执行失败: ${error.message}`,
        error.stack,
      );
      throw new BusinessException(`订单状态同步失败: ${error.message}`);
    }
  }

  private createSyncRequest(
    orderCode: string,
    operate: number,
  ): SyncOrderStatusDto {
    return { orderCode, operate, operator: 'admin' };
  }

  /**
   * 根据聚水潭返回的订单状态构建同步请求数据
   */
  private buildSyncRequests(
    jstOrderStatuses: JstOrderStatus[],
  ): SyncOrderStatusDto[] {
    const groupedOrders = groupBy(jstOrderStatuses, 'soId');

    const syncRequests: SyncOrderStatusDto[] = [];

    for (const [soId, orders] of Object.entries(groupedOrders)) {
      const operateType = this.determineOperateType(orders);
      if (operateType) {
        syncRequests.push(this.createSyncRequest(soId, operateType));
      }
    }

    return syncRequests;
  }

  private determineOperateType(orders: JstOrderStatus[]): number | null {
    // 主订单: 第一条非拆单的数据
    const mainOrder = orders.find((order) => !order.isSplit);

    // 主订单已发货
    if (mainOrder?.status === this.ORDER_STATUS.SENT) {
      return this.OPERATE_TYPE.SENT;
    }
    // 主订单已取消
    if (mainOrder?.status === this.ORDER_STATUS.CANCELLED) {
      return this.OPERATE_TYPE.CANCELLED;
    }

    // 处理拆单的情况
    const subOrders = orders.filter((order) => order.isSplit);
    if (!subOrders?.length) return null;

    if (subOrders.some((order) => order.status === this.ORDER_STATUS.SENT)) {
      // 只要一个子订单是已发货，则算订单是已发货
      return this.OPERATE_TYPE.SENT;
    }
    // 所有子订单都是Canceled，整个订单是已取消
    if (
      subOrders.every((order) => order.status === this.ORDER_STATUS.CANCELLED)
    ) {
      return this.OPERATE_TYPE.CANCELLED;
    }

    return null;
  }

  /**
   * 批量从聚水潭获取订单状态
   */
  private async fetchJstOrderStatus(
    orderCodes: string[],
  ): Promise<JstOrderStatus[]> {
    try {
      this.logger.log(`开始查询聚水潭订单状态，订单数量: ${orderCodes.length}`);

      const allResults: JstOrderStatus[] = [];
      const totalBatches = Math.ceil(orderCodes.length / this.BATCH_SIZE);

      for (let i = 0; i < orderCodes.length; i += this.BATCH_SIZE) {
        const batch = orderCodes.slice(i, i + this.BATCH_SIZE);
        const currentBatch = Math.floor(i / this.BATCH_SIZE) + 1;

        this.logger.debug(
          `正在处理第 ${currentBatch}/${totalBatches} 批订单，数量: ${batch.length}`,
        );

        try {
          const fetchJstOrders = async () => {
            const { data } = await this.jstHttpService.post(
              ERP_JST_API.QUERY_ORDER,
              {
                so_ids: batch,
                page_index: 1,
                page_size: 100,
              },
            );
            if (data?.code) {
              throw new Error(
                `API错误: ${data.code} - ${data?.msg || JSON.stringify(data)}`,
              );
            }
            return data?.data;
          };

          const result = await withRetry(fetchJstOrders, {
            retries: 3,
            delayMs: 2000,
            logger: this.logger,
          });

          allResults.push(...this.parseJstResponse(result));
          this.logger.debug(
            `第 ${currentBatch}/${totalBatches} 批订单查询完成`,
          );
        } catch (batchError) {
          this.logger.error(
            `第 ${currentBatch}/${totalBatches} 批订单查询失败: ${batchError.message}`,
            batchError.stack,
          );
          // 继续处理下一批
        }
      }

      return allResults;
    } catch (error) {
      this.logger.error(
        `查询聚水潭订单状态失败: ${error.message}`,
        error.stack,
      );
      throw new BusinessException(`聚水潭查询失败: ${error.message}`);
    }
  }

  /**
   * 解析聚水潭响应数据
   */
  private parseJstResponse({ orders }): JstOrderStatus[] {
    return Array.isArray(orders)
      ? orders.map((order: any) => ({
          soId: order.so_id,
          status: order.status,
          isSplit: order.is_split,
        }))
      : [];
  }
}
