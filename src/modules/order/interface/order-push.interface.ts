interface JstOrderItem {
  sku_id: string; // 商品SKU编码
  shop_sku_id: string; // 店铺商品SKU编码
  amount: number; // 商品总价
  price: number; // 商品单价
  base_price: number; // 原价
  qty: number; // 商品数量
  name: string; // 商品名称
  outer_oi_id: string; // 外部订单明细项ID
  is_gift: boolean; // 是否为赠品
}

interface JstOrderPay {
  outer_pay_id: string; // 外部支付编号
  pay_date: string; // 支付时间 YYYY-MM-DD HH:mm:ss
  payment: string; // 支付方式
  seller_account: string; // 收款账号
  buyer_account: string; // 付款账号
  amount: number; // 支付金额
}

export interface JstOrderPostDataItem {
  shop_id: number; // 客户聚水潭ID
  so_id: string; // 订单编号, 全局唯一
  order_date: string; // 订单日期 YYYY-MM-DD HH:mm:ss
  shop_status: string; // 订单状态，待发货
  pay_amount: number; // 订单总金额
  freight: number; // 运费
  remark: string; // 订单备注
  buyer_message: string; // 买家留言
  shop_buyer_id: string; // 买家ID，收货人姓名

  receiver_state: string; // 收货人省份
  receiver_city: string; // 收货人城市
  receiver_district: string; // 收货人区县
  receiver_address: string; // 收货人详细地址
  receiver_name: string; // 收货人姓名
  receiver_phone: string; // 收货人电话

  pay: JstOrderPay; // 支付信息
  items: JstOrderItem[]; // 订单明细项
}
