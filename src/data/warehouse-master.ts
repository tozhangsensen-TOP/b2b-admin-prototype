export type WarehouseAddress = {
  province: string;
  city: string;
  district: string;
  detail: string;
  contact: string;
  phone: string;
  email: string;
};

export type WarehouseOperationLog = {
  time: string;
  actor: string;
  action: string;
  result: string;
  remark?: string;
};

export type WarehouseChangeLog = {
  time: string;
  actor: string;
  field: string;
  before: string;
  after: string;
};

export type WarehouseApprovalLog = {
  node: string;
  actor: string;
  result: string;
  opinion: string;
  time: string;
};

export type WarehouseType = "常温仓" | "冷藏仓" | "冷冻仓" | "恒温仓";
export type WarehouseStatus = "启用" | "停用";

export type WarehouseRecord = {
  code: string;
  name: string;
  type: WarehouseType;
  status: WarehouseStatus;
  area: number;
  temperatureRange: string;
  manager: string;
  operatingHours: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: WarehouseAddress;
  note: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  reviewedAt: string;
  reviewedBy: string;
  operationLogs: WarehouseOperationLog[];
  changeLogs: WarehouseChangeLog[];
  approvalLogs: WarehouseApprovalLog[];
};

export const warehouseExportFields = [
  "仓库编码",
  "仓库名称",
  "仓库类型",
  "仓库状态",
  "仓库面积(m²)",
  "温度范围",
  "负责人",
  "运营时间",
  "联系人",
  "联系电话",
  "联系邮箱",
  "所在省份",
  "所在城市",
  "所在区县",
  "详细地址",
];

export const warehouseImportFailures = [
  {
    rowNo: "5",
    field: "仓库类型",
    value: "低温仓",
    reason: "仓库类型必须是：常温仓、冷藏仓、冷冻仓、恒温仓。",
  },
  {
    rowNo: "11",
    field: "仓库面积",
    value: "三千",
    reason: "仓库面积必须是数字。",
  },
  {
    rowNo: "18",
    field: "所在城市",
    value: "",
    reason: "所在城市不能为空。",
  },
];

export const warehouseRecords: WarehouseRecord[] = [
  {
    code: "WH-202603-001",
    name: "上海生鲜仓",
    type: "冷藏仓",
    status: "启用",
    area: 12000,
    temperatureRange: "2~8°C",
    manager: "张明",
    operatingHours: "06:00-22:00",
    contactName: "王洁",
    contactPhone: "13800138001",
    contactEmail: "ops@sh-fresh.example.com",
    address: {
      province: "上海市",
      city: "上海市",
      district: "浦东新区",
      detail: "金穗路88号3号仓",
      contact: "王洁",
      phone: "13800138001",
      email: "ops@sh-fresh.example.com",
    },
    note: "配备冷链监控系统，月台带升降平台。",
    createdAt: "2026-03-01 09:00",
    createdBy: "张三",
    updatedAt: "2026-05-10 14:30",
    updatedBy: "李四",
    reviewedAt: "2026-03-02 10:00",
    reviewedBy: "王五",
    operationLogs: [
      { time: "2026-03-01 09:00", actor: "张三", action: "新建仓库", result: "成功" },
      { time: "2026-03-02 10:00", actor: "王五", action: "审核仓库", result: "审核通过" },
      { time: "2026-05-10 14:30", actor: "李四", action: "更新仓库信息", result: "成功" },
    ],
    changeLogs: [
      { time: "2026-05-10 14:30", actor: "李四", field: "负责人", before: "赵六", after: "张明" },
    ],
    approvalLogs: [
      { node: "仓配主管审核", actor: "王五", result: "通过", opinion: "信息核实无误，同意启用。", time: "2026-03-02 10:00" },
    ],
  },
  {
    code: "WH-202603-002",
    name: "北京中转仓",
    type: "常温仓",
    status: "启用",
    area: 8000,
    temperatureRange: "常温",
    manager: "李强",
    operatingHours: "08:00-20:00",
    contactName: "刘芳",
    contactPhone: "13900139002",
    contactEmail: "logistics@bj-trans.example.com",
    address: {
      province: "北京市",
      city: "北京市",
      district: "大兴区",
      detail: "黄村镇物流园A区5号",
      contact: "刘芳",
      phone: "13900139002",
      email: "logistics@bj-trans.example.com",
    },
    note: "主要用于华北区域货物中转，配备自动分拣线。",
    createdAt: "2026-03-10 08:30",
    createdBy: "张三",
    updatedAt: "2026-04-20 11:00",
    updatedBy: "张三",
    reviewedAt: "2026-03-11 09:00",
    reviewedBy: "钱七",
    operationLogs: [
      { time: "2026-03-10 08:30", actor: "张三", action: "新建仓库", result: "成功" },
      { time: "2026-03-11 09:00", actor: "钱七", action: "审核仓库", result: "审核通过" },
    ],
    changeLogs: [],
    approvalLogs: [
      { node: "仓配主管审核", actor: "钱七", result: "通过", opinion: "同意启用北京中转仓。", time: "2026-03-11 09:00" },
    ],
  },
  {
    code: "WH-202603-003",
    name: "广州常温仓",
    type: "常温仓",
    status: "启用",
    area: 15000,
    temperatureRange: "常温",
    manager: "陈伟",
    operatingHours: "07:00-21:00",
    contactName: "黄丽",
    contactPhone: "13700137003",
    contactEmail: "admin@gz-ambient.example.com",
    address: {
      province: "广东省",
      city: "广州市",
      district: "黄埔区",
      detail: "保税港区物流园B区12号",
      contact: "黄丽",
      phone: "13700137003",
      email: "admin@gz-ambient.example.com",
    },
    note: "靠近南沙港，适合进出口货物存储。",
    createdAt: "2026-03-15 10:00",
    createdBy: "李四",
    updatedAt: "2026-05-01 16:00",
    updatedBy: "李四",
    reviewedAt: "2026-03-16 14:00",
    reviewedBy: "孙八",
    operationLogs: [
      { time: "2026-03-15 10:00", actor: "李四", action: "新建仓库", result: "成功" },
      { time: "2026-03-16 14:00", actor: "孙八", action: "审核仓库", result: "审核通过" },
      { time: "2026-05-01 16:00", actor: "李四", action: "更新仓库信息", result: "成功", remark: "扩展仓储面积" },
    ],
    changeLogs: [
      { time: "2026-05-01 16:00", actor: "李四", field: "仓库面积", before: "10000", after: "15000" },
    ],
    approvalLogs: [
      { node: "仓配主管审核", actor: "孙八", result: "通过", opinion: "确认场地租赁合同已签署，同意启用。", time: "2026-03-16 14:00" },
    ],
  },
  {
    code: "WH-202603-004",
    name: "杭州冷链仓",
    type: "冷冻仓",
    status: "停用",
    area: 5000,
    temperatureRange: "-18~-22°C",
    manager: "周婷",
    operatingHours: "06:00-23:00",
    contactName: "吴涛",
    contactPhone: "13600136004",
    contactEmail: "coldchain@hz-freeze.example.com",
    address: {
      province: "浙江省",
      city: "杭州市",
      district: "萧山区",
      detail: "临空经济示范区冷链园C区3号",
      contact: "吴涛",
      phone: "13600136004",
      email: "coldchain@hz-freeze.example.com",
    },
    note: "冷冻设备升级改造中，预计2026年6月重新启用。",
    createdAt: "2025-11-01 09:00",
    createdBy: "张三",
    updatedAt: "2026-04-28 15:00",
    updatedBy: "王五",
    reviewedAt: "2025-11-02 11:00",
    reviewedBy: "周总监",
    operationLogs: [
      { time: "2025-11-01 09:00", actor: "张三", action: "新建仓库", result: "成功" },
      { time: "2025-11-02 11:00", actor: "周总监", action: "审核仓库", result: "审核通过" },
      { time: "2026-04-28 15:00", actor: "王五", action: "停用仓库", result: "成功", remark: "设备升级改造" },
    ],
    changeLogs: [
      { time: "2026-04-28 15:00", actor: "王五", field: "仓库状态", before: "启用", after: "停用" },
    ],
    approvalLogs: [
      { node: "仓配主管审核", actor: "周总监", result: "通过", opinion: "确认设备验收合格，同意启用。", time: "2025-11-02 11:00" },
      { node: "运营总监审核", actor: "吴总监", result: "通过", opinion: "同意停用改造。", time: "2026-04-28 16:00" },
    ],
  },
];
