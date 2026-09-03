/**
 * 调拨拣货（零散干货）—— 合单 / 合车 / 波次 / 双人两端协同
 *
 * 业务模型：
 *  - 调拨单按规则【合单】(同SKU/批次/目标仓) → 进入【波次】 → 按【合车数】打包成【车次】
 *  - 一个车次下挂多个调拨拣货任务，每个任务两端并行：
 *      · 叉车端（司机）：负责货品下架
 *      · 分拣端（分拣员）：跟随下架同步搬货分拣 / 播种
 *  - 拣货模式：车统后按店播种 / 车统边拣边播 / 直接SKU播种
 *  - 领取规则：按车 / 按波次合单领取，领取顺序可选，PC端可指派
 */

export type PickMode = "车统后按店播种" | "车统边拣边播" | "直接SKU播种";
export type ClaimDimension = "按车" | "按波次";
export type ClaimOrder = "先到先得" | "按优先级" | "按线路";
export type MergeDimension = "按SKU" | "按SKU+批次" | "按目标仓";
export type VehicleDimension = "按波次" | "按线路";
export type WaveMode = "按时间窗" | "按单量";

export type TransferPickingRule = {
  /* 合单 */
  mergeEnabled: boolean;
  mergeDimension: MergeDimension;
  autoMergeThreshold: number; // 单量达到自动合并下单
  manualMergeSelect: boolean; // 保留手动选择合并范围
  /* 合车 */
  vehicleEnabled: boolean;
  vehicleCapacity: number; // 合车数上限（每车最大任务/单数）
  vehicleDimension: VehicleDimension;
  autoGenerateOnFull: boolean; // 满车自动生成车次
  /* 波次 */
  waveEnabled: boolean;
  waveMode: WaveMode;
  waveValue: number; // 分钟数 or 单数
  /* 拣货 */
  defaultPickMode: PickMode;
  dualPersonCollab: boolean; // 双人两端协同
  /* 领取 */
  claimDimension: ClaimDimension;
  claimOrder: ClaimOrder;
  pcAssign: boolean;
};

export const defaultRule: TransferPickingRule = {
  mergeEnabled: true,
  mergeDimension: "按SKU+批次",
  autoMergeThreshold: 3,
  manualMergeSelect: true,
  vehicleEnabled: true,
  vehicleCapacity: 4,
  vehicleDimension: "按波次",
  autoGenerateOnFull: true,
  waveEnabled: true,
  waveMode: "按时间窗",
  waveValue: 30,
  defaultPickMode: "车统边拣边播",
  dualPersonCollab: true,
  claimDimension: "按车",
  claimOrder: "按优先级",
  pcAssign: true,
};

/* 模块级可变规则store（原型用，两页共享） */
let currentRule: TransferPickingRule = { ...defaultRule };
export function getRule(): TransferPickingRule {
  return currentRule;
}
export function setRule(next: TransferPickingRule) {
  currentRule = { ...next };
}

/* ────────── 双人两端任务 ────────── */

export type ForkliftEndStatus = "待下架" | "下架中" | "已下架";
export type SorterEndStatus = "待播种" | "播种中" | "已播种";
export type TaskStatus = "待领取" | "进行中" | "部分完成" | "已完成";

export type ForkliftLine = {
  location: string;
  batchNo: string;
  sku: string;
  skuName: string;
  planned: number;
  picked: number;
  status: ForkliftEndStatus;
};

export type SorterLine = {
  dest: string; // 目标仓/店
  store?: string; // 店（按店播种时）
  batchNo: string; // 批次来源
  sku: string;
  skuName: string;
  planned: number;
  sorted: number;
  status: SorterEndStatus;
};

export type TransferPickingTask = {
  id: string;
  taskNo: string;
  waveNo: string;
  vehicleNo: string;
  pickMode: PickMode;
  priority: "高" | "中" | "低";
  forkliftDriver: string;
  sorter: string;
  forkliftLines: ForkliftLine[];
  sorterLines: SorterLine[];
  status: TaskStatus;
  totalQty: number;
};

export type Wave = {
  waveNo: string;
  vehicleCount: number;
  taskCount: number;
  status: "待领取" | "进行中" | "已完成";
  priority: "高" | "中" | "低";
};

export type Vehicle = {
  vehicleNo: string;
  waveNo: string;
  driver?: string;
  taskCount: number;
  status: "待领取" | "进行中" | "已完成";
};

/* ────────── 人员 ────────── */

export const forkliftDrivers = [
  { label: "刘海峰 / 叉车司机", value: "刘海峰" },
  { label: "陈伟 / 叉车司机", value: "陈伟" },
  { label: "王强 / 叉车司机", value: "王强" },
];
export const sorters = [
  { label: "李娜 / 分拣员", value: "李娜" },
  { label: "赵敏 / 分拣员", value: "赵敏" },
  { label: "孙杰 / 分拣员", value: "孙杰" },
];

/* ────────── mock 数据 ────────── */

export const waves: Wave[] = [
  { waveNo: "BC0123123132", vehicleCount: 2, taskCount: 4, status: "进行中", priority: "高" },
  { waveNo: "BC1034567890", vehicleCount: 1, taskCount: 2, status: "待领取", priority: "中" },
  { waveNo: "BC9876543210", vehicleCount: 1, taskCount: 1, status: "待领取", priority: "低" },
];

export const vehicles: Vehicle[] = [
  { vehicleNo: "VC001", waveNo: "BC0123123132", driver: "刘海峰", taskCount: 2, status: "进行中" },
  { vehicleNo: "VC002", waveNo: "BC0123123132", driver: "陈伟", taskCount: 2, status: "进行中" },
  { vehicleNo: "VC003", waveNo: "BC1034567890", taskCount: 2, status: "待领取" },
  { vehicleNo: "VC004", waveNo: "BC9876543210", taskCount: 1, status: "待领取" },
];

export const transferPickingTasks: TransferPickingTask[] = [
  {
    id: "TP20260806001",
    taskNo: "TP-BC0123123132-001",
    waveNo: "BC0123123132",
    vehicleNo: "VC001",
    pickMode: "车统边拣边播",
    priority: "高",
    forkliftDriver: "刘海峰",
    sorter: "李娜",
    totalQty: 1000,
    status: "进行中",
    forkliftLines: [
      { location: "A-03-02-01", batchNo: "B20260803", sku: "SKU-FM-001", skuName: "高筋面粉 25kg", planned: 600, picked: 600, status: "已下架" },
      { location: "A-03-02-02", batchNo: "B20260804", sku: "SKU-FM-001", skuName: "高筋面粉 25kg", planned: 400, picked: 200, status: "下架中" },
    ],
    sorterLines: [
      { dest: "配送仓-A仓", store: "A店", batchNo: "B20260803", sku: "SKU-FM-001", skuName: "高筋面粉 25kg", planned: 200, sorted: 180, status: "播种中" },
      { dest: "配送仓-A仓", store: "A店", batchNo: "B20260804", sku: "SKU-FM-001", skuName: "高筋面粉 25kg", planned: 100, sorted: 80, status: "播种中" },
      { dest: "配送仓-B仓", store: "B店", batchNo: "B20260803", sku: "SKU-FM-001", skuName: "高筋面粉 25kg", planned: 240, sorted: 120, status: "播种中" },
      { dest: "配送仓-B仓", store: "B店", batchNo: "B20260804", sku: "SKU-FM-001", skuName: "高筋面粉 25kg", planned: 160, sorted: 60, status: "播种中" },
      { dest: "配送仓-C仓", store: "C店", batchNo: "B20260803", sku: "SKU-FM-001", skuName: "高筋面粉 25kg", planned: 160, sorted: 50, status: "播种中" },
      { dest: "配送仓-C仓", store: "C店", batchNo: "B20260804", sku: "SKU-FM-001", skuName: "高筋面粉 25kg", planned: 140, sorted: 30, status: "播种中" },
    ],
  },
  {
    id: "TP20260806002",
    taskNo: "TP-BC0123123132-002",
    waveNo: "BC0123123132",
    vehicleNo: "VC001",
    pickMode: "车统后按店播种",
    priority: "高",
    forkliftDriver: "刘海峰",
    sorter: "李娜",
    totalQty: 240,
    status: "部分完成",
    forkliftLines: [
      { location: "A-05-01-03", batchNo: "B20260801", sku: "SKU-SG-200", skuName: "白砂糖 50kg", planned: 240, picked: 240, status: "已下架" },
    ],
    sorterLines: [
      { dest: "配送仓-A仓", store: "A店", batchNo: "B20260801", sku: "SKU-SG-200", skuName: "白砂糖 50kg", planned: 120, sorted: 120, status: "已播种" },
      { dest: "配送仓-B仓", store: "B店", batchNo: "B20260801", sku: "SKU-SG-200", skuName: "白砂糖 50kg", planned: 120, sorted: 60, status: "播种中" },
    ],
  },
  {
    id: "TP20260806003",
    taskNo: "TP-BC0123123132-003",
    waveNo: "BC0123123132",
    vehicleNo: "VC002",
    pickMode: "直接SKU播种",
    priority: "中",
    forkliftDriver: "陈伟",
    sorter: "赵敏",
    totalQty: 300,
    status: "进行中",
    forkliftLines: [
      { location: "B-02-04-01", batchNo: "B20260802", sku: "SKU-OIL-310", skuName: "大豆油 20L", planned: 300, picked: 180, status: "下架中" },
    ],
    sorterLines: [
      { dest: "配送仓-A仓", batchNo: "B20260802", sku: "SKU-OIL-310", skuName: "大豆油 20L", planned: 150, sorted: 90, status: "播种中" },
      { dest: "配送仓-B仓", batchNo: "B20260802", sku: "SKU-OIL-310", skuName: "大豆油 20L", planned: 150, sorted: 60, status: "播种中" },
    ],
  },
  {
    id: "TP20260806004",
    taskNo: "TP-BC0123123132-004",
    waveNo: "BC0123123132",
    vehicleNo: "VC002",
    pickMode: "车统边拣边播",
    priority: "中",
    forkliftDriver: "陈伟",
    sorter: "赵敏",
    totalQty: 500,
    status: "待领取",
    forkliftLines: [
      { location: "C-01-02-02", batchNo: "B20260730", sku: "SKU-RICE-50", skuName: "东北大米 25kg", planned: 500, picked: 0, status: "待下架" },
    ],
    sorterLines: [
      { dest: "配送仓-A仓", store: "A店", batchNo: "B20260730", sku: "SKU-RICE-50", skuName: "东北大米 25kg", planned: 200, sorted: 0, status: "待播种" },
      { dest: "配送仓-C仓", store: "C店", batchNo: "B20260730", sku: "SKU-RICE-50", skuName: "东北大米 25kg", planned: 300, sorted: 0, status: "待播种" },
    ],
  },
  {
    id: "TP20260806005",
    taskNo: "TP-BC1034567890-001",
    waveNo: "BC1034567890",
    vehicleNo: "VC003",
    pickMode: "车统后按店播种",
    priority: "中",
    forkliftDriver: "—",
    sorter: "—",
    totalQty: 160,
    status: "待领取",
    forkliftLines: [
      { location: "D-03-01-01", batchNo: "B20260728", sku: "SKU-SALT-10", skuName: "食用盐 5kg", planned: 160, picked: 0, status: "待下架" },
    ],
    sorterLines: [
      { dest: "配送仓-A仓", store: "A店", batchNo: "B20260728", sku: "SKU-SALT-10", skuName: "食用盐 5kg", planned: 80, sorted: 0, status: "待播种" },
      { dest: "配送仓-B仓", store: "B店", batchNo: "B20260728", sku: "SKU-SALT-10", skuName: "食用盐 5kg", planned: 80, sorted: 0, status: "待播种" },
    ],
  },
];

/* ────────── 派生统计 ────────── */

/* 模块级任务store（原型用）：出库通知单「合并统单拣货」后统单任务下发至此，与调拨拣货PDA共享 */
const transferPickingTaskStore: TransferPickingTask[] = [...transferPickingTasks];
export function getTransferPickingTasks(): TransferPickingTask[] {
  return transferPickingTaskStore;
}
export function addTransferPickingTask(task: TransferPickingTask) {
  transferPickingTaskStore.unshift(task);
}

export function forkliftProgress(t: TransferPickingTask): number {
  const p = t.forkliftLines.reduce((s, l) => s + l.picked, 0);
  const pl = t.forkliftLines.reduce((s, l) => s + l.planned, 0);
  return pl > 0 ? Math.round((p / pl) * 100) : 0;
}
export function sorterProgress(t: TransferPickingTask): number {
  const p = t.sorterLines.reduce((s, l) => s + l.sorted, 0);
  const pl = t.sorterLines.reduce((s, l) => s + l.planned, 0);
  return pl > 0 ? Math.round((p / pl) * 100) : 0;
}
