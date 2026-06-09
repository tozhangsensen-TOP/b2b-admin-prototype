export type ReceivingTaskRow = {
  id: string;
  inboundNoticeId: string;
  poId: string;
  supplier: string;
  warehouse: string;
  status: ReceivingStatus;
  totalQty: number;
  receivedQty: number;
  createdAt: string;
  owner: string;
  eta: string;
  carrier: string;
  dock: string;
  note: string;
};

export type ReceivingStatus = "待收货" | "收货中" | "部分收货" | "已完成" | "已取消";

export type ReceivingLineItem = {
  sku: string;
  name: string;
  spec: string;
  unit: string;
  notifyQty: number;
  receivedQty: number;
  currentReceiveQty: number;
};

export const receivingTasks: ReceivingTaskRow[] = [
  {
    id: "RC20260325001",
    inboundNoticeId: "RN20260322001",
    poId: "PO20260321001",
    supplier: "华东生鲜原料供应商有限公司",
    warehouse: "上海生鲜仓",
    status: "收货中",
    totalQty: 350,
    receivedQty: 180,
    createdAt: "2026-03-25 08:30:00",
    owner: "李仓管",
    eta: "2026-03-25",
    carrier: "顺丰冷链",
    dock: "D区-3号月台",
    note: "优先卸货，需测温验收",
  },
  {
    id: "RC20260325002",
    inboundNoticeId: "RN20260322002",
    poId: "PO20260321002",
    supplier: "华北包装耗材供应商",
    warehouse: "北京中转仓",
    status: "待收货",
    totalQty: 800,
    receivedQty: 0,
    createdAt: "2026-03-25 09:15:22",
    owner: "王仓库",
    eta: "2026-03-28",
    carrier: "京东物流",
    dock: "A区-1号月台",
    note: "",
  },
  {
    id: "RC20260325003",
    inboundNoticeId: "RN20260322003",
    poId: "PO20260321003",
    supplier: "广州调味品供应商集团",
    warehouse: "广州常温仓",
    status: "部分收货",
    totalQty: 500,
    receivedQty: 260,
    createdAt: "2026-03-25 10:00:45",
    owner: "刘仓管",
    eta: "2026-03-26",
    carrier: "德邦快运",
    dock: "B区-5号月台",
    note: "剩余240件预计明日到货",
  },
  {
    id: "RC20260325004",
    inboundNoticeId: "RN20260322004",
    poId: "PO20260321004",
    supplier: "华中调味料供应商",
    warehouse: "武汉常温仓",
    status: "已完成",
    totalQty: 400,
    receivedQty: 400,
    createdAt: "2026-03-24 14:20:30",
    owner: "赵仓库",
    eta: "2026-03-20",
    carrier: "中通快运",
    dock: "C区-2号月台",
    note: "全部验收完成",
  },
  {
    id: "RC20260325005",
    inboundNoticeId: "RN20260322005",
    poId: "PO20260321005",
    supplier: "苏州包装辅料有限公司",
    warehouse: "杭州冷链仓",
    status: "待收货",
    totalQty: 1200,
    receivedQty: 0,
    createdAt: "2026-03-25 11:05:18",
    owner: "陈仓管",
    eta: "2026-03-30",
    carrier: "冷链专线",
    dock: "D区-5号月台",
    note: "冷链运输，到货后2小时内验收",
  },
  {
    id: "RC20260325006",
    inboundNoticeId: "RN20260322008",
    poId: "PO20260321008",
    supplier: "深圳设备备件供应商",
    warehouse: "深圳设备仓",
    status: "待收货",
    totalQty: 200,
    receivedQty: 0,
    createdAt: "2026-03-25 13:30:42",
    owner: "林仓管",
    eta: "2026-03-29",
    carrier: "顺丰特惠",
    dock: "E区-2号月台",
    note: "设备类需质检后再入库",
  },
  {
    id: "RC20260325007",
    inboundNoticeId: "RN20260322007",
    poId: "PO20260321007",
    supplier: "北京饮品物料服务商",
    warehouse: "北京中转仓",
    status: "已完成",
    totalQty: 950,
    receivedQty: 950,
    createdAt: "2026-03-24 09:00:00",
    owner: "王仓库",
    eta: "2026-03-21",
    carrier: "京东物流",
    dock: "A区-3号月台",
    note: "全部完成上架",
  },
];

export const receivingLineItemsMap: Record<string, ReceivingLineItem[]> = {
  "RC20260325001": [
    { sku: "SKU-10086", name: "冷冻鸡腿排", spec: "2kg/袋", unit: "袋", notifyQty: 120, receivedQty: 60, currentReceiveQty: 60 },
    { sku: "SKU-20012", name: "番茄酱", spec: "1kg/瓶", unit: "瓶", notifyQty: 240, receivedQty: 120, currentReceiveQty: 100 },
  ],
  "RC20260325002": [
    { sku: "SKU-30001", name: "包装纸箱", spec: "500×400×300mm", unit: "个", notifyQty: 800, receivedQty: 0, currentReceiveQty: 0 },
  ],
  "RC20260325003": [
    { sku: "SKU-40001", name: "生抽酱油", spec: "1.8L/桶", unit: "桶", notifyQty: 300, receivedQty: 160, currentReceiveQty: 140 },
    { sku: "SKU-40002", name: "陈醋", spec: "500ml/瓶", unit: "瓶", notifyQty: 200, receivedQty: 100, currentReceiveQty: 80 },
  ],
  "RC20260325004": [
    { sku: "SKU-50001", name: "辣椒酱", spec: "200g/瓶", unit: "瓶", notifyQty: 400, receivedQty: 400, currentReceiveQty: 400 },
  ],
  "RC20260325005": [
    { sku: "SKU-60001", name: "气泡膜卷材", spec: "50cm×100m", unit: "卷", notifyQty: 600, receivedQty: 0, currentReceiveQty: 0 },
    { sku: "SKU-60002", name: "封箱胶带", spec: "48mm×100m", unit: "卷", notifyQty: 600, receivedQty: 0, currentReceiveQty: 0 },
  ],
  "RC20260325006": [
    { sku: "SKU-70001", name: "货架标签打印机", spec: "热敏式", unit: "台", notifyQty: 50, receivedQty: 0, currentReceiveQty: 0 },
    { sku: "SKU-70002", name: "标签纸", spec: "100×80mm", unit: "卷", notifyQty: 150, receivedQty: 0, currentReceiveQty: 0 },
  ],
  "RC20260325007": [
    { sku: "SKU-80001", name: "矿泉水", spec: "550ml×24瓶", unit: "箱", notifyQty: 600, receivedQty: 600, currentReceiveQty: 600 },
    { sku: "SKU-80002", name: "碳酸饮料", spec: "330ml×12罐", unit: "箱", notifyQty: 350, receivedQty: 350, currentReceiveQty: 350 },
  ],
};

export const receivingOperationLogs = [
  { time: "2026-03-25 08:30:00", actor: "李仓管", action: "开始收货", result: "成功", remark: "月台D区-3号位" },
  { time: "2026-03-25 09:45:12", actor: "李仓管", action: "收货确认", result: "部分", remark: "冷冻鸡腿排60袋、番茄酱120瓶已入库" },
];
