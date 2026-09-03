export type PickingStatus = "待拣货" | "拣货中" | "部分拣货" | "已完成" | "已取消";

export type PickingTaskRow = {
  id: string;
  waveNo: string;
  outboundOrderId: string;
  noticeId?: string; // 来源出库通知单（按温层拆分时与 outboundOrderId 不同）
  temperatureZone?: "冷藏" | "冷冻" | "常温";
  warehouse: string;
  zone: string;
  route: string;
  status: PickingStatus;
  totalQty: number;
  pickedQty: number;
  createdAt: string;
  dueAt: string;
  picker: string;
  priority: "高" | "中" | "低";
  carrier: string;
  note: string;
};

export type PickingLineItem = {
  sku: string;
  barcode: string;
  name: string;
  spec: string;
  unit: string;
  batchNo: string;
  sourceLocation: string;
  orderQty: number;
  pickedQty: number;
  currentPickQty: number;
};

export const pickingTasks: PickingTaskRow[] = [
  {
    id: "PK20260326001",
    waveNo: "WV20260326001",
    outboundOrderId: "SO20260325018",
    warehouse: "上海生鲜仓",
    zone: "冷藏区A",
    route: "A01-A04",
    status: "拣货中",
    totalQty: 96,
    pickedQty: 42,
    createdAt: "2026-03-26 09:10:00",
    dueAt: "2026-03-26 11:30:00",
    picker: "李仓管",
    priority: "高",
    carrier: "顺丰冷运",
    note: "冷藏订单，优先复核出库。",
  },
  {
    id: "PK20260326002",
    waveNo: "WV20260326002",
    outboundOrderId: "SO20260325019",
    noticeId: "SO20260325019",
    temperatureZone: "常温",
    warehouse: "北京中转仓",
    zone: "常温区B",
    route: "B03-B06",
    status: "待拣货",
    totalQty: 320,
    pickedQty: 0,
    createdAt: "2026-03-26 09:25:00",
    dueAt: "2026-03-26 14:00:00",
    picker: "王仓库",
    priority: "中",
    carrier: "京东物流",
    note: "",
  },
  {
    id: "PK20260326003",
    waveNo: "WV20260326003",
    outboundOrderId: "SO20260325020",
    warehouse: "广州常温仓",
    zone: "常温区C",
    route: "C01-C03",
    status: "部分拣货",
    totalQty: 180,
    pickedQty: 120,
    createdAt: "2026-03-26 10:15:00",
    dueAt: "2026-03-26 15:30:00",
    picker: "刘仓管",
    priority: "中",
    carrier: "德邦快递",
    note: "剩余商品等待补货后继续拣选。",
  },
  {
    id: "PK20260326004",
    waveNo: "WV20260326004",
    outboundOrderId: "SO20260325021",
    noticeId: "SO20260325021",
    temperatureZone: "常温",
    warehouse: "武汉常温仓",
    zone: "常温区D",
    route: "D01-D02",
    status: "已完成",
    totalQty: 75,
    pickedQty: 75,
    createdAt: "2026-03-26 08:40:00",
    dueAt: "2026-03-26 12:00:00",
    picker: "赵仓库",
    priority: "低",
    carrier: "中通快运",
    note: "",
  },
  {
    id: "PK20260326005",
    waveNo: "WV20260326005",
    outboundOrderId: "SO20260325022",
    warehouse: "杭州冷链仓",
    zone: "冷冻区A",
    route: "F01-F04",
    status: "待拣货",
    totalQty: 210,
    pickedQty: 0,
    createdAt: "2026-03-26 10:45:00",
    dueAt: "2026-03-26 13:20:00",
    picker: "陈仓管",
    priority: "高",
    carrier: "跨越速运",
    note: "冷冻商品，拣货后需快速交接复核台。",
  },
  {
    id: "PK20260326006",
    waveNo: "WV20260326006",
    outboundOrderId: "SO20260325023",
    warehouse: "深圳设备仓",
    zone: "设备区A",
    route: "E01-E02",
    status: "待拣货",
    totalQty: 64,
    pickedQty: 0,
    createdAt: "2026-03-26 11:00:00",
    dueAt: "2026-03-26 17:00:00",
    picker: "林仓管",
    priority: "低",
    carrier: "顺丰标快",
    note: "设备类商品需核对序列号。",
  },
];

export const pickingLineItemsMap: Record<string, PickingLineItem[]> = {
  "PK20260326001": [
    { sku: "SKU-10086", barcode: "6901008600012", name: "冷冻鸡腿排", spec: "2kg/袋", unit: "袋", batchNo: "B20260301", sourceLocation: "冷藏A-01-03", orderQty: 36, pickedQty: 18, currentPickQty: 18 },
    { sku: "SKU-20012", barcode: "6902001200091", name: "番茄酱", spec: "1kg/瓶", unit: "瓶", batchNo: "B20260218", sourceLocation: "冷藏A-02-05", orderQty: 60, pickedQty: 24, currentPickQty: 18 },
  ],
  "PK20260326002": [
    { sku: "SKU-30001", barcode: "6903000100023", name: "包装纸箱", spec: "500×400×300mm", unit: "个", batchNo: "B20260320", sourceLocation: "常温B-03-01", orderQty: 320, pickedQty: 0, currentPickQty: 0 },
  ],
  "PK20260326003": [
    { sku: "SKU-40001", barcode: "6904000100065", name: "生抽酱油", spec: "1.8L/桶", unit: "桶", batchNo: "B20260112", sourceLocation: "常温C-01-04", orderQty: 100, pickedQty: 80, currentPickQty: 20 },
    { sku: "SKU-40002", barcode: "6904000200031", name: "陈醋", spec: "500ml/瓶", unit: "瓶", batchNo: "B20260202", sourceLocation: "常温C-02-02", orderQty: 80, pickedQty: 40, currentPickQty: 20 },
  ],
  "PK20260326004": [
    { sku: "SKU-50001", barcode: "6905000100082", name: "辣椒酱", spec: "200g/瓶", unit: "瓶", batchNo: "B20260128", sourceLocation: "常温D-01-06", orderQty: 75, pickedQty: 75, currentPickQty: 75 },
  ],
  "PK20260326005": [
    { sku: "SKU-60001", barcode: "6906000100016", name: "气泡膜卷材", spec: "50cm×100m", unit: "卷", batchNo: "B20260308", sourceLocation: "冷冻A-01-01", orderQty: 120, pickedQty: 0, currentPickQty: 0 },
    { sku: "SKU-60002", barcode: "6906000200044", name: "封箱胶带", spec: "48mm×100m", unit: "卷", batchNo: "B20260309", sourceLocation: "冷冻A-02-03", orderQty: 90, pickedQty: 0, currentPickQty: 0 },
  ],
  "PK20260326006": [
    { sku: "SKU-70001", barcode: "6907000100051", name: "货架标签打印机", spec: "热敏式", unit: "台", batchNo: "B20260216", sourceLocation: "设备A-01-01", orderQty: 24, pickedQty: 0, currentPickQty: 0 },
    { sku: "SKU-70002", barcode: "6907000200075", name: "标签纸", spec: "100×80mm", unit: "卷", batchNo: "B20260311", sourceLocation: "设备A-01-02", orderQty: 40, pickedQty: 0, currentPickQty: 0 },
  ],
};

/* 动态写入拣货明细（原型用：按温层拆分下发生成的新任务） */
export function appendPickingLines(entries: Record<string, PickingLineItem[]>) {
  Object.assign(pickingLineItemsMap, entries);
}
