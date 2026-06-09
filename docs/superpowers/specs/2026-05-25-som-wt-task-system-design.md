# SOM 任务系统 + WT 任务中心 — 设计文档

## 概述

新增 SOM（总部监控平台）任务下发系统与 WT（仓库任务中心），构建总部→仓库的双层任务体系。

**核心能力：**
- SOM 总部：任务主题模板管理、手动/定时/循环下发任务到各仓库、自动检测异常商品效期并生成任务、全仓任务执行监控与统计
- WT 仓库：接收并执行 SOM 下发任务（支持移动端 PDA/手机拍照反馈）、自建计件/计时任务提报、经理审核生效

## 导航与入口

在侧边栏主导航中新增「SOM 任务管理」分区，作为顶级入口：

```
┌─────────────────────────────┐
│  🏠 首页                    │
│  ── SOM 任务管理 ──         │  ← 新增大区（视觉分割线）
│  📋 SOM 任务总览            │  ← 总部视图
│  ⚙️ 任务主题管理            │  ← 模板维护
│  🔄 自动派发规则            │  ← 异常效期等自动触发
│  ── 仓库作业 ──             │  ← 现有业务保持不变
│  📦 WT 任务中心             │  ← 放在仓库作业区
│  ...                        │
└─────────────────────────────┘
```

点击各入口在工作区以 Tab 形式打开对应页面，遵循现有壳层 Tab 模式。

## 页面结构

### SOM 任务总览

进入后以子 Tab 切换三个视图：

| Tab | 内容 |
|-----|------|
| **下发任务** | 全部已下发任务的列表，支持筛选（仓库/主题/状态/时间）、新建下发入口 |
| **执行监控** | 按仓库维度展示任务执行进度：总任务/执行中/已完成/逾期 + 进度条 |
| **统计看板** | 数据概览卡片（总下发数/执行中/已完成/逾期）+ 图表（月度分布/逾期趋势/仓库对比） |

### 下发任务列表

```
[新建下发] [从模板] [自动规则]
筛选: 仓库▾ 主题▾ 状态▾ 时间▾
┌──────┬────────┬──────┬──────┬──────┬──────┐
│ 任务 │ 主题   │ 目标 │ 类型 │ 状态 │ 操作 │
│ 标题 │ 模板   │ 仓库 │      │      │      │
├──────┼────────┼──────┼──────┼──────┼──────┤
│ ...  │ ...    │ ...  │ ...  │ ...  │ 查看 │
└──────┴────────┴──────┴──────┴──────┴──────┘
```

任务支持多选批量操作（取消下发、催办）。

### 执行监控

按仓库展示执行进度：

```
┌────┬────────┬──────┬──────┬──────┬────────┐
│仓库│ 总任务 │执行中│已完成│ 逾期 │ 进度  │
├────┼────────┼──────┼──────┼──────┼────────┤
│A库 │  12    │  2   │  9   │  1   │ ████░ │
│B库 │  15    │  5   │  8   │  2   │ ███░░ │
└────┴────────┴──────┴──────┴──────┴────────┘
```

点击仓库行可展开查看该仓所有任务明细。

### WT 任务中心

进入后以子 Tab 切换：

| Tab | 内容 |
|-----|------|
| **全部任务** | 本仓库所有任务（SOM下发 + 自动触发 + WT自建），统一列表 |
| **待执行** | 过滤出状态为「待执行」的任务，快捷执行入口 |
| **自建任务** | 本仓库自建的任务列表，新建自建任务入口 |
| **我的审核** | 待经理审核的自建任务条目，通过/驳回操作 |

列表含来源标签：`SOM下发` / `自动触发` / `自建-计件` / `自建-计时`。

### 任务主题管理（SOM）

总部维护的主题模板列表：

```
[新建主题]
┌──────┬──────────┬────────┬────────┬────────┬──────┐
│名称  │ 说明     │默认优 │默认频率│默认工时│ 状态 │
│      │          │先级   │        │        │      │
├──────┼──────────┼────────┼────────┼────────┼──────┤
│除霜  │冻库定期  │中     │每月    │4.0h    │启用  │
│      │除霜作业  │        │        │        │      │
├──────┼──────────┼────────┼────────┼────────┼──────┤
│温度计│子母温度  │高     │每周    │1.0h    │启用  │
│校准  │计校准    │        │        │        │      │
├──────┼──────────┼────────┼────────┼────────┼──────┤
│异常  │异常商品  │紧急   │-       │2.0h    │启用  │
│效期  │效期处理  │        │        │        │      │
└──────┴──────────┴────────┴────────┴────────┴──────┘
```

主题包含字段：名称、说明/作业指导、默认优先级、默认频率、默认预算工时、默认执行要求（是否需要拍照、是否需要备注）、状态（启用/禁用）。

### 自动派发规则管理（SOM）

配置自动触发的规则，如异常商品效期处理：

```
[新建规则]
┌──────┬────────┬────────┬────────┬────────┬──────┐
│规则名│触发条件│目标仓库│目标主题│ 状态   │ 操作 │
├──────┼────────┼────────┼────────┼────────┼──────┤
│异常  │每日8:00 │全部仓库│异常商品│已启用  │编辑  │
│效期  │自动扫描 │        │效期处理│        │禁用  │
│自动  │效期<7天 │        │        │        │      │
│派发  │的商品   │        │        │        │      │
└──────┴────────┴────────┴────────┴────────┴──────┘
```

规则配置：规则名称、触发频率（cron 表达式或预设时间）、扫描条件（自定义）、目标仓库（全部/指定）、目标主题、优先级、操作（启用/禁用/编辑/立即执行一次）。自动生成的任务在列表中来源显示为"自动触发"。

## 数据模型

### 任务主题模板 (TaskTemplate)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| name | string | 模板名称 |
| description | string | 说明/作业指导 |
| defaultPriority | 'urgent'\|'high'\|'medium'\|'low' | 默认优先级 |
| defaultFrequency | 'once'\|'daily'\|'weekly'\|'monthly'\|'custom' | 默认频率 |
| defaultBudgetHours | number | 默认预算工时 |
| requirePhoto | boolean | 是否需要拍照反馈 |
| requireNote | boolean | 是否需要备注 |
| status | 'enabled'\|'disabled' | 状态 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

### 任务 (Task)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| title | string | 任务标题 |
| templateId | string? | 关联主题模板 ID |
| templateName | string | 主题模板名称（冗余字段） |
| type | 'issued'\|'self-piece'\|'self-time' | 任务类型：SOM下发/自建计件/自建计时 |
| source | 'som'\|'auto'\|'wt' | 来源 |
| sourceRuleId | string? | 自动规则 ID（自动触发时关联） |
| priority | 'urgent'\|'high'\|'medium'\|'low' | 优先级 |
| targetWarehouses | string[] | 目标仓库列表 |
| assignedRole | string? | 责任角色 |
| assignedPerson | string? | 指定责任人 |
| budgetHours | number | 预算工时 |
| frequency | 'once'\|'daily'\|'weekly'\|'monthly'\|'custom' | 频率 |
| cronExpression | string? | cron 表达式（custom 时） |
| plannedStart | string | 计划开始时间 |
| plannedEnd | string | 计划截止时间 |
| attachments | string[] | 附件列表 |
| description | string | 补充说明 |
| requirePhoto | boolean | 执行是否需要拍照 |
| requireNote | boolean | 执行是否需要备注 |
| status | TaskStatus | 任务状态 |
| createdBy | string | 创建人 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

### 任务状态枚举 (TaskStatus)

SOM 下发任务生命周期：
`draft(草稿) → issued(已下发) → in_progress(执行中) → completed(已完成) / overdue(已逾期)`

WT 自建任务生命周期：
`draft(草稿) → pending_review(待审核) → approved(已通过) / rejected(已驳回) → effective(生效) → in_progress(执行中) → completed(已完成) / overdue(已逾期)`

### 任务执行记录 (TaskExecution)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| taskId | string | 关联任务 ID |
| executor | string | 执行人 |
| warehouse | string | 执行仓库 |
| completed | boolean | 是否完成 |
| actualHours | number? | 实际工时 |
| note | string? | 备注说明 |
| photos | string[] | 拍照上传列表 |
| submittedAt | string | 提交时间 |

### 自动派发规则 (AutoDispatchRule)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| name | string | 规则名称 |
| triggerCron | string | 触发频率（cron 表达式） |
| condition | object | 扫描条件定义 |
| targetWarehouses | 'all'\|string[] | 目标仓库 |
| targetTemplateId | string | 目标主题模板 |
| priorityOverride | string? | 优先级覆盖 |
| status | 'enabled'\|'disabled' | 状态 |

### 自建任务审核记录 (TaskReview)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| taskId | string | 关联任务 ID |
| reviewer | string | 审核人 |
| action | 'approved'\|'rejected' | 审核结果 |
| opinion | string? | 审核意见 |
| reviewedAt | string | 审核时间 |

## 组件架构

### 组件树

```
AppShell（现有壳层）
├── SOM 任务总览 (SomDashboard)
│   ├── 统计卡片 (StatCard)          ← 复用现有 Card 组件
│   ├── 子 Tab 切换 (SegmentedControl)
│   ├── 下发任务列表 (IssuedTaskList)
│   │   ├── 任务筛选栏 (TaskFilters)
│   │   ├── 任务表格 (TaskTable)
│   │   └── 新建下发弹窗 (CreateTaskModal)
│   │       ├── 模板选择器 (TemplateSelector)
│   │       └── 任务表单 (TaskForm)
│   ├── 执行监控面板 (ExecutionMonitor)
│   │   ├── 仓库进度总览 (WarehouseProgressTable)
│   │   └── 仓库明细展开 (WarehouseTaskDetail)
│   └── 统计看板 (StatsDashboard)    ── 使用图表
│       └── 趋势图/分布图
│
├── 任务主题管理 (TemplateManagement)
│   ├── 主题列表 (TemplateList)
│   └── 主题编辑弹窗 (TemplateEditModal)
│
├── 自动派发规则 (AutoDispatchRules)
│   ├── 规则列表 (RuleList)
│   └── 规则编辑弹窗 (RuleEditModal)
│
├── WT 任务中心 (WtTaskCenter)
│   ├── 全部/待执行列表 (WtTaskList)
│   │   ├── 任务筛选 (WtTaskFilters)
│   │   └── 任务卡片列表 (WtTaskCards)
│   ├── 任务执行视图 (TaskExecutionView)
│   │   ├── 拍照组件 (PhotoCapture)
│   │   ├── 完成标记 (CompletionToggle)
│   │   └── 工时填写 (HoursInput)
│   ├── 自建任务 (SelfCreateTask)
│   │   ├── 自建任务列表 (SelfCreateList)
│   │   └── 新建自建表单 (CreateSelfTaskForm)
│   └── 我的审核 (MyReview)
│       ├── 待审列表 (PendingReviewList)
│       └── 审核操作 (ReviewActions)
│
└── 移动端视图 (MobileTaskView)     ── 响应式/PDA H5 风格
    ├── 待执行列表 (MobileTaskList)
    └── 任务执行表单 (MobileTaskForm)
        ├── 拍照 (MobilePhotoCapture)
        └── 提交 (MobileSubmitButton)
```

### 数据管理

- 使用 React Context 或 useState 提升（遵循现有模式，不引入新状态库）
- 每个页面模块内部封装自己的状态和数据处理逻辑，不集中到 App.tsx
- 新建 `src/data/som-tasks.ts`、`src/data/wt-tasks.ts` 存放初始 mock 数据
- 任务主题和自动规则数据放在 `src/data/som-settings.ts`

## 文件结构

```
src/
├── pages/
│   ├── som/
│   │   ├── som-dashboard.tsx         ← SOM 任务总览（三个子 Tab）
│   │   ├── template-management.tsx   ← 任务主题管理
│   │   └── auto-dispatch-rules.tsx   ← 自动派发规则
│   └── wt/
│       ├── wt-task-center.tsx        ← WT 任务中心（四个子 Tab）
│       ├── task-execution-view.tsx   ← PC 端任务执行视图
│       └── mobile-task-view.tsx      ← 移动端任务执行视图
├── components/
│   └── tasks/                        ← 任务相关共享组件
│       ├── task-table.tsx             ← 任务表格（SOM/WT 复用）
│       ├── task-filters.tsx           ← 任务筛选栏
│       ├── task-form.tsx              ← 任务创建/编辑表单
│       ├── template-selector.tsx      ← 主题模板选择器
│       ├── photo-capture.tsx          ← 拍照组件（PC+移动）
│       ├── hours-input.tsx            ← 工时填写
│       └── stat-card.tsx              ← 统计卡片
└── data/
    ├── som-tasks.ts                   ← SOM 任务及模板 mock 数据
    ├── som-settings.ts               ← 主题模板、自动规则 mock 数据
    └── wt-tasks.ts                    ← WT 任务 mock 数据
```

## 与现有原型的集成

- 在 `WorkspaceTabKey` 中新增：`"som-dashboard"`、`"som-templates"`、`"som-auto-rules"`、`"wt-task-center"`、`"wt-task-execution"`、`"wt-mobile-view"`
- 在侧边栏导航配置中新增 SOM 专区条目与 WT 条目
- 壳层（AppShell）保持不变，新增页面共享现有 Tab 工作区模式
- 遵循现有 UI 组件库（Button、Card、Modal、Tabs、SegmentedControl、Drawer 等）

## 注意事项

- 移动端视图参考现有 `picking-pda-h5.tsx` 模式：响应式卡片布局，大按钮触控友好
- 自动派发规则在本原型中示意配置界面和模拟触发效果，不实现真实后台调度
- 拍照功能用文件上传占位模拟（现有 UploadDropzone 组件可复用）
- 初始 demo 数据覆盖：默认 3 个主题模板、2 条自动规则、批量预置任务
- 所有数据走内存 mock，不涉及真实 API
