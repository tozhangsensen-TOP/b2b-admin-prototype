export type StocktakingStatus = "待盘点" | "盘点中" | "待复盘" | "已完成" | "已取消";

export type StocktakingTaskRow = {
  id: string;
  planName: string;
  warehouse: string;
  zone: string;
  type: "全盘" | "动碰盘" | "循环盘点";
  status: StocktakingStatus;
  skuCount: number;
  bookQty: number;
  countedQty: number;
  differenceQty: number;
  owner: string;
  planDate: string;
  createdAt: string;
  note: string;
};

export type StocktakingLineItem = {
  sku: string;
  name: string;
  location: string;
  lotNo: string;
  unit: string;
  bookQty: number;
  firstCountQty: number;
  recountQty?: number;
  reason: "无差异" | "少货" | "多货" | "破损" | "库位错误";
};

export const stocktakingTasks: StocktakingTaskRow[] = [
  {
    id: "ST20260326001",
    planName: "上海冷藏区日循环盘点",
    warehouse: "上海生鲜仓",
    zone: "冷藏区A",
    type: "循环盘点",
    status: "盘点中",
    skuCount: 12,
    bookQty: 1280,
    countedQty: 760,
    differenceQty: -4,
    owner: "李仓管",
    planDate: "2026-03-26",
    createdAt: "2026-03-26 08:30:00",
    note: "覆盖高动销冷藏品。",
  },
  {
    id: "ST20260326002",
    planName: "北京常温区动碰盘",
    warehouse: "北京中转仓",
    zone: "常温区B",
    type: "动碰盘",
    status: "待盘点",
    skuCount: 8,
    bookQty: 2260,
    countedQty: 0,
    differenceQty: 0,
    owner: "王仓库",
    planDate: "2026-03-26",
    createdAt: "2026-03-26 09:00:00",
    note: "拣货完成后执行。",
  },
  {
    id: "ST20260326003",
    planName: "广州常温差异复盘",
    warehouse: "广州常温仓",
    zone: "常温区C",
    type: "循环盘点",
    status: "待复盘",
    skuCount: 5,
    bookQty: 900,
    countedQty: 884,
    differenceQty: -16,
    owner: "刘仓管",
    planDate: "2026-03-26",
    createdAt: "2026-03-26 09:40:00",
    note: "差异超过阈值，需二次复盘。",
  },
  {
    id: "ST20260325001",
    planName: "武汉常温月度抽盘",
    warehouse: "武汉常温仓",
    zone: "常温区D",
    type: "循环盘点",
    status: "已完成",
    skuCount: 10,
    bookQty: 1500,
    countedQty: 1500,
    differenceQty: 0,
    owner: "赵仓库",
    planDate: "2026-03-25",
    createdAt: "2026-03-25 10:00:00",
    note: "",
  },
];

export const stocktakingLineItemsMap: Record<string, StocktakingLineItem[]> = {
  "ST20260326001": [
    { sku: "SKU-10086", name: "冷冻鸡腿排", location: "冷藏A-01-03", lotNo: "B20260301", unit: "袋", bookQty: 320, firstCountQty: 318, reason: "少货" },
    { sku: "SKU-20012", name: "番茄酱", location: "冷藏A-02-05", lotNo: "B20260218", unit: "瓶", bookQty: 460, firstCountQty: 458, reason: "少货" },
    { sku: "SKU-80001", name: "矿泉水", location: "冷藏A-03-02", lotNo: "B20260308", unit: "箱", bookQty: 500, firstCountQty: 500, reason: "无差异" },
  ],
  "ST20260326002": [
    { sku: "SKU-30001", name: "包装纸箱", location: "常温B-03-01", lotNo: "B20260320", unit: "个", bookQty: 1200, firstCountQty: 0, reason: "无差异" },
    { sku: "SKU-80002", name: "碳酸饮料", location: "常温B-05-02", lotNo: "B20260310", unit: "箱", bookQty: 1060, firstCountQty: 0, reason: "无差异" },
  ],
  "ST20260326003": [
    { sku: "SKU-40001", name: "生抽酱油", location: "常温C-01-04", lotNo: "B20260112", unit: "桶", bookQty: 520, firstCountQty: 512, recountQty: 512, reason: "少货" },
    { sku: "SKU-40002", name: "陈醋", location: "常温C-02-02", lotNo: "B20260202", unit: "瓶", bookQty: 380, firstCountQty: 372, recountQty: 372, reason: "少货" },
  ],
  "ST20260325001": [
    { sku: "SKU-50001", name: "辣椒酱", location: "常温D-01-06", lotNo: "B20260128", unit: "瓶", bookQty: 1500, firstCountQty: 1500, reason: "无差异" },
  ],
};
