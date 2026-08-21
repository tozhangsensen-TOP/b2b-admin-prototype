# 收货作业用工耗时分析 — 设计文档

> 日期：2026-07-24
> 状态：Draft

## 1. 背景与目标

### 1.1 背景

当前收货执行流程（`receiving-execution`）记录了收货单的状态和收货行数据，但缺少**各环节人工耗时**的采集和分析能力。管理者无法回答：

- 一张收货单从车辆到月到全部上架，总共花了多少人工时间？
- 卸货、收货、质检、上架四个环节中，哪个环节耗时最长？
- 不同员工、不同仓库、不同供应商的人效如何？

### 1.2 目标

新增「**收货用工耗时**」功能，实现：

1. **采集**：收货任务完成后，按环节记录每个操作人员在各环节的起止时间和处理量
2. **展示**：列表页展示任务级用工汇总，详情页展示环节级明细时间线
3. **分析**：支持按员工、仓库、供应商、日期范围筛选，计算人效指标

---

## 2. 核心概念

### 2.1 作业环节定义

收货任务拆分为 4 个标准环节，顺序固定：

| 环节编码 | 环节名称 | 说明 | 是否可并行 |
|---|---|---|---|
| `unloading` | 卸货 | 车辆到月到货品卸至收货区 | 否 |
| `receiving` | 收货清点 | 扫码核对数量、批次、生产日期 | 否 |
| `qc` | 质检 | 质检员抽检或全检 | 是（部分仓库跳过） |
| `putaway` | 上架 | 扫码将货品上架到目标库位 | 否 |

### 2.2 用工记录（Labor Record）

每条用工记录 = **一个员工** 在 **一个环节** 的 **一次作业**：

```
task_id: RC20260325001
└── unloading
    ├── 程世龙 09:30:00 → 09:44:49  处理 460 件
    └── （可选）第二个员工并行
└── receiving
    ├── 程世龙 09:45:00 → 10:26:24  处理 460 件
    └── ...
└── qc
    └── 张质检 10:30:00 → 10:45:00  处理 460 件
└── putaway
    └── 王上架 10:50:00 → 11:10:00  处理 460 件
```

### 2.3 关键指标

| 指标 | 计算方式 | 说明 |
|---|---|---|
| 任务总耗时 | max(所有环节结束时间) - min(所有环节开始时间) | 含等待时间 |
| 纯作业耗时 | 各环节 duration_min 之和 | 不含并行等待 |
| 人效 | 处理总量 ÷ 纯作业耗时（件/分钟） | 衡量作业速度 |
| 环节占比 | 该环节耗时 ÷ 任务总耗时 | 定位瓶颈 |

---

## 3. 数据模型（Mock 数据）

新增文件：`src/data/receiving-labor.ts`

### 3.1 类型定义

```ts
// 作业环节
export type LaborStage = "卸货" | "收货清点" | "质检" | "上架";

// 用工记录（明细行）
export type LaborRecord = {
  id: string;              // 记录编号，如 LAB001
  taskId: string;          // 关联收货单号
  stage: LaborStage;       // 作业环节
  operator: string;        // 操作人员
  operatorRole: string;    // 角色：卸货员/仓管/质检员/上架员
  startTime: string;       // "2026-07-24 09:30:00"
  endTime: string;         // "2026-07-24 09:44:49"
  durationMin: number;     // 耗时（分钟），系统自动计算
  processedQty: number;    // 处理数量（件）
  unit: string;            // 单位：件/箱/托
  isEfficient: boolean;    // 标记该环节耗时是否超标（基于基准值）
  remark: string;          // 备注
};

// 任务级汇总
export type TaskLaborSummary = {
  taskId: string;
  supplier: string;
  warehouse: string;
  dock: string;            // 月台
  status: "已完成" | "收货中" | "待收货";
  totalQty: number;        // 总收货量
  totalLaborMin: number;   // 纯作业耗时合计
  wallClockMin: number;    // 挂钟总耗时（最早开始 → 最晚结束）
  totalManHours: number;   // 总工时（小时），四舍五入
  avgEfficiency: number;   // 平均人效（件/分钟）
  bottleneckStage: string; // 耗时最长的环节
  stageBreakdown: {        // 环节耗时拆解
    unloading: number;
    receiving: number;
    qc: number;
    putaway: number;
  };
  operators: string[];     // 参与人员列表
  completedAt: string;     // 任务完成时间
};

// 筛选条件
export type LaborFilters = {
  taskId: string;
  operator: string;
  warehouse: string;
  supplier: string;
  dateRange: [string, string] | null;  // [开始日期, 结束日期]
  stage: string;
};
```

### 3.2 Mock 数据量

- `taskLaborSummaries`：10 条任务汇总（覆盖不同状态、仓库、供应商）
- `laborRecordsMap`：按 taskId 索引的明细记录数组，每个任务 4-6 条记录
- 参考你提供的收货截图数据，至少包含该单（聊城孚德、山东圣洋等供应商）的模拟明细

### 3.3 数据文件结构

```ts
// 遵循现有约定：typed interfaces + seed data + lookup map
export const taskLaborSummaries: TaskLaborSummary[] = [...];
export const laborRecordsMap: Record<string, LaborRecord[]> = {...};
```

---

## 4. 页面设计

### 4.1 新增页面

新增页面文件：`src/pages/receiving-labor.tsx`

遵循现有「**列表页骨架**」：

```
PageHeader
  └── title: "收货用工耗时"
  └── description: "统计收货任务各环节人工耗时，分析作业效率。"

Summary Stat Cards（4 列）
  ├── 总工时（小时）
  ├── 平均单耗（分钟/单）
  ├── 涉及任务数
  └── 效率异常数（环节耗时超标的记录数）

Card — 查询区
  ├── 收货单号（Input）
  ├── 操作人员（Input，模糊匹配）
  ├── 仓库（Select，复用现有 6 个仓库选项）
  ├── 作业环节（Select：全部/卸货/收货清点/质检/上架）
  └── 日期范围（DateRangePicker）
  └── 操作：展开/收起 + 重置 + 查询

ListPageMainCard
  ├── 状态 Tabs：全部 / 已完成 / 收货中 / 待收货
  ├── HorizontalScrollArea 包裹 <table>
  │   └── 列：收货单号 | 供应商 | 仓库 | 月台 | 总工时 | 平均人效 | 瓶颈环节 | 参与人员 | 状态 | 操作
  └── Pagination

Drawer — 任务用工明细（点击"查看明细"打开）
  ├── 任务基本信息（收货单号、供应商、仓库、月台）
  ├── 环节耗时汇总（4 列 stat cards：卸货 / 收货 / 质检 / 上架 各耗时）
  └── Timeline — 用工记录时间线
      └── 每条记录：环节标签 + 操作人员 + 起止时间 + 耗时 + 处理量 + 效率标记
```

### 4.2 表格列定义

| 列 | 宽度 | 格式 |
|---|---|---|
| 收货单号 | 150px | 链接色，点击打开 Drawer |
| 供应商 | 200px | 截断显示 |
| 仓库 | 120px | 文本 |
| 月台 | 110px | 文本 |
| 总工时 | 100px | "2.5 h" 格式 |
| 平均人效 | 100px | "18 件/分钟" 格式 |
| 瓶颈环节 | 120px | 标签 + 耗时 |
| 参与人员 | 150px | 逗号分隔人名 |
| 状态 | 100px | Badge（复用 statusBadge 模式） |
| 操作 | 120px | "查看明细" Button |

### 4.3 瓶颈环节标记

- 瓶颈环节 = 该任务中 `duration_min` 最长的环节
- 在表格中用 `Badge tone="warning"` 展示
- 如果某环节 `isEfficient === false`（超时），在明细 Timeline 中该条目用 `tone="warning"` 高亮

### 4.4 效率异常标记

设置各环节基准耗时（配置项，后续可调整）：

| 环节 | 基准耗时（件/分钟） | 超过则标记异常 |
|---|---|---|
| 卸货 | 50 件/分钟 | 低于基准 |
| 收货清点 | 30 件/分钟 | 低于基准 |
| 质检 | 20 件/分钟 | 低于基准 |
| 上架 | 40 件/分钟 | 低于基准 |

---

## 5. 与收货执行流程的集成

### 5.1 用工数据何时产生

用工记录由收货任务的状态流转触发：

```
任务状态              触发动作
─────────            ─────────────────────────
待收货 → 收货中     → 记录"卸货"环节开始时间
收货中 → 部分收货   → 记录"收货清点"环节结束 + "质检"环节开始
收货中 → 已完成     → 记录"质检"环节结束 + "上架"环节结束
```

在现有 `receiving-execution.tsx` 的 `confirmReceive` 操作中，当任务状态变为"已完成"时，生成对应的 `laborRecordsMap` 条目。

### 5.2 页面入口

在 `src/App.tsx` 中：

1. 新增 workspace tab：`"receiving-labor"`，label: "收货用工耗时"，icon: `Clock`
2. 在导航树「执行作业 / 仓内执行」下新增 NavItem
3. 新增 state 管理：`laborScenario`、`laborTaskSummaries`

### 5.3 导航树位置

```
执行作业
└── 仓内执行
    ├── 收货执行          ← 现有
    ├── 收货用工耗时      ← 新增
    ├── 入库上架
    └── 库存盘点
```

---

## 6. 组件复用清单

| 现有组件 | 用途 |
|---|---|
| `PageHeader` | 页面标题 |
| `Card` | 查询区卡片、明细 Drawer 内分组 |
| `ListPageMainCard` | 列表容器 |
| `HorizontalScrollArea` | 表格横向滚动 |
| `Pagination` | 分页 |
| `Badge` | 状态、瓶颈环节标记 |
| `Button` | 操作按钮 |
| `Input` | 查询输入 |
| `Select` | 仓库、环节筛选 |
| `DateRangePicker` | 日期范围 |
| `Tabs` | 状态 Tab |
| `Drawer` | 任务用工明细详情 |
| `Timeline` | 用工记录时间线 |
| `ExceptionState` | 空数据/无权限/加载中 |
| `DemoToolbar` | 场景切换 |
| `query-section` 工具 | 查询区折叠逻辑 |

**无需新增自定义 UI 组件**，全部复用现有组件库。

---

## 7. 待决策事项

1. **工时基准值**：当前设定的是经验值（卸货 50 件/分钟等），需业务方确认实际基准
2. **并行作业处理**：当前模型支持同一环节多人并行，但汇总计算需确认：总工时 = 各员工 duration 之和 还是 max(duration)
3. **质检环节可选**：部分仓库收货跳过质检，汇总表 `qc` 字段应为 0 还是 null
4. **数据实时性**：Mock 阶段静态数据，后续对接实际 PDA 扫码打点数据
5. **导出**：是否需要在列表页增加"导出明细"按钮

---

## 8. 文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/data/receiving-labor.ts` | 新增 | Mock 数据类型 + 种子数据 |
| `src/pages/receiving-labor.tsx` | 新增 | 用工耗时列表页 |
| `src/App.tsx` | 修改 | 新增路由 + 导航 + state |
| `src/components/app-shell.tsx` | 修改 | 导航树新增节点 |
