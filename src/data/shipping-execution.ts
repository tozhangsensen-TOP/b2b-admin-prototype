export type ShippingStatus = "待复核" | "复核中" | "待交接" | "已发运" | "异常";

export type ShippingExecutionRow = {
  id: string;
  outboundOrderId: string;
  pickingTaskId: string;
  customer: string;
  warehouse: string;
  status: ShippingStatus;
  packageCount: number;
  totalQty: number;
  checkedQty: number;
  carrier: string;
  trackingNo: string;
  reviewer: string;
  dock: string;
  planShipAt: string;
  priority: "高" | "中" | "低";
  exceptionReason?: string;
};

export type ShippingLineItem = {
  sku: string;
  barcode: string;
  name: string;
  unit: string;
  pickedQty: number;
  checkedQty: number;
  currentCheckQty: number;
  packageNo: string;
};

export const shippingTasks: ShippingExecutionRow[] = [
  {
    id: "SH20260326001",
    outboundOrderId: "SO20260325018",
    pickingTaskId: "PK20260326001",
    customer: "云鲜华东门店",
    warehouse: "上海生鲜仓",
    status: "复核中",
    packageCount: 3,
    totalQty: 96,
    checkedQty: 42,
    carrier: "顺丰冷运",
    trackingNo: "SF-COLD-26001",
    reviewer: "复核员A",
    dock: "冷链月台-02",
    planShipAt: "2026-03-26 12:00:00",
    priority: "高",
  },
  {
    id: "SH20260326002",
    outboundOrderId: "SO20260325020",
    pickingTaskId: "PK20260326003",
    customer: "广州餐饮客户",
    warehouse: "广州常温仓",
    status: "待复核",
    packageCount: 5,
    totalQty: 180,
    checkedQty: 0,
    carrier: "德邦快递",
    trackingNo: "DB-26002",
    reviewer: "待分配",
    dock: "常温月台-05",
    planShipAt: "2026-03-26 16:00:00",
    priority: "中",
  },
  {
    id: "SH20260326003",
    outboundOrderId: "SO20260325021",
    pickingTaskId: "PK20260326004",
    customer: "武汉直营门店",
    warehouse: "武汉常温仓",
    status: "已发运",
    packageCount: 2,
    totalQty: 75,
    checkedQty: 75,
    carrier: "中通快运",
    trackingNo: "ZT-26003",
    reviewer: "赵复核",
    dock: "常温月台-01",
    planShipAt: "2026-03-26 12:30:00",
    priority: "低",
  },
  {
    id: "SH20260326004",
    outboundOrderId: "SO20260325022",
    pickingTaskId: "PK20260326005",
    customer: "杭州冷链客户",
    warehouse: "杭州冷链仓",
    status: "异常",
    packageCount: 4,
    totalQty: 210,
    checkedQty: 0,
    carrier: "跨越速运",
    trackingNo: "KY-26004",
    reviewer: "陈复核",
    dock: "冷链月台-01",
    planShipAt: "2026-03-26 13:30:00",
    priority: "高",
    exceptionReason: "拣货未完成，暂不可复核。",
  },
];

export const shippingLineItemsMap: Record<string, ShippingLineItem[]> = {
  "SH20260326001": [
    { sku: "SKU-10086", barcode: "6901008600012", name: "冷冻鸡腿排", unit: "袋", pickedQty: 36, checkedQty: 18, currentCheckQty: 18, packageNo: "PKG-001" },
    { sku: "SKU-20012", barcode: "6902001200091", name: "番茄酱", unit: "瓶", pickedQty: 60, checkedQty: 24, currentCheckQty: 18, packageNo: "PKG-002" },
  ],
  "SH20260326002": [
    { sku: "SKU-40001", barcode: "6904000100065", name: "生抽酱油", unit: "桶", pickedQty: 100, checkedQty: 0, currentCheckQty: 0, packageNo: "PKG-003" },
    { sku: "SKU-40002", barcode: "6904000200031", name: "陈醋", unit: "瓶", pickedQty: 80, checkedQty: 0, currentCheckQty: 0, packageNo: "PKG-004" },
  ],
  "SH20260326003": [
    { sku: "SKU-50001", barcode: "6905000100082", name: "辣椒酱", unit: "瓶", pickedQty: 75, checkedQty: 75, currentCheckQty: 0, packageNo: "PKG-005" },
  ],
  "SH20260326004": [
    { sku: "SKU-60001", barcode: "6906000100016", name: "气泡膜卷材", unit: "卷", pickedQty: 0, checkedQty: 0, currentCheckQty: 0, packageNo: "PKG-006" },
    { sku: "SKU-60002", barcode: "6906000200044", name: "封箱胶带", unit: "卷", pickedQty: 0, checkedQty: 0, currentCheckQty: 0, packageNo: "PKG-007" },
  ],
};
