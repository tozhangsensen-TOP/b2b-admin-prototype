export type InboundNotificationRow = {
  id: string;
  status: string;
  poId: string;
  supplier: string;
  warehouse: string;
  organization: string;
  type: string;
  eta: string;
  createdAt: string;
  owner: string;
  totalQty: string;
  receivedQty: string;
  remark: string;
  checkinTime?: string;
  checkinDriver?: string;
  checkinPhone?: string;
};

export const inboundNotifications: InboundNotificationRow[] = [
  {
    id: "RN20260322001",
    status: "部分入库",
    poId: "PO20260321001",
    supplier: "华东生鲜原料供应商有限公司",
    warehouse: "上海生鲜仓",
    organization: "华东采购中心",
    type: "普通采购",
    eta: "2026-03-25",
    createdAt: "2026-03-22 10:15:22",
    owner: "张敏",
    totalQty: "350",
    receivedQty: "180",
    remark: "优先安排周三早班到货",
    checkinTime: "2026-05-13 09:15:23",
    checkinDriver: "张师傅",
    checkinPhone: "139-1234-5678",
  },
  {
    id: "RN20260322002",
    status: "待收货",
    poId: "PO20260321002",
    supplier: "华北包装耗材供应商",
    warehouse: "北京中转仓",
    organization: "全国采购中心",
    type: "门店直送",
    eta: "2026-03-28",
    createdAt: "2026-03-22 14:08:52",
    owner: "王磊",
    totalQty: "800",
    receivedQty: "0",
    remark: "",
  },
  {
    id: "RN20260322003",
    status: "部分入库",
    poId: "PO20260321003",
    supplier: "广州调味品供应商集团",
    warehouse: "广州常温仓",
    organization: "华南采购中心",
    type: "常温采购",
    eta: "2026-03-26",
    createdAt: "2026-03-22 11:22:15",
    owner: "李慧",
    totalQty: "500",
    receivedQty: "260",
    remark: "提前联系仓管确认月台时段",
  },
  {
    id: "RN20260322004",
    status: "已入库",
    poId: "PO20260321004",
    supplier: "华中调味料供应商",
    warehouse: "武汉常温仓",
    organization: "华中采购中心",
    type: "普通采购",
    eta: "2026-03-20",
    createdAt: "2026-03-19 09:30:05",
    owner: "赵晨",
    totalQty: "400",
    receivedQty: "400",
    remark: "",
  },
  {
    id: "RN20260322005",
    status: "待收货",
    poId: "PO20260321005",
    supplier: "苏州包装辅料有限公司",
    warehouse: "杭州冷链仓",
    organization: "华东采购中心",
    type: "寄售采购",
    eta: "2026-03-30",
    createdAt: "2026-03-22 16:40:11",
    owner: "张敏",
    totalQty: "1200",
    receivedQty: "0",
    remark: "冷链运输，到货后2小时内验收",
  },
  {
    id: "RN20260322006",
    status: "已取消",
    poId: "PO20260321006",
    supplier: "成都冻品供应商",
    warehouse: "成都冷链仓",
    organization: "西南采购中心",
    type: "普通采购",
    eta: "2026-03-27",
    createdAt: "2026-03-22 15:05:38",
    owner: "陈涛",
    totalQty: "600",
    receivedQty: "0",
    remark: "供应商产能不足，已协商取消",
  },
  {
    id: "RN20260322007",
    status: "已入库",
    poId: "PO20260321007",
    supplier: "北京饮品物料服务商",
    warehouse: "北京中转仓",
    organization: "全国采购中心",
    type: "门店直送",
    eta: "2026-03-21",
    createdAt: "2026-03-21 08:20:43",
    owner: "王磊",
    totalQty: "950",
    receivedQty: "950",
    remark: "",
  },
  {
    id: "RN20260322008",
    status: "待收货",
    poId: "PO20260321008",
    supplier: "深圳设备备件供应商",
    warehouse: "深圳设备仓",
    organization: "华南采购中心",
    type: "常温采购",
    eta: "2026-03-29",
    createdAt: "2026-03-22 13:48:30",
    owner: "李慧",
    totalQty: "200",
    receivedQty: "0",
    remark: "设备类需质检后再入库",
  },
];

export const inboundLineItems = [
  {
    sku: "SKU-10086",
    name: "冷冻鸡腿排",
    spec: "2kg/袋",
    unit: "袋",
    notifyQty: "120",
    receivedQty: "60",
    price: "86.00",
    taxRate: "13%",
    amount: "11,661.60",
  },
  {
    sku: "SKU-20012",
    name: "番茄酱",
    spec: "1kg/瓶",
    unit: "瓶",
    notifyQty: "240",
    receivedQty: "120",
    price: "22.50",
    taxRate: "13%",
    amount: "6,102.00",
  },
];

export const inboundRelatedDocuments = [
  {
    relation: "上游",
    id: "PO20260321001",
    type: "采购订单",
    status: "已审核",
    createdAt: "2026-03-21 10:32:11",
  },
  {
    relation: "下游",
    id: "ASN20260322001",
    type: "收货单",
    status: "部分收货",
    createdAt: "2026-03-22 18:15:30",
  },
  {
    relation: "下游",
    id: "ASN20260324002",
    type: "收货单",
    status: "待收货",
    createdAt: "2026-03-24 09:10:05",
  },
];

export const inboundOperationLogs = [
  { time: "2026-03-22 10:15:22", actor: "张敏", action: "生成入库通知单", result: "成功", remark: "由采购订单PO20260321001下推生成" },
  { time: "2026-03-22 16:20:05", actor: "李仓库", action: "部分收货", result: "成功", remark: "实收180件，冷冻鸡腿排60袋、番茄酱120瓶" },
  { time: "2026-03-23 09:45:33", actor: "张敏", action: "修改预计到货日", result: "成功", remark: "由2026-03-25调整为2026-03-26" },
];

export const inboundApprovalLogs = [
  { node: "仓库主管审批", actor: "赵仓库", opinion: "确认收货计划，安排月台D区", time: "2026-03-22 11:03:55" },
];
