export type OutboundNoticeStatus = "待下发" | "已下发" | "部分出库" | "已出库" | "已取消";

export type OutboundNotificationRow = {
  id: string;
  customer: string;
  warehouse: string;
  status: OutboundNoticeStatus;
  pickingStatus: "未生成" | "已生成" | "拣货中" | "已完成";
  totalQty: number;
  pickedQty: number;
  shipDate: string;
  carrier: string;
  priority: "高" | "中" | "低";
  owner: string;
  createdAt: string;
  note: string;
};

export type OutboundNotificationLineItem = {
  sku: string;
  name: string;
  spec: string;
  unit: string;
  orderQty: number;
  allocatedQty: number;
  suggestedZone: string;
};

export const outboundNotifications: OutboundNotificationRow[] = [
  {
    id: "SO20260325018",
    customer: "云鲜华东门店",
    warehouse: "上海生鲜仓",
    status: "已下发",
    pickingStatus: "拣货中",
    totalQty: 96,
    pickedQty: 42,
    shipDate: "2026-03-26",
    carrier: "顺丰冷运",
    priority: "高",
    owner: "张计划",
    createdAt: "2026-03-25 18:20:00",
    note: "冷藏品出库，需优先拣货复核。",
  },
  {
    id: "SO20260325019",
    customer: "北京便利渠道",
    warehouse: "北京中转仓",
    status: "待下发",
    pickingStatus: "未生成",
    totalQty: 320,
    pickedQty: 0,
    shipDate: "2026-03-26",
    carrier: "京东物流",
    priority: "中",
    owner: "王计划",
    createdAt: "2026-03-25 18:35:00",
    note: "",
  },
  {
    id: "SO20260325020",
    customer: "广州餐饮客户",
    warehouse: "广州常温仓",
    status: "已下发",
    pickingStatus: "拣货中",
    totalQty: 180,
    pickedQty: 120,
    shipDate: "2026-03-26",
    carrier: "德邦快递",
    priority: "中",
    owner: "刘计划",
    createdAt: "2026-03-25 19:10:00",
    note: "部分商品补货后继续拣货。",
  },
  {
    id: "SO20260325021",
    customer: "武汉直营门店",
    warehouse: "武汉常温仓",
    status: "已出库",
    pickingStatus: "已完成",
    totalQty: 75,
    pickedQty: 75,
    shipDate: "2026-03-26",
    carrier: "中通快运",
    priority: "低",
    owner: "赵计划",
    createdAt: "2026-03-25 17:50:00",
    note: "",
  },
  {
    id: "SO20260325022",
    customer: "杭州冷链客户",
    warehouse: "杭州冷链仓",
    status: "待下发",
    pickingStatus: "未生成",
    totalQty: 210,
    pickedQty: 0,
    shipDate: "2026-03-26",
    carrier: "跨越速运",
    priority: "高",
    owner: "陈计划",
    createdAt: "2026-03-25 19:35:00",
    note: "冷冻商品，发运窗口较短。",
  },
];

export const outboundLineItemsMap: Record<string, OutboundNotificationLineItem[]> = {
  "SO20260325018": [
    { sku: "SKU-10086", name: "冷冻鸡腿排", spec: "2kg/袋", unit: "袋", orderQty: 36, allocatedQty: 36, suggestedZone: "冷藏区A" },
    { sku: "SKU-20012", name: "番茄酱", spec: "1kg/瓶", unit: "瓶", orderQty: 60, allocatedQty: 60, suggestedZone: "冷藏区A" },
  ],
  "SO20260325019": [
    { sku: "SKU-30001", name: "包装纸箱", spec: "500×400×300mm", unit: "个", orderQty: 320, allocatedQty: 320, suggestedZone: "常温区B" },
  ],
  "SO20260325020": [
    { sku: "SKU-40001", name: "生抽酱油", spec: "1.8L/桶", unit: "桶", orderQty: 100, allocatedQty: 100, suggestedZone: "常温区C" },
    { sku: "SKU-40002", name: "陈醋", spec: "500ml/瓶", unit: "瓶", orderQty: 80, allocatedQty: 80, suggestedZone: "常温区C" },
  ],
  "SO20260325021": [
    { sku: "SKU-50001", name: "辣椒酱", spec: "200g/瓶", unit: "瓶", orderQty: 75, allocatedQty: 75, suggestedZone: "常温区D" },
  ],
  "SO20260325022": [
    { sku: "SKU-60001", name: "气泡膜卷材", spec: "50cm×100m", unit: "卷", orderQty: 120, allocatedQty: 120, suggestedZone: "冷冻区A" },
    { sku: "SKU-60002", name: "封箱胶带", spec: "48mm×100m", unit: "卷", orderQty: 90, allocatedQty: 90, suggestedZone: "冷冻区A" },
  ],
};
