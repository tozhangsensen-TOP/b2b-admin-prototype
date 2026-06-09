export type PutawayStatus = "待上架" | "上架中" | "部分上架" | "已完成" | "已取消";

export type PutawayTaskRow = {
  id: string;
  receivingId: string;
  inboundNoticeId: string;
  warehouse: string;
  zone: string;
  status: PutawayStatus;
  totalQty: number;
  putawayQty: number;
  createdAt: string;
  owner: string;
  priority: "高" | "中" | "低";
  note: string;
};

export type PutawayLineItem = {
  sku: string;
  name: string;
  spec: string;
  unit: string;
  notifyQty: number;
  putawayQty: number;
  currentPutawayQty: number;
  targetLocation: string;
};

export const putawayTasks: PutawayTaskRow[] = [
  {
    id: "PA20260325001",
    receivingId: "RC20260325001",
    inboundNoticeId: "RN20260322001",
    warehouse: "上海生鲜仓",
    zone: "冷藏区A",
    status: "上架中",
    totalQty: 180,
    putawayQty: 90,
    createdAt: "2026-03-25 10:30:00",
    owner: "李仓管",
    priority: "高",
    note: "生鲜品优先上架，剩余90件待处理",
  },
  {
    id: "PA20260325002",
    receivingId: "RC20260325002",
    inboundNoticeId: "RN20260322002",
    warehouse: "北京中转仓",
    zone: "常温区B",
    status: "待上架",
    totalQty: 800,
    putawayQty: 0,
    createdAt: "2026-03-25 11:00:00",
    owner: "王仓库",
    priority: "中",
    note: "",
  },
  {
    id: "PA20260325003",
    receivingId: "RC20260325003",
    inboundNoticeId: "RN20260322003",
    warehouse: "广州常温仓",
    zone: "常温区C",
    status: "部分上架",
    totalQty: 260,
    putawayQty: 160,
    createdAt: "2026-03-25 13:20:00",
    owner: "刘仓管",
    priority: "中",
    note: "剩余100件明日上架",
  },
  {
    id: "PA20260325004",
    receivingId: "RC20260325004",
    inboundNoticeId: "RN20260322004",
    warehouse: "武汉常温仓",
    zone: "常温区D",
    status: "已完成",
    totalQty: 400,
    putawayQty: 400,
    createdAt: "2026-03-24 15:00:00",
    owner: "赵仓库",
    priority: "低",
    note: "",
  },
  {
    id: "PA20260325005",
    receivingId: "RC20260325005",
    inboundNoticeId: "RN20260322005",
    warehouse: "杭州冷链仓",
    zone: "冷冻区A",
    status: "待上架",
    totalQty: 1200,
    putawayQty: 0,
    createdAt: "2026-03-25 14:10:00",
    owner: "陈仓管",
    priority: "高",
    note: "冷链品需2小时内完成上架",
  },
  {
    id: "PA20260325006",
    receivingId: "RC20260325006",
    inboundNoticeId: "RN20260322008",
    warehouse: "深圳设备仓",
    zone: "设备区A",
    status: "待上架",
    totalQty: 200,
    putawayQty: 0,
    createdAt: "2026-03-25 15:30:00",
    owner: "林仓管",
    priority: "低",
    note: "设备品需质检确认后再上架",
  },
  {
    id: "PA20260325007",
    receivingId: "RC20260325007",
    inboundNoticeId: "RN20260322007",
    warehouse: "北京中转仓",
    zone: "常温区B",
    status: "已完成",
    totalQty: 950,
    putawayQty: 950,
    createdAt: "2026-03-24 16:20:00",
    owner: "王仓库",
    priority: "中",
    note: "",
  },
];

export const putawayLineItemsMap: Record<string, PutawayLineItem[]> = {
  "PA20260325001": [
    { sku: "SKU-10086", name: "冷冻鸡腿排", spec: "2kg/袋", unit: "袋", notifyQty: 60, putawayQty: 30, currentPutawayQty: 30, targetLocation: "冷藏A-01-03" },
    { sku: "SKU-20012", name: "番茄酱", spec: "1kg/瓶", unit: "瓶", notifyQty: 120, putawayQty: 60, currentPutawayQty: 60, targetLocation: "冷藏A-02-05" },
  ],
  "PA20260325002": [
    { sku: "SKU-30001", name: "包装纸箱", spec: "500×400×300mm", unit: "个", notifyQty: 800, putawayQty: 0, currentPutawayQty: 0, targetLocation: "常温B-03-01" },
  ],
  "PA20260325003": [
    { sku: "SKU-40001", name: "生抽酱油", spec: "1.8L/桶", unit: "桶", notifyQty: 160, putawayQty: 100, currentPutawayQty: 60, targetLocation: "常温C-01-04" },
    { sku: "SKU-40002", name: "陈醋", spec: "500ml/瓶", unit: "瓶", notifyQty: 100, putawayQty: 60, currentPutawayQty: 40, targetLocation: "常温C-02-02" },
  ],
  "PA20260325004": [
    { sku: "SKU-50001", name: "辣椒酱", spec: "200g/瓶", unit: "瓶", notifyQty: 400, putawayQty: 400, currentPutawayQty: 400, targetLocation: "常温D-01-06" },
  ],
  "PA20260325005": [
    { sku: "SKU-60001", name: "气泡膜卷材", spec: "50cm×100m", unit: "卷", notifyQty: 600, putawayQty: 0, currentPutawayQty: 0, targetLocation: "冷冻A-01-01" },
    { sku: "SKU-60002", name: "封箱胶带", spec: "48mm×100m", unit: "卷", notifyQty: 600, putawayQty: 0, currentPutawayQty: 0, targetLocation: "冷冻A-02-03" },
  ],
  "PA20260325006": [
    { sku: "SKU-70001", name: "货架标签打印机", spec: "热敏式", unit: "台", notifyQty: 50, putawayQty: 0, currentPutawayQty: 0, targetLocation: "设备A-01-01" },
    { sku: "SKU-70002", name: "标签纸", spec: "100×80mm", unit: "卷", notifyQty: 150, putawayQty: 0, currentPutawayQty: 0, targetLocation: "设备A-01-02" },
  ],
  "PA20260325007": [
    { sku: "SKU-80001", name: "矿泉水", spec: "550ml×24瓶", unit: "箱", notifyQty: 600, putawayQty: 600, currentPutawayQty: 600, targetLocation: "常温B-05-01" },
    { sku: "SKU-80002", name: "碳酸饮料", spec: "330ml×12罐", unit: "箱", notifyQty: 350, putawayQty: 350, currentPutawayQty: 350, targetLocation: "常温B-05-02" },
  ],
};
