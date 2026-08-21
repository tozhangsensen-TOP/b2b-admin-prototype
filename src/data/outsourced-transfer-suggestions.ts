export type TransferSuggestionStatus = "待确认" | "已确认" | "已取消";
export type TransferCreateType = "auto" | "manual";
export type DemandType = "发运需求" | "库存周转" | "销量异常" | "批次效期";
export type Priority = "高" | "中" | "低";

export function computePriority(turnoverDays: number): Priority {
  if (turnoverDays < 2) return "高";
  if (turnoverDays <= 4) return "中";
  return "低";
}

export function computeDemandType(
  mainStock: number,
  shipmentForecast: number,
  options?: { dailySales?: number; outsourcedStock?: number; batchFifo?: boolean },
): DemandType {
  const dailySales = options?.dailySales ?? 0;
  const outsourcedStock = options?.outsourcedStock ?? 0;
  // 销量异常：无历史销售记录但外租库有可用库存，需人工确认（可能涉及新品或 AB 物料）
  if (dailySales === 0 && outsourcedStock > 0) return "销量异常";
  // 批次效期：本库库存批次优于外库，按先进先出优先从外租库调拨，先消耗外库库存
  if (options?.batchFifo) return "批次效期";
  return mainStock < shipmentForecast ? "发运需求" : "库存周转";
}

export function computePriorityRank(priority: Priority): number {
  if (priority === "高") return 1;
  if (priority === "中") return 2;
  return 3;
}

export type TransferSuggestionItem = {
  skuCode: string;
  skuName: string;
  mainStock: number;
  outsourcedStock: number;
  demandQty: number;
  demandDays?: number;
  dailySales: number;
  remainingTurnoverDays: number;
  turnoverDays: number;
  suggestQty: number;
  actualQty: number;
  estimatedPallets: number;
  volumeCbm: number;
  demandType: DemandType;
  priority: Priority;
  priorityRank: number;
  safetyStockDays?: number;
  priorityReason?: string;
  batchFifo?: boolean;
  batchNote?: string;
};

export type TransferSuggestion = {
  id: string;
  suggestionNo: string;
  createTime: string;
  status: TransferSuggestionStatus;
  createType: TransferCreateType;
  itemCount: number;
  totalQty: number;
  items: TransferSuggestionItem[];
};

export const transferSuggestionRecords: TransferSuggestion[] = [
  {
    id: "TS-001",
    suggestionNo: "TS20260708001",
    createTime: "2026-07-08 08:00:00",
    status: "待确认",
    createType: "auto",
    itemCount: 8,
    totalQty: 560,
    items: [
      { skuCode: "SKU1001001", skuName: "TST活力饮料500ml", mainStock: 50, outsourcedStock: 200, demandQty: 120, demandDays: 1, dailySales: 50, remainingTurnoverDays: 1, turnoverDays: 1, suggestQty: 90, actualQty: 90, estimatedPallets: 3, volumeCbm: 2.4, demandType: "发运需求", priority: "高", priorityRank: 1, priorityReason: "本库仅剩1天" },
      { skuCode: "SKU1001002", skuName: "TST活力饮料整箱装", mainStock: 30, outsourcedStock: 150, demandQty: 80, demandDays: 3, dailySales: 10, remainingTurnoverDays: 3, turnoverDays: 3, suggestQty: 60, actualQty: 60, estimatedPallets: 2, volumeCbm: 1.8, demandType: "发运需求", priority: "中", priorityRank: 2, priorityReason: "本库仅剩3天" },
      { skuCode: "SKU2002001", skuName: "晴岚益生菌软糖", mainStock: 100, outsourcedStock: 300, demandQty: 0, dailySales: 17, remainingTurnoverDays: 6, turnoverDays: 6, suggestQty: 50, actualQty: 50, estimatedPallets: 1, volumeCbm: 0.9, demandType: "批次效期", priority: "中", priorityRank: 2, batchFifo: true, batchNote: "本库批次较新优于外库，按先进先出优先从外租库调拨", priorityReason: "本库批次优于外库，FIFO优先调拨" },
      { skuCode: "SKU6006001", skuName: "云上鲜炖银耳羹", mainStock: 0, outsourcedStock: 120, demandQty: 0, dailySales: 0, remainingTurnoverDays: 0, turnoverDays: 0, suggestQty: 40, actualQty: 40, estimatedPallets: 1, volumeCbm: 0.8, demandType: "销量异常", priority: "高", priorityRank: 1, priorityReason: "无历史销售记录，需库房人工确认（新品/AB物料）" },
      { skuCode: "SKU2002002", skuName: "晴岚儿童钙片", mainStock: 20, outsourcedStock: 250, demandQty: 75, demandDays: 1, dailySales: 20, remainingTurnoverDays: 1, turnoverDays: 1, suggestQty: 70, actualQty: 70, estimatedPallets: 2, volumeCbm: 1.5, demandType: "发运需求", priority: "高", priorityRank: 1, priorityReason: "本库仅剩1天" },
      { skuCode: "SKU3003001", skuName: "澄曜玻尿酸面膜", mainStock: 80, outsourcedStock: 180, demandQty: 100, demandDays: 5, dailySales: 16, remainingTurnoverDays: 5, turnoverDays: 5, suggestQty: 40, actualQty: 40, estimatedPallets: 1, volumeCbm: 0.7, demandType: "发运需求", priority: "低", priorityRank: 3, priorityReason: "本库仅剩5天" },
      { skuCode: "SKU3003002", skuName: "澄曜修护精华", mainStock: 150, outsourcedStock: 400, demandQty: 0, dailySales: 21, remainingTurnoverDays: 7, turnoverDays: 7, suggestQty: 80, actualQty: 80, estimatedPallets: 2, volumeCbm: 1.2, demandType: "库存周转", priority: "低", priorityRank: 3, safetyStockDays: 7, priorityReason: "本库仅剩7天" },
      { skuCode: "SKU4004001", skuName: "云汐宠物湿粮罐头", mainStock: 10, outsourcedStock: 350, demandQty: 120, demandDays: 3, dailySales: 3, remainingTurnoverDays: 3, turnoverDays: 3, suggestQty: 130, actualQty: 130, estimatedPallets: 4, volumeCbm: 3.1, demandType: "发运需求", priority: "中", priorityRank: 2, priorityReason: "本库仅剩3天" },
    ],
  },
  {
    id: "TS-002",
    suggestionNo: "TS20260707001",
    createTime: "2026-07-07 08:00:00",
    status: "已确认",
    createType: "auto",
    itemCount: 12,
    totalQty: 450,
    items: [
      { skuCode: "SKU5005001", skuName: "海岚便携咖啡杯", mainStock: 40, outsourcedStock: 200, demandQty: 100, demandDays: 4, dailySales: 10, remainingTurnoverDays: 4, turnoverDays: 4, suggestQty: 80, actualQty: 80, estimatedPallets: 3, volumeCbm: 2.0, demandType: "发运需求", priority: "中", priorityRank: 2, priorityReason: "本库仅剩4天" },
    ],
  },
  {
    id: "TS-003",
    suggestionNo: "TS20260706001",
    createTime: "2026-07-06 08:00:00",
    status: "已取消",
    createType: "auto",
    itemCount: 8,
    totalQty: 300,
    items: [],
  },
];

export const mockSkuList = [
  { skuCode: "SKU1001001", skuName: "TST活力饮料500ml" },
  { skuCode: "SKU1001002", skuName: "TST活力饮料整箱装" },
  { skuCode: "SKU2002001", skuName: "晴岚益生菌软糖" },
  { skuCode: "SKU2002002", skuName: "晴岚儿童钙片" },
  { skuCode: "SKU3003001", skuName: "澄曜玻尿酸面膜" },
  { skuCode: "SKU3003002", skuName: "澄曜修护精华" },
  { skuCode: "SKU4004001", skuName: "云汐宠物湿粮罐头" },
  { skuCode: "SKU5005001", skuName: "海岚便携咖啡杯" },
  { skuCode: "SKU6006001", skuName: "云上鲜炖银耳羹" },
];
