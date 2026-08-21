/**
 * 调拨作业 — 合并拣货 + 批次追溯
 *
 * 同一 SKU 可能分布在多个库位、不同批次，
 * 叉车司机按库位逐批下架，每次下架时指定该批次的货分到各仓的数量。
 *
 * 例：
 *   高筋面粉 1000 袋 → A仓300 B仓400 C仓300
 *
 *   库位 A-03-02-01 | 批次 B01 | 600袋
 *     → 下架 600，分播 A200 B200 C200
 *   库位 A-03-02-02 | 批次 B02 | 400袋
 *     → 下架 400，分播 A100 B200 C100
 *   ──────────────────────────────
 *   合计：A300 B400 C300 ✓
 *
 *   可追溯：A仓 300 = B01批次200 + B02批次100
 *           B仓 400 = B01批次200 + B02批次200
 *           C仓 300 = B01批次200 + B02批次100
 */

export type TransferOrderStatus = "待合并" | "已合并" | "执行中" | "已完成";
export type TaskStatus =
  | "待领取"
  | "下架中"
  | "分播中"
  | "待发运"
  | "已完成";

/* ────────── 调拨单 ────────── */
export type TransferOrderRow = {
  id: string;
  sourceWarehouse: string;
  targetWarehouse: string;
  sku: string;
  skuName: string;
  batchNo: string;
  plannedQty: number;
  unit: string;
  priority: "高" | "中" | "低";
  requiredArrival: string;
  status: TransferOrderStatus;
};

/* ────────── 库位批次（来源） ────────── */
export type PickLocation = {
  location: string;
  batchNo: string;
  availableQty: number;
  pickedQty: number;
};

/* ────────── 分播目标（需求） ────────── */
export type TaskDestination = {
  targetWarehouse: string;
  orderId: string;
  plannedQty: number;
  /** 来自各批次的累计 */
  sortedQty: number;
};

/* ────────── 单次下架记录（追溯原始凭证） ────────── */
export type PickRecord = {
  id: string;
  location: string;
  batchNo: string;
  qty: number;
  /** 这次下的货分别分到了哪些仓 */
  allocations: { targetWarehouse: string; qty: number }[];
};

/* ────────── 合并任务 ────────── */
export type CombinedTask = {
  id: string;
  taskNo: string;
  sourceWarehouse: string;
  sku: string;
  skuName: string;
  unit: string;
  /** 多个库位批次来源 */
  pickLocations: PickLocation[];
  /** 分播需求目标 */
  destinations: TaskDestination[];
  /** 下架历史记录（可追溯） */
  pickRecords: PickRecord[];
  forkliftDriver: string;
  status: TaskStatus;
  totalQty: number;
  pickedQty: number;
  progress: number;
};

/* ────────── 调拨单数据 ────────── */

export const transferOrders: TransferOrderRow[] = [
  {
    id: "TR20260716001",
    sourceWarehouse: "整合仓-上海",
    targetWarehouse: "配送仓-A仓",
    sku: "SKU-FM-001",
    skuName: "高筋面粉 25kg/袋",
    batchNo: "B20260711",
    plannedQty: 300,
    unit: "袋",
    priority: "高",
    requiredArrival: "2026-07-16 18:00",
    status: "待合并",
  },
  {
    id: "TR20260716002",
    sourceWarehouse: "整合仓-上海",
    targetWarehouse: "配送仓-B仓",
    sku: "SKU-FM-001",
    skuName: "高筋面粉 25kg/袋",
    batchNo: "B20260711",
    plannedQty: 400,
    unit: "袋",
    priority: "高",
    requiredArrival: "2026-07-16 18:00",
    status: "待合并",
  },
  {
    id: "TR20260716003",
    sourceWarehouse: "整合仓-上海",
    targetWarehouse: "配送仓-C仓",
    sku: "SKU-FM-001",
    skuName: "高筋面粉 25kg/袋",
    batchNo: "B20260711",
    plannedQty: 300,
    unit: "袋",
    priority: "中",
    requiredArrival: "2026-07-16 20:00",
    status: "待合并",
  },
  {
    id: "TR20260716004",
    sourceWarehouse: "整合仓-上海",
    targetWarehouse: "配送仓-A仓",
    sku: "SKU-VD-10031",
    skuName: "轻奢餐椅-胡桃木",
    batchNo: "B20260709",
    plannedQty: 120,
    unit: "箱",
    priority: "中",
    requiredArrival: "2026-07-17 10:00",
    status: "待合并",
  },
];

/* ────────── 执行中 / 已完成任务 ────────── */

export const combinedTasks: CombinedTask[] = [
  {
    id: "CT20260716001",
    taskNo: "CT-面粉-20260716-01",
    sourceWarehouse: "整合仓-上海",
    sku: "SKU-FM-001",
    skuName: "高筋面粉 25kg/袋",
    unit: "袋",
    /* 两个库位，不同批次 */
    pickLocations: [
      { location: "A-03-02-01", batchNo: "B20260711", availableQty: 600, pickedQty: 600 },
      { location: "A-03-02-02", batchNo: "B20260712", availableQty: 400, pickedQty: 300 },
    ],
    destinations: [
      { targetWarehouse: "配送仓-A仓", orderId: "TR20260716001", plannedQty: 300, sortedQty: 200 },
      { targetWarehouse: "配送仓-B仓", orderId: "TR20260716002", plannedQty: 400, sortedQty: 150 },
      { targetWarehouse: "配送仓-C仓", orderId: "TR20260716003", plannedQty: 300, sortedQty: 80 },
    ],
    pickRecords: [
      {
        id: "PICK-001",
        location: "A-03-02-01",
        batchNo: "B20260711",
        qty: 300,
        allocations: [
          { targetWarehouse: "配送仓-A仓", qty: 200 },
          { targetWarehouse: "配送仓-B仓", qty: 100 },
        ],
      },
      {
        id: "PICK-002",
        location: "A-03-02-02",
        batchNo: "B20260712",
        qty: 200,
        allocations: [
          { targetWarehouse: "配送仓-B仓", qty: 50 },
          { targetWarehouse: "配送仓-C仓", qty: 80 },
          { targetWarehouse: "配送仓-A仓", qty: 70 },
        ],
      },
      {
        id: "PICK-003",
        location: "A-03-02-01",
        batchNo: "B20260711",
        qty: 300,
        allocations: [
          { targetWarehouse: "配送仓-B仓", qty: 200 },
          { targetWarehouse: "配送仓-C仓", qty: 100 },
        ],
      },
    ],
    forkliftDriver: "刘海峰",
    status: "分播中",
    totalQty: 1000,
    pickedQty: 900,
    progress: 43,
  },
  {
    id: "CT20260716002",
    taskNo: "CT-餐椅-A-20260716-001",
    sourceWarehouse: "整合仓-上海",
    sku: "SKU-VD-10031",
    skuName: "轻奢餐椅-胡桃木",
    unit: "箱",
    pickLocations: [
      { location: "B-01-03-05", batchNo: "B20260709", availableQty: 120, pickedQty: 60 },
    ],
    destinations: [
      { targetWarehouse: "配送仓-A仓", orderId: "TR20260716004", plannedQty: 120, sortedQty: 60 },
    ],
    pickRecords: [
      {
        id: "PICK-004",
        location: "B-01-03-05",
        batchNo: "B20260709",
        qty: 60,
        allocations: [
          { targetWarehouse: "配送仓-A仓", qty: 60 },
        ],
      },
    ],
    forkliftDriver: "陈伟",
    status: "下架中",
    totalQty: 120,
    pickedQty: 60,
    progress: 50,
  },
];

/* ────────── 库位索引 ────────── */

export const skuLocationMap: Record<string, string> = {
  "SKU-FM-001": "A-03-02-01 / A-03-02-02（多库位）",
  "SKU-VD-10031": "B-01-03-05",
  "SKU-VD-10058": "A-04-01-03",
};

/* ────────── 合并逻辑 ────────── */

export function suggestCombinedTasks(orders: TransferOrderRow[]) {
  const groups = new Map<string, TransferOrderRow[]>();
  for (const o of orders) {
    if (o.status !== "待合并") continue;
    const key = `${o.sku}|${o.batchNo}`;
    const list = groups.get(key) ?? [];
    list.push(o);
    groups.set(key, list);
  }

  const tasks: {
    sku: string;
    skuName: string;
    batchNo: string;
    location: string;
    totalQty: number;
    unit: string;
    destinations: { targetWarehouse: string; orderId: string; qty: number }[];
    orderCount: number;
  }[] = [];

  for (const [, group] of groups) {
    const first = group[0];
    tasks.push({
      sku: first.sku,
      skuName: first.skuName,
      batchNo: first.batchNo,
      location: skuLocationMap[first.sku] ?? "-",
      totalQty: group.reduce((s, o) => s + o.plannedQty, 0),
      unit: first.unit,
      destinations: group.map((o) => ({
        targetWarehouse: o.targetWarehouse,
        orderId: o.id,
        qty: o.plannedQty,
      })),
      orderCount: group.length,
    });
  }

  return { tasks };
}
