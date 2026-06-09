export type WarehouseGeo = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact: string;
  phone: string;
};

export type DeliveryOrderItem = {
  sku: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
};

export type DeliveryOrderInfo = {
  deliveryOrderNo: string;
  inboundNoticeId: string;
  supplierName: string;
  supplierCode: string;
  warehouse: WarehouseGeo;
  requiredDeliveryDate: string;
  items: DeliveryOrderItem[];
};

export type CheckinResultData = {
  driverName: string;
  driverPhone: string;
  checkinTime: string;
  checkinLatitude: number;
  checkinLongitude: number;
  checkinAddress: string;
  distance: number;
};

export type CheckinRecord = {
  id: string;
  deliveryOrderNo: string;
  inboundNoticeId: string;
  supplierName: string;
  supplierCode: string;
  driverName: string;
  driverPhone: string;
  checkinTime: string;
  checkinLatitude: number;
  checkinLongitude: number;
  checkinAddress: string;
  distanceToWarehouse: number;
  warehouseName: string;
  warehouseAddress: string;
  warehouseContact: string;
  warehousePhone: string;
};

export const mockWarehouses: Record<string, WarehouseGeo> = {
  "上海生鲜仓": {
    name: "上海生鲜仓",
    address: "上海市浦东新区临港物流园区A区1号",
    latitude: 31.0234,
    longitude: 121.5234,
    contact: "李仓库",
    phone: "138-0001-2345",
  },
  "北京中转仓": {
    name: "北京中转仓",
    address: "北京市大兴区天宫院物流园B区3号",
    latitude: 39.7654,
    longitude: 116.3456,
    contact: "王仓库",
    phone: "138-0002-3456",
  },
  "广州常温仓": {
    name: "广州常温仓",
    address: "广州市番禺区化龙镇仓储物流中心C区",
    latitude: 23.0123,
    longitude: 113.4567,
    contact: "刘仓管",
    phone: "138-0003-4567",
  },
};

export const mockDeliveryOrders: DeliveryOrderInfo[] = [
  {
    deliveryOrderNo: "DN20260513001",
    inboundNoticeId: "RN20260322001",
    supplierName: "华东生鲜原料供应商有限公司",
    supplierCode: "SUP-001",
    warehouse: mockWarehouses["上海生鲜仓"],
    requiredDeliveryDate: "2026-05-14",
    items: [
      { sku: "SKU-10086", name: "冷冻鸡腿排", spec: "2kg/袋", qty: 60, unit: "袋" },
      { sku: "SKU-20012", name: "番茄酱", spec: "1kg/瓶", qty: 120, unit: "瓶" },
    ],
  },
  {
    deliveryOrderNo: "DN20260513002",
    inboundNoticeId: "RN20260322002",
    supplierName: "华北包装耗材供应商",
    supplierCode: "SUP-002",
    warehouse: mockWarehouses["北京中转仓"],
    requiredDeliveryDate: "2026-05-15",
    items: [
      { sku: "SKU-30001", name: "包装纸箱", spec: "500×400×300mm", qty: 800, unit: "个" },
    ],
  },
];

export const mockCheckinRecords: CheckinRecord[] = [
  {
    id: "CI20260513001",
    deliveryOrderNo: "DN20260513001",
    inboundNoticeId: "RN20260322001",
    supplierName: "华东生鲜原料供应商有限公司",
    supplierCode: "SUP-001",
    driverName: "张师傅",
    driverPhone: "139-1234-5678",
    checkinTime: "2026-05-13 09:15:23",
    checkinLatitude: 31.0201,
    checkinLongitude: 121.5211,
    checkinAddress: "上海市浦东新区临港物流园区A区2号门",
    distanceToWarehouse: 380,
    warehouseName: "上海生鲜仓",
    warehouseAddress: "上海市浦东新区临港物流园区A区1号",
    warehouseContact: "李仓库",
    warehousePhone: "138-0001-2345",
  },
];
