# SOM/WT 任务系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SOM (headquarters) task dispatch system + WT (warehouse) task center integrated into the existing B2B admin prototype.

**Architecture:** New feature modules follow existing prototype patterns (self-contained page .tsx files, mock data in `src/data/`, state managed locally in pages, navigation added to `app-shell.tsx` navigation tree). SOM is a new top-level nav section; WT is a nav item under existing warehouse execution group. New Lucide icons added to shell imports.

**Tech Stack:** React 18 + TypeScript + TailwindCSS + Ant Design (antd) + Lucide icons. No routing library — uses existing Tab workspace pattern.

---

### Task 1: Data models + mock data for SOM and WT

**Files:**
- Create: `src/data/som-tasks.ts`
- Create: `src/data/wt-tasks.ts`

- [ ] **Step 1: Create `src/data/som-tasks.ts` with all SOM types and mock data**

```typescript
// src/data/som-tasks.ts
export type TaskPriority = "urgent" | "high" | "medium" | "low";

export type TaskFrequency = "once" | "daily" | "weekly" | "monthly" | "custom";

export type TaskType = "issued" | "self-piece" | "self-time";

export type TaskSource = "som" | "auto" | "wt";

/** SOM-issued task status */
export type SomTaskStatus =
  | "draft"       // 草稿
  | "issued"      // 已下发
  | "in_progress" // 执行中
  | "completed"   // 已完成
  | "overdue";    // 已逾期

/** WT self-created task status */
export type WtTaskStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "effective"
  | "in_progress"
  | "completed"
  | "overdue";

export type TaskTemplateStatus = "enabled" | "disabled";

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultPriority: TaskPriority;
  defaultFrequency: TaskFrequency;
  defaultBudgetHours: number;
  requirePhoto: boolean;
  requireNote: boolean;
  status: TaskTemplateStatus;
}

export const initialTaskTemplates: TaskTemplate[] = [
  {
    id: "tpl-defrost",
    name: "除霜",
    description: "冻库定期除霜作业，需拍摄除霜前/后照片",
    defaultPriority: "medium",
    defaultFrequency: "monthly",
    defaultBudgetHours: 4,
    requirePhoto: true,
    requireNote: true,
    status: "enabled",
  },
  {
    id: "tpl-thermometer",
    name: "子母温度计校准",
    description: "子母温度计定期校准，记录偏差值",
    defaultPriority: "high",
    defaultFrequency: "weekly",
    defaultBudgetHours: 1,
    requirePhoto: true,
    requireNote: true,
    status: "enabled",
  },
  {
    id: "tpl-expiry",
    name: "异常商品效期处理",
    description: "对效期不足7天的异常商品进行处理",
    defaultPriority: "urgent",
    defaultFrequency: "once",
    defaultBudgetHours: 2,
    requirePhoto: true,
    requireNote: true,
    status: "enabled",
  },
  {
    id: "tpl-cleaning",
    name: "库房清洁",
    description: "库房定期清洁整理",
    defaultPriority: "low",
    defaultFrequency: "weekly",
    defaultBudgetHours: 2,
    requirePhoto: false,
    requireNote: true,
    status: "enabled",
  },
];

export interface TaskExecution {
  id: string;
  taskId: string;
  executor: string;
  warehouse: string;
  completed: boolean;
  actualHours: number | null;
  note: string;
  photos: string[];
  submittedAt: string;
}

export interface Task {
  id: string;
  title: string;
  templateId: string | null;
  templateName: string;
  type: TaskType;
  source: TaskSource;
  sourceRuleId: string | null;
  priority: TaskPriority;
  targetWarehouses: string[];
  assignedRole: string;
  assignedPerson: string;
  budgetHours: number;
  frequency: TaskFrequency;
  cronExpression: string;
  plannedStart: string;
  plannedEnd: string;
  attachments: string[];
  description: string;
  requirePhoto: boolean;
  requireNote: boolean;
  status: SomTaskStatus | WtTaskStatus;
  executions: TaskExecution[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const initialSomTasks: Task[] = [
  {
    id: "SOM-001",
    title: "6月 A库除霜作业",
    templateId: "tpl-defrost",
    templateName: "除霜",
    type: "issued",
    source: "som",
    sourceRuleId: null,
    priority: "medium",
    targetWarehouses: ["A库"],
    assignedRole: "冻库主管",
    assignedPerson: "",
    budgetHours: 4,
    frequency: "monthly",
    cronExpression: "",
    plannedStart: "2026-06-01 08:00",
    plannedEnd: "2026-06-01 12:00",
    attachments: [],
    description: "6月定期除霜，覆盖1-3号冻库",
    requirePhoto: true,
    requireNote: true,
    status: "issued",
    executions: [],
    createdBy: "SOM管理员",
    createdAt: "2026-05-25 10:00",
    updatedAt: "2026-05-25 10:00",
  },
  {
    id: "SOM-002",
    title: "5月 B库除霜作业",
    templateId: "tpl-defrost",
    templateName: "除霜",
    type: "issued",
    source: "som",
    sourceRuleId: null,
    priority: "medium",
    targetWarehouses: ["B库"],
    assignedRole: "冻库主管",
    assignedPerson: "",
    budgetHours: 4,
    frequency: "monthly",
    cronExpression: "",
    plannedStart: "2026-05-15 08:00",
    plannedEnd: "2026-05-15 12:00",
    attachments: [],
    description: "",
    requirePhoto: true,
    requireNote: true,
    status: "completed",
    executions: [
      {
        id: "exec-002",
        taskId: "SOM-002",
        executor: "张三",
        warehouse: "B库",
        completed: true,
        actualHours: 3.5,
        note: "除霜完成，温度恢复正常",
        photos: ["photo-demo-1.jpg", "photo-demo-2.jpg"],
        submittedAt: "2026-05-15 11:30",
      },
    ],
    createdBy: "SOM管理员",
    createdAt: "2026-05-14 09:00",
    updatedAt: "2026-05-15 11:30",
  },
  {
    id: "SOM-003",
    title: "A库温度计校准-第22周",
    templateId: "tpl-thermometer",
    templateName: "子母温度计校准",
    type: "issued",
    source: "som",
    sourceRuleId: null,
    priority: "high",
    targetWarehouses: ["A库"],
    assignedRole: "品控员",
    assignedPerson: "",
    budgetHours: 1,
    frequency: "weekly",
    cronExpression: "",
    plannedStart: "2026-05-25 09:00",
    plannedEnd: "2026-05-25 10:00",
    attachments: [],
    description: "校准1号库全部子母温度计",
    requirePhoto: true,
    requireNote: true,
    status: "in_progress",
    executions: [],
    createdBy: "SOM管理员",
    createdAt: "2026-05-24 08:00",
    updatedAt: "2026-05-25 09:00",
  },
  {
    id: "SOM-004",
    title: "异常商品效期处理-A库",
    templateId: "tpl-expiry",
    templateName: "异常商品效期处理",
    type: "issued",
    source: "auto",
    sourceRuleId: "rule-expiry",
    priority: "urgent",
    targetWarehouses: ["A库"],
    assignedRole: "值班人员",
    assignedPerson: "",
    budgetHours: 2,
    frequency: "once",
    cronExpression: "",
    plannedStart: "2026-05-25 10:00",
    plannedEnd: "2026-05-25 12:00",
    attachments: [],
    description: "系统自动扫描发现以下商品效期不足7天：\n- 鲜牛奶（批号：B20260518）效期至2026-05-28\n- 酸奶（批号：B20260519）效期至2026-05-29",
    requirePhoto: true,
    requireNote: true,
    status: "in_progress",
    executions: [],
    createdBy: "自动派发",
    createdAt: "2026-05-25 10:00",
    updatedAt: "2026-05-25 10:00",
  },
  {
    id: "SOM-005",
    title: "B库温度计校准-第22周",
    templateId: "tpl-thermometer",
    templateName: "子母温度计校准",
    type: "issued",
    source: "som",
    sourceRuleId: null,
    priority: "high",
    targetWarehouses: ["B库"],
    assignedRole: "品控员",
    assignedPerson: "",
    budgetHours: 1,
    frequency: "weekly",
    cronExpression: "",
    plannedStart: "2026-05-25 14:00",
    plannedEnd: "2026-05-25 15:00",
    attachments: [],
    description: "",
    requirePhoto: true,
    requireNote: true,
    status: "overdue",
    executions: [],
    createdBy: "SOM管理员",
    createdAt: "2026-05-24 08:00",
    updatedAt: "2026-05-25 15:00",
  },
];

export type AutoDispatchRuleStatus = "enabled" | "disabled";

export interface AutoDispatchRule {
  id: string;
  name: string;
  description: string;
  triggerCron: string;
  triggerDescription: string;
  conditionDescription: string;
  targetWarehouses: "all" | string[];
  targetTemplateId: string;
  priorityOverride: TaskPriority | null;
  status: AutoDispatchRuleStatus;
}

export const initialAutoDispatchRules: AutoDispatchRule[] = [
  {
    id: "rule-expiry",
    name: "异常商品效期自动派发",
    description: "每日自动扫描库存商品效期，对效期不足7天的商品生成处理任务下发给对应仓库",
    triggerCron: "0 8 * * *",
    triggerDescription: "每日 08:00",
    conditionDescription: "扫描全仓库存，效期 < 7天",
    targetWarehouses: "all",
    targetTemplateId: "tpl-expiry",
    priorityOverride: "urgent",
    status: "enabled",
  },
  {
    id: "rule-defrost-reminder",
    name: "月度除霜提醒",
    description: "每月1日自动生成当月除霜任务下发给各仓",
    triggerCron: "0 6 1 * *",
    triggerDescription: "每月1日 06:00",
    conditionDescription: "按仓库生成当月除霜计划",
    targetWarehouses: "all",
    targetTemplateId: "tpl-defrost",
    priorityOverride: null,
    status: "enabled",
  },
];
```

- [ ] **Step 2: Create `src/data/wt-tasks.ts` with WT-specific task data**

```typescript
// src/data/wt-tasks.ts
import type { Task } from "./som-tasks";

export const initialWtTasks: Task[] = [
  {
    id: "WT-001",
    title: "包材盘点与整理",
    templateId: null,
    templateName: "包材盘点",
    type: "self-piece",
    source: "wt",
    sourceRuleId: null,
    priority: "medium",
    targetWarehouses: ["A库"],
    assignedRole: "",
    assignedPerson: "李四",
    budgetHours: 4,
    frequency: "once",
    cronExpression: "",
    plannedStart: "2026-05-26 08:00",
    plannedEnd: "2026-05-26 17:00",
    attachments: [],
    description: "盘点A库所有包材库存，整理堆放区域",
    requirePhoto: true,
    requireNote: true,
    status: "pending_review",
    executions: [],
    createdBy: "李四",
    createdAt: "2026-05-25 14:00",
    updatedAt: "2026-05-25 14:00",
  },
  {
    id: "WT-002",
    title: "B库冷库设备巡检",
    templateId: null,
    templateName: "设备巡检",
    type: "self-time",
    source: "wt",
    sourceRuleId: null,
    priority: "high",
    targetWarehouses: ["B库"],
    assignedRole: "",
    assignedPerson: "王五",
    budgetHours: 2,
    frequency: "once",
    cronExpression: "",
    plannedStart: "2026-05-27 09:00",
    plannedEnd: "2026-05-27 12:00",
    attachments: [],
    description: "巡检B库1-4号冷库设备运行状态",
    requirePhoto: true,
    requireNote: true,
    status: "approved",
    executions: [],
    createdBy: "王五",
    createdAt: "2026-05-24 10:00",
    updatedAt: "2026-05-25 09:00",
  },
  {
    id: "WT-003",
    title: "A库月度耗材清点",
    templateId: null,
    templateName: "耗材清点",
    type: "self-piece",
    source: "wt",
    sourceRuleId: null,
    priority: "low",
    targetWarehouses: ["A库"],
    assignedRole: "",
    assignedPerson: "赵六",
    budgetHours: 3,
    frequency: "once",
    cronExpression: "",
    plannedStart: "2026-05-28 08:00",
    plannedEnd: "2026-05-28 12:00",
    attachments: [],
    description: "",
    requirePhoto: false,
    requireNote: true,
    status: "rejected",
    executions: [],
    createdBy: "赵六",
    createdAt: "2026-05-23 14:00",
    updatedAt: "2026-05-24 10:00",
  },
];
```

---

### Task 2: SOM Dashboard page

**Files:**
- Create: `src/pages/som/som-dashboard.tsx`

The SOM Dashboard has three sub-tabs: 下发任务 (Issued Tasks), 执行监控 (Execution Monitor), 统计看板 (Stats Dashboard).

- [ ] **Step 1: Create `src/pages/som/som-dashboard.tsx` with stat cards and sub-tab navigation**

```typescript
// src/pages/som/som-dashboard.tsx
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Send } from "lucide-react";
import type { Task } from "../../data/som-tasks";
import { initialSomTasks } from "../../data/som-tasks";
import { Card } from "../../components/ui/card";
import { SegmentedControl } from "../../components/ui/segmented-control";
import { IssuedTasksTab } from "./issued-tasks-tab";
import { ExecutionMonitorTab } from "./execution-monitor-tab";
import { StatsDashboardTab } from "./stats-dashboard-tab";

type SubTab = "issued" | "monitor" | "stats";

const priorityLabels: Record<string, string> = {
  urgent: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

const statusLabels: Record<string, string> = {
  draft: "草稿",
  issued: "已下发",
  in_progress: "执行中",
  completed: "已完成",
  overdue: "已逾期",
  pending_review: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  effective: "已生效",
};

const sourceLabels: Record<string, string> = {
  som: "SOM下发",
  auto: "自动触发",
  wt: "WT自建",
};

const typeLabels: Record<string, string> = {
  issued: "下发",
  "self-piece": "计件",
  "self-time": "计时",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-sm border border-border bg-white p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-sm ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <div className="text-h2 font-h2">{value}</div>
        <div className="text-body text-text-secondary">{label}</div>
      </div>
    </div>
  );
}

export { priorityLabels, statusLabels, sourceLabels, typeLabels };

export function SomDashboard({
  onCreateTask,
}: {
  onCreateTask?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SubTab>("issued");
  const [tasks, setTasks] = useState<Task[]>(initialSomTasks);

  const stats = useMemo(() => {
    const somTasks = tasks.filter((t) => t.source === "som" || t.source === "auto");
    return {
      total: somTasks.length,
      inProgress: somTasks.filter((t) => t.status === "in_progress").length,
      completed: somTasks.filter((t) => t.status === "completed").length,
      overdue: somTasks.filter((t) => t.status === "overdue").length,
    };
  }, [tasks]);

  const subTabs = [
    { value: "issued" as const, label: "下发任务" },
    { value: "monitor" as const, label: "执行监控" },
    { value: "stats" as const, label: "统计看板" },
  ];

  return (
    <div className="space-y-page-block p-page-block">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-h1">SOM 任务总览</h1>
          <p className="mt-1 text-body text-text-secondary">总部任务下发、执行监控与统计</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Send} label="总下发数" value={stats.total} color="bg-primary" />
        <StatCard icon={Clock} label="执行中" value={stats.inProgress} color="bg-warning" />
        <StatCard icon={CheckCircle2} label="已完成" value={stats.completed} color="bg-success" />
        <StatCard icon={AlertTriangle} label="已逾期" value={stats.overdue} color="bg-danger" />
      </div>

      {/* Sub-tab navigation */}
      <SegmentedControl items={subTabs} value={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "issued" && (
        <IssuedTasksTab
          tasks={tasks}
          onTasksChange={setTasks}
          onCreateTask={onCreateTask}
        />
      )}
      {activeTab === "monitor" && <ExecutionMonitorTab tasks={tasks} />}
      {activeTab === "stats" && <StatsDashboardTab tasks={tasks} />}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/pages/som/issued-tasks-tab.tsx` — the main task list with filters**

```typescript
// src/pages/som/issued-tasks-tab.tsx
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Task, TaskPriority } from "../../data/som-tasks";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { statusLabels, sourceLabels, priorityLabels } from "./som-dashboard";

type FilterState = {
  warehouse: string;
  template: string;
  status: string;
  priority: string;
};

export function IssuedTasksTab({
  tasks,
  onTasksChange,
  onCreateTask,
}: {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onCreateTask?: () => void;
}) {
  const [filters, setFilters] = useState<FilterState>({
    warehouse: "",
    template: "",
    status: "",
    priority: "",
  });

  const warehouses = useMemo(
    () => [...new Set(tasks.flatMap((t) => t.targetWarehouses))],
    [tasks],
  );

  const templates = useMemo(
    () => [...new Set(tasks.map((t) => t.templateName))],
    [tasks],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (filters.warehouse && !t.targetWarehouses.includes(filters.warehouse)) return false;
        if (filters.template && t.templateName !== filters.template) return false;
        if (filters.status && t.status !== filters.status) return false;
        if (filters.priority && t.priority !== filters.priority) return false;
        return true;
      }),
    [tasks, filters],
  );

  const statusOptions = [
    { label: "全部状态", value: "" },
    ...Object.entries(statusLabels).map(([k, v]) => ({ label: v, value: k })),
  ];
  const priorityOptions = [
    { label: "全部优先级", value: "" },
    ...Object.entries(priorityLabels).map(([k, v]) => ({ label: v, value: k })),
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            className="h-input-md rounded-sm border border-border bg-white px-3 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle"
            value={filters.warehouse}
            onChange={(e) => setFilters((f) => ({ ...f, warehouse: e.target.value }))}
          >
            <option value="">全部仓库</option>
            {warehouses.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <select
            className="h-input-md rounded-sm border border-border bg-white px-3 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle"
            value={filters.template}
            onChange={(e) => setFilters((f) => ({ ...f, template: e.target.value }))}
          >
            <option value="">全部主题</option>
            {templates.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Select
            className="w-32"
            options={statusOptions}
            value={filters.status}
            placeholder="状态"
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
          <Select
            className="w-32"
            options={priorityOptions}
            value={filters.priority}
            placeholder="优先级"
            onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
          />
        </div>
        <Button onClick={onCreateTask}>
          <Plus className="mr-1 h-4 w-4" />
          新建下发
        </Button>
      </div>

      {/* Task table */}
      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-body">
          <thead className="bg-bg-subtle text-left text-body text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-body-strong">任务标题</th>
              <th className="px-4 py-3 font-body-strong">主题模板</th>
              <th className="px-4 py-3 font-body-strong">来源</th>
              <th className="px-4 py-3 font-body-strong">目标仓库</th>
              <th className="px-4 py-3 font-body-strong">优先级</th>
              <th className="px-4 py-3 font-body-strong">计划时间</th>
              <th className="px-4 py-3 font-body-strong">状态</th>
              <th className="px-4 py-3 font-body-strong">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-text-muted">暂无数据</td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-body-strong text-text-primary">{task.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{task.templateName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                      task.source === "auto"
                        ? "bg-warning-subtle text-warning"
                        : "bg-primary-subtle text-primary"
                    }`}>
                      {sourceLabels[task.source]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{task.targetWarehouses.join("、")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                      task.priority === "urgent" ? "bg-danger-subtle text-danger" :
                      task.priority === "high" ? "bg-warning-subtle text-warning" :
                      "bg-bg-subtle text-text-secondary"
                    }`}>
                      {priorityLabels[task.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-small">
                    <div>{task.plannedStart}</div>
                    <div className="text-text-muted">至 {task.plannedEnd}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                      task.status === "completed" ? "bg-success-subtle text-success" :
                      task.status === "overdue" ? "bg-danger-subtle text-danger" :
                      task.status === "in_progress" ? "bg-warning-subtle text-warning" :
                      "bg-bg-subtle text-text-secondary"
                    }`}>
                      {statusLabels[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-body text-primary hover:text-primary-hover transition-colors"
                      onClick={() => {
                        const detail = tasks.find((t) => t.id === task.id);
                        if (detail) alert(JSON.stringify(detail, null, 2));
                      }}
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/pages/som/execution-monitor-tab.tsx` — warehouse-level progress view**

```typescript
// src/pages/som/execution-monitor-tab.tsx
import { useMemo, useState } from "react";
import type { Task } from "../../data/som-tasks";
import { statusLabels } from "./som-dashboard";

export function ExecutionMonitorTab({ tasks }: { tasks: Task[] }) {
  const warehouseStats = useMemo(() => {
    const somTasks = tasks.filter((t) => t.source === "som" || t.source === "auto");
    const warehouseMap = new Map<string, { total: number; inProgress: number; completed: number; overdue: number }>();

    somTasks.forEach((t) => {
      t.targetWarehouses.forEach((w) => {
        const current = warehouseMap.get(w) ?? { total: 0, inProgress: 0, completed: 0, overdue: 0 };
        current.total++;
        if (t.status === "in_progress") current.inProgress++;
        if (t.status === "completed") current.completed++;
        if (t.status === "overdue") current.overdue++;
        warehouseMap.set(w, current);
      });
    });

    return Array.from(warehouseMap.entries()).map(([warehouse, stats]) => ({
      warehouse,
      ...stats,
      progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }));
  }, [tasks]);

  const [expandedWarehouse, setExpandedWarehouse] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-body">
          <thead className="bg-bg-subtle text-left text-body text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-body-strong">仓库</th>
              <th className="px-4 py-3 font-body-strong">总任务</th>
              <th className="px-4 py-3 font-body-strong">执行中</th>
              <th className="px-4 py-3 font-body-strong">已完成</th>
              <th className="px-4 py-3 font-body-strong">已逾期</th>
              <th className="px-4 py-3 font-body-strong">完成进度</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {warehouseStats.map((ws) => (
              <>
                <tr
                  key={ws.warehouse}
                  className="hover:bg-bg-hover transition-colors cursor-pointer"
                  onClick={() => setExpandedWarehouse(expandedWarehouse === ws.warehouse ? null : ws.warehouse)}
                >
                  <td className="px-4 py-3 font-body-strong text-text-primary">{ws.warehouse}</td>
                  <td className="px-4 py-3 text-text-secondary">{ws.total}</td>
                  <td className="px-4 py-3 text-warning">{ws.inProgress}</td>
                  <td className="px-4 py-3 text-success">{ws.completed}</td>
                  <td className="px-4 py-3 text-danger">{ws.overdue}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-bg-subtle overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${ws.progress}%` }}
                        />
                      </div>
                      <span className="text-small text-text-secondary w-10 text-right">{ws.progress}%</span>
                    </div>
                  </td>
                </tr>
                {expandedWarehouse === ws.warehouse && (
                  <tr key={`${ws.warehouse}-detail`}>
                    <td colSpan={6} className="bg-bg-page px-6 py-4">
                      <div className="space-y-2">
                        {tasks
                          .filter((t) => t.targetWarehouses.includes(ws.warehouse))
                          .map((t) => (
                            <div key={t.id} className="flex items-center justify-between rounded-sm border border-border bg-white px-4 py-2">
                              <div className="flex items-center gap-4">
                                <span className="font-body-strong text-text-primary text-body">{t.title}</span>
                                <span className="text-small text-text-muted">{t.plannedStart} ~ {t.plannedEnd}</span>
                              </div>
                              <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                                t.status === "completed" ? "bg-success-subtle text-success" :
                                t.status === "overdue" ? "bg-danger-subtle text-danger" :
                                t.status === "in_progress" ? "bg-warning-subtle text-warning" :
                                "bg-bg-subtle text-text-secondary"
                              }`}>
                                {statusLabels[t.status] || t.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/pages/som/stats-dashboard-tab.tsx` — simple stats overview**

```typescript
// src/pages/som/stats-dashboard-tab.tsx
import { useMemo } from "react";
import type { Task } from "../../data/som-tasks";
import { statusLabels } from "./som-dashboard";
import { Card } from "../../components/ui/card";

export function StatsDashboardTab({ tasks }: { tasks: Task[] }) {
  const somTasks = useMemo(() => tasks.filter((t) => t.source === "som" || t.source === "auto"), [tasks]);

  const templateDistribution = useMemo(() => {
    const map = new Map<string, number>();
    somTasks.forEach((t) => {
      map.set(t.templateName, (map.get(t.templateName) ?? 0) + 1);
    });
    return Array.from(map.entries());
  }, [somTasks]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    somTasks.forEach((t) => {
      const month = t.createdAt.slice(0, 7);
      const current = map.get(month) ?? { total: 0, completed: 0 };
      current.total++;
      if (t.status === "completed") current.completed++;
      map.set(month, current);
    });
    return Array.from(map.entries()).sort();
  }, [somTasks]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card title="主题分布">
        <div className="space-y-3 pt-2">
          {templateDistribution.map(([name, count]) => (
            <div key={name} className="flex items-center justify-between">
              <span className="text-body text-text-primary">{name}</span>
              <span className="text-body text-text-secondary">{count}个任务</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="月度趋势">
        <div className="space-y-3 pt-2">
          {monthlyTrend.map(([month, stats]) => (
            <div key={month} className="space-y-1">
              <div className="flex items-center justify-between text-body">
                <span className="text-text-primary">{month}</span>
                <span className="text-text-secondary">
                  {stats.completed}/{stats.total} 已完成
                </span>
              </div>
              <div className="h-2 rounded-full bg-bg-subtle overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
          {monthlyTrend.length === 0 && (
            <div className="py-8 text-center text-body text-text-muted">暂无数据</div>
          )}
        </div>
      </Card>
    </div>
  );
}
```

---

### Task 3: SOM Template Management page

**Files:**
- Create: `src/pages/som/template-management.tsx`

- [ ] **Step 1: Create `src/pages/som/template-management.tsx`**

```typescript
// src/pages/som/template-management.tsx
import { useState } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import type { TaskTemplate, TaskTemplateStatus, TaskFrequency } from "../../data/som-tasks";
import { initialTaskTemplates } from "../../data/som-tasks";
import { Button } from "../../components/ui/button";
import { Modal } from "../../components/ui/modal";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { priorityLabels } from "./som-dashboard";

const frequencyLabels: Record<TaskFrequency, string> = {
  once: "一次性",
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
  custom: "自定义",
};

const templateStatusLabels: Record<TaskTemplateStatus, string> = {
  enabled: "启用",
  disabled: "禁用",
};

export function TemplateManagement() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(initialTaskTemplates);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  function handleToggleStatus(tpl: TaskTemplate) {
    setTemplates((current) =>
      current.map((t) =>
        t.id === tpl.id ? { ...t, status: t.status === "enabled" ? "disabled" : "enabled" } : t,
      ),
    );
  }

  return (
    <div className="space-y-page-block p-page-block">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-h1">任务主题管理</h1>
          <p className="mt-1 text-body text-text-secondary">维护总部任务下发的主题模板</p>
        </div>
        <Button onClick={() => setEditingTemplate({
          id: `tpl-${Date.now()}`,
          name: "",
          description: "",
          defaultPriority: "medium",
          defaultFrequency: "once",
          defaultBudgetHours: 1,
          requirePhoto: false,
          requireNote: true,
          status: "enabled",
        })}>
          <Plus className="mr-1 h-4 w-4" />
          新建主题
        </Button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-body">
          <thead className="bg-bg-subtle text-left text-body text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-body-strong">名称</th>
              <th className="px-4 py-3 font-body-strong">说明</th>
              <th className="px-4 py-3 font-body-strong">默认优先级</th>
              <th className="px-4 py-3 font-body-strong">默认频率</th>
              <th className="px-4 py-3 font-body-strong">默认工时</th>
              <th className="px-4 py-3 font-body-strong">状态</th>
              <th className="px-4 py-3 font-body-strong">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {templates.map((tpl) => (
              <tr key={tpl.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3 font-body-strong text-text-primary">{tpl.name}</td>
                <td className="px-4 py-3 text-text-secondary max-w-[240px] truncate">{tpl.description}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                    tpl.defaultPriority === "urgent" ? "bg-danger-subtle text-danger" :
                    tpl.defaultPriority === "high" ? "bg-warning-subtle text-warning" :
                    "bg-bg-subtle text-text-secondary"
                  }`}>
                    {priorityLabels[tpl.defaultPriority]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{frequencyLabels[tpl.defaultFrequency]}</td>
                <td className="px-4 py-3 text-text-secondary">{tpl.defaultBudgetHours}h</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                    tpl.status === "enabled" ? "bg-success-subtle text-success" : "bg-bg-subtle text-text-muted"
                  }`}>
                    {templateStatusLabels[tpl.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-body text-primary hover:text-primary-hover transition-colors"
                      onClick={() => setEditingTemplate({ ...tpl })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      编辑
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-body text-text-secondary hover:text-text-primary transition-colors"
                      onClick={() => handleToggleStatus(tpl)}
                    >
                      {tpl.status === "enabled" ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {tpl.status === "enabled" ? "禁用" : "启用"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editingTemplate ? (
        <TemplateEditModal
          template={editingTemplate}
          onSave={(updated) => {
            setTemplates((current) => {
              const exists = current.some((t) => t.id === updated.id);
              return exists
                ? current.map((t) => (t.id === updated.id ? updated : t))
                : [...current, updated];
            });
            setEditingTemplate(null);
          }}
          onClose={() => setEditingTemplate(null)}
        />
      ) : null}
    </div>
  );
}

function TemplateEditModal({
  template,
  onSave,
  onClose,
}: {
  template: TaskTemplate;
  onSave: (tpl: TaskTemplate) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TaskTemplate>({ ...template });

  return (
    <Modal title={template.id.startsWith("tpl-") && !initialTaskTemplates.some((t) => t.id === template.id) ? "新建主题" : "编辑主题"} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div>
          <div className="field-label">主题名称</div>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="输入主题名称" />
        </div>
        <div>
          <div className="field-label">说明/作业指导</div>
          <textarea
            className="w-full h-24 rounded-sm border border-border bg-white px-3 py-2 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle resize-y"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="输入作业说明"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="field-label">默认优先级</div>
            <Select
              options={Object.entries(priorityLabels).map(([k, v]) => ({ label: v, value: k }))}
              value={form.defaultPriority}
              onChange={(v) => setForm((f) => ({ ...f, defaultPriority: v as any }))}
            />
          </div>
          <div>
            <div className="field-label">默认频率</div>
            <Select
              options={Object.entries(frequencyLabels).map(([k, v]) => ({ label: v, value: k }))}
              value={form.defaultFrequency}
              onChange={(v) => setForm((f) => ({ ...f, defaultFrequency: v as any }))}
            />
          </div>
          <div>
            <div className="field-label">默认工时（小时）</div>
            <Input
              type="number"
              step={0.5}
              value={form.defaultBudgetHours}
              onChange={(e) => setForm((f) => ({ ...f, defaultBudgetHours: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requirePhoto}
              onChange={(e) => setForm((f) => ({ ...f, requirePhoto: e.target.checked }))}
              className="rounded-sm border-border"
            />
            <span className="text-body text-text-primary">需要拍照反馈</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requireNote}
              onChange={(e) => setForm((f) => ({ ...f, requireNote: e.target.checked }))}
              className="rounded-sm border-border"
            />
            <span className="text-body text-text-primary">需要填写备注</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => onSave(form)}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

### Task 4: SOM Auto Dispatch Rules page

**Files:**
- Create: `src/pages/som/auto-dispatch-rules.tsx`

- [ ] **Step 1: Create `src/pages/som/auto-dispatch-rules.tsx`**

```typescript
// src/pages/som/auto-dispatch-rules.tsx
import { useState } from "react";
import { Play, ToggleLeft, ToggleRight } from "lucide-react";
import { initialAutoDispatchRules } from "../../data/som-tasks";
import type { AutoDispatchRule } from "../../data/som-tasks";
import { Button } from "../../components/ui/button";

export function AutoDispatchRules() {
  const [rules, setRules] = useState<AutoDispatchRule[]>(initialAutoDispatchRules);

  function handleToggleStatus(rule: AutoDispatchRule) {
    setRules((current) =>
      current.map((r) =>
        r.id === rule.id ? { ...r, status: r.status === "enabled" ? "disabled" : "enabled" } : r,
      ),
    );
  }

  function handleExecuteNow(rule: AutoDispatchRule) {
    alert(`规则「${rule.name}」已触发执行，系统将扫描并生成任务下发到各仓库。`);
  }

  return (
    <div className="space-y-page-block p-page-block">
      <div>
        <h1 className="text-h1 font-h1">自动派发规则</h1>
        <p className="mt-1 text-body text-text-secondary">配置系统自动扫描库存并生成下发任务的规则</p>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-sm border border-border bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-body-lg font-body-strong text-text-primary">{rule.name}</h3>
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                    rule.status === "enabled" ? "bg-success-subtle text-success" : "bg-bg-subtle text-text-muted"
                  }`}>
                    {rule.status === "enabled" ? "已启用" : "已禁用"}
                  </span>
                </div>
                <p className="text-body text-text-secondary">{rule.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExecuteNow(rule)}>
                  <Play className="mr-1 h-3.5 w-3.5" />
                  立即执行
                </Button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-small text-text-secondary hover:bg-bg-hover transition-colors"
                  onClick={() => handleToggleStatus(rule)}
                >
                  {rule.status === "enabled" ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  {rule.status === "enabled" ? "禁用" : "启用"}
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4 text-small">
              <div>
                <span className="text-text-muted">触发时间：</span>
                <span className="text-text-primary">{rule.triggerDescription}</span>
              </div>
              <div>
                <span className="text-text-muted">扫描条件：</span>
                <span className="text-text-primary">{rule.conditionDescription}</span>
              </div>
              <div>
                <span className="text-text-muted">目标仓库：</span>
                <span className="text-text-primary">{rule.targetWarehouses === "all" ? "全部仓库" : rule.targetWarehouses.join("、")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 5: WT Task Center page

**Files:**
- Create: `src/pages/wt/wt-task-center.tsx`

- [ ] **Step 1: Create `src/pages/wt/wt-task-center.tsx`**

```typescript
// src/pages/wt/wt-task-center.tsx
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Task, TaskPriority } from "../../data/som-tasks";
import { initialSomTasks } from "../../data/som-tasks";
import { initialWtTasks } from "../../data/wt-tasks";
import { Button } from "../../components/ui/button";
import { SegmentedControl } from "../../components/ui/segmented-control";
import { statusLabels, sourceLabels, priorityLabels, typeLabels } from "../som/som-dashboard";
import { TaskExecutionView } from "./task-execution-view";
import { MobileTaskView } from "./mobile-task-view";

type WtSubTab = "all" | "pending" | "self" | "review";

// Combine SOM tasks assigned to this warehouse plus WT self-created tasks
const demoWarehouse = "A库";

const statusLabelMap: Record<string, string> = {
  ...statusLabels,
  pending_review: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  effective: "已生效",
  draft: "草稿",
};

export function WtTaskCenter() {
  const [activeTab, setActiveTab] = useState<WtSubTab>("all");
  const [activeExecutionTask, setActiveExecutionTask] = useState<Task | null>(null);
  const [showMobileView, setShowMobileView] = useState(false);
  const [mobileExecutionTask, setMobileExecutionTask] = useState<Task | null>(null);

  // All tasks visible to this warehouse: SOM tasks targeting this warehouse + WT self-created tasks
  const allTasks = useMemo(() => {
    const somAssigned = initialSomTasks.filter((t) =>
      t.targetWarehouses.includes(demoWarehouse),
    );
    return [...somAssigned, ...initialWtTasks];
  }, []);

  const pendingTasks = useMemo(
    () => allTasks.filter((t) => t.status === "issued" || t.status === "effective" || t.status === "in_progress"),
    [allTasks],
  );

  const selfTasks = useMemo(
    () => allTasks.filter((t) => t.source === "wt"),
    [allTasks],
  );

  const reviewTasks = useMemo(
    () => allTasks.filter((t) => t.status === "pending_review"),
    [allTasks],
  );

  const subTabs = [
    { value: "all" as const, label: `全部任务(${allTasks.length})` },
    { value: "pending" as const, label: `待执行(${pendingTasks.length})` },
    { value: "self" as const, label: `自建任务(${selfTasks.length})` },
    { value: "review" as const, label: `我的审核(${reviewTasks.length})` },
  ];

  if (activeExecutionTask) {
    return (
      <TaskExecutionView
        task={activeExecutionTask}
        onBack={() => setActiveExecutionTask(null)}
        onSwitchToMobile={() => {
          setMobileExecutionTask(activeExecutionTask);
          setActiveExecutionTask(null);
          setShowMobileView(true);
        }}
      />
    );
  }

  if (showMobileView && mobileExecutionTask) {
    return (
      <MobileTaskView
        task={mobileExecutionTask}
        onBack={() => {
          setShowMobileView(false);
          setMobileExecutionTask(null);
        }}
        onSubmitted={() => {
          setShowMobileView(false);
          setMobileExecutionTask(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-page-block p-page-block">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-h1">WT 任务中心</h1>
          <p className="mt-1 text-body text-text-secondary">
            当前仓库：{demoWarehouse} {activeTab !== "review" ? "· PC端视图" : ""}
          </p>
        </div>
      </div>

      <SegmentedControl items={subTabs} value={activeTab} onChange={setActiveTab} />

      {activeTab === "all" && (
        <TaskListSection
          tasks={allTasks}
          onExecute={(task) => setActiveExecutionTask(task)}
          showReviewButton
        />
      )}
      {activeTab === "pending" && (
        <TaskListSection
          tasks={pendingTasks}
          onExecute={(task) => setActiveExecutionTask(task)}
        />
      )}
      {activeTab === "self" && (
        <SelfTaskSection />
      )}
      {activeTab === "review" && (
        <ReviewSection tasks={reviewTasks} />
      )}
    </div>
  );
}

function SelfTaskSection() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-body text-text-secondary">可创建计件或计时任务，提交后需经理审核</p>
        <Button onClick={() => alert("新建自建任务表单")}>
          <Plus className="mr-1 h-4 w-4" />
          新建自建任务
        </Button>
      </div>
    </div>
  );
}

function ReviewSection({ tasks }: { tasks: Task[] }) {
  const [localTasks, setLocalTasks] = useState(tasks);

  function handleReview(taskId: string, action: "approved" | "rejected") {
    setLocalTasks((current) =>
      current.map((t) =>
        t.id === taskId
          ? { ...t, status: action === "approved" ? ("approved" as const) : ("rejected" as const) }
          : t,
      ),
    );
  }

  if (localTasks.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-white py-12 text-center text-body text-text-muted">
        暂无待审核任务
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {localTasks.map((task) => (
        <div key={task.id} className="rounded-sm border border-border bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-body-lg font-body-strong text-text-primary">{task.title}</h3>
              <p className="mt-1 text-small text-text-muted">
                {task.type === "self-piece" ? "计件" : "计时"} · {task.assignedPerson} · {task.plannedStart}
              </p>
              {task.description && <p className="mt-2 text-body text-text-secondary">{task.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleReview(task.id, "rejected")}>
                驳回
              </Button>
              <Button size="sm" onClick={() => handleReview(task.id, "approved")}>
                通过
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskListSection({
  tasks,
  onExecute,
  showReviewButton,
}: {
  tasks: Task[];
  onExecute: (task: Task) => void;
  showReviewButton?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-white">
      <table className="w-full text-body">
        <thead className="bg-bg-subtle text-left text-body text-text-secondary">
          <tr>
            <th className="px-4 py-3 font-body-strong">任务标题</th>
            <th className="px-4 py-3 font-body-strong">来源</th>
            <th className="px-4 py-3 font-body-strong">执行人</th>
            <th className="px-4 py-3 font-body-strong">优先级</th>
            <th className="px-4 py-3 font-body-strong">截止时间</th>
            <th className="px-4 py-3 font-body-strong">状态</th>
            <th className="px-4 py-3 font-body-strong">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-text-muted">暂无任务</td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3 font-body-strong text-text-primary">{task.title}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                    task.source === "auto" ? "bg-warning-subtle text-warning" :
                    task.source === "som" ? "bg-primary-subtle text-primary" :
                    "bg-bg-subtle text-text-secondary"
                  }`}>
                    {sourceLabels[task.source]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {task.assignedPerson || task.assignedRole || "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                    task.priority === "urgent" ? "bg-danger-subtle text-danger" :
                    task.priority === "high" ? "bg-warning-subtle text-warning" :
                    "bg-bg-subtle text-text-secondary"
                  }`}>
                    {priorityLabels[task.priority]}
                  </span>
                </td>
                <td className="px-4 py-3 text-small text-text-secondary">{task.plannedEnd}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                    task.status === "completed" ? "bg-success-subtle text-success" :
                    task.status === "overdue" ? "bg-danger-subtle text-danger" :
                    task.status === "in_progress" ? "bg-warning-subtle text-warning" :
                    task.status === "pending_review" ? "bg-warning-subtle text-warning" :
                    task.status === "approved" ? "bg-success-subtle text-success" :
                    task.status === "rejected" ? "bg-danger-subtle text-danger" :
                    "bg-bg-subtle text-text-secondary"
                  }`}>
                    {statusLabelMap[task.status] || task.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(task.status === "issued" || task.status === "effective" || task.status === "in_progress") ? (
                    <Button size="sm" onClick={() => onExecute(task)}>
                      执行
                    </Button>
                  ) : (
                    <button
                      type="button"
                      className="text-body text-primary hover:text-primary-hover transition-colors"
                      onClick={() => alert(JSON.stringify(task, null, 2))}
                    >
                      查看
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Task 6: WT Task Execution View (PC)

**Files:**
- Create: `src/pages/wt/task-execution-view.tsx`

- [ ] **Step 1: Create `src/pages/wt/task-execution-view.tsx`**

```typescript
// src/pages/wt/task-execution-view.tsx
import { useState } from "react";
import { ArrowLeft, Camera, Smartphone } from "lucide-react";
import type { Task } from "../../data/som-tasks";
import { Button } from "../../components/ui/button";

export function TaskExecutionView({
  task,
  onBack,
  onSwitchToMobile,
}: {
  task: Task;
  onBack: () => void;
  onSwitchToMobile: () => void;
}) {
  const [completed, setCompleted] = useState(false);
  const [actualHours, setActualHours] = useState(task.budgetHours);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  function handleSubmit() {
    alert(`任务已提交：\n完成状态：${completed ? "已完成" : "未完成"}\n工时：${actualHours}h\n备注：${note || "无"}\n照片：${photos.length}张`);
    onBack();
  }

  return (
    <div className="space-y-page-block p-page-block max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-body text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <div>
            <h1 className="text-h1 font-h1">{task.title}</h1>
            <p className="mt-1 text-body text-text-secondary">{task.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSwitchToMobile}
          className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-small text-primary hover:bg-primary-subtle transition-colors"
        >
          <Smartphone className="h-3.5 w-3.5" />
          移动端视图
        </button>
      </div>

      {/* Task info card */}
      <div className="rounded-sm border border-border bg-white p-5">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-small text-text-muted">主题模板</div>
            <div className="mt-1 text-body text-text-primary">{task.templateName}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">优先级</div>
            <div className="mt-1 text-body text-text-primary">{task.priority === "urgent" ? "紧急" : task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">责任人</div>
            <div className="mt-1 text-body text-text-primary">{task.assignedPerson || task.assignedRole || "-"}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">截止时间</div>
            <div className="mt-1 text-body text-text-primary">{task.plannedEnd}</div>
          </div>
        </div>
      </div>

      {/* Execution feedback card */}
      <div className="rounded-sm border border-border bg-white p-5">
        <h2 className="text-body-lg font-body-strong text-text-primary mb-4">执行反馈</h2>

        <div className="space-y-5">
          {/* Completion toggle */}
          <div>
            <div className="field-label">完成状态</div>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="completion"
                  checked={completed}
                  onChange={() => setCompleted(true)}
                  className="text-primary"
                />
                <span className="text-body text-text-primary">已完成</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="completion"
                  checked={!completed}
                  onChange={() => setCompleted(false)}
                  className="text-primary"
                />
                <span className="text-body text-text-primary">未完成</span>
              </label>
            </div>
          </div>

          {/* Actual hours */}
          <div>
            <div className="field-label">实际工时（小时）</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                step={0.5}
                min={0}
                value={actualHours}
                onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
                className="w-32 h-input-md rounded-sm border border-border bg-white px-3 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle"
              />
              <span className="text-body text-text-secondary">小时</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <div className="field-label">备注说明</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 w-full h-24 rounded-sm border border-border bg-white px-3 py-2 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle resize-y"
              placeholder="填写执行情况、异常说明等"
            />
          </div>

          {/* Photos */}
          <div>
            <div className="field-label">拍照记录</div>
            <div className="mt-2 flex flex-wrap gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative h-24 w-24 rounded-sm border border-border bg-bg-subtle flex items-center justify-center overflow-hidden">
                  <span className="text-small text-text-muted">照片{i + 1}</span>
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-danger text-white text-mini flex items-center justify-center"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPhotos((p) => [...p, `photo-${Date.now()}.jpg`])}
                className="h-24 w-24 rounded-sm border-2 border-dashed border-border bg-bg-page flex flex-col items-center justify-center gap-1 text-text-muted hover:text-text-secondary hover:border-text-muted transition-colors"
              >
                <Camera className="h-6 w-6" />
                <span className="text-mini">添加照片</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={onBack}>取消</Button>
          <Button onClick={handleSubmit}>提交反馈</Button>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 7: WT Mobile Task View (PDA / mobile)

**Files:**
- Create: `src/pages/wt/mobile-task-view.tsx`

- [ ] **Step 1: Create `src/pages/wt/mobile-task-view.tsx`** — responsive mobile-style view following PDA H5 patterns

```typescript
// src/pages/wt/mobile-task-view.tsx
import { useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Circle } from "lucide-react";
import type { Task } from "../../data/som-tasks";

export function MobileTaskView({
  task,
  onBack,
  onSubmitted,
}: {
  task: Task;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const [completed, setCompleted] = useState(false);
  const [actualHours, setActualHours] = useState(task.budgetHours);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  function handleSubmit() {
    alert(`移动端任务提交：\n${task.title}\n完成：${completed ? "是" : "否"}\n工时：${actualHours}h\n备注：${note || "无"}`);
    onSubmitted();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50">
      {/* Mobile header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-primary px-4 py-3 text-white">
        <button type="button" onClick={onBack} className="text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-body-lg font-body-strong">{task.title}</div>
          <div className="text-small text-white/80">{task.source === "som" ? "SOM下发" : task.source === "auto" ? "系统自动" : "自建"} · 截止 {task.plannedEnd}</div>
        </div>
      </div>

      {/* Task info */}
      <div className="mx-4 mt-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 text-small">
          <div>
            <span className="text-text-muted">主题：</span>
            <span className="text-text-primary">{task.templateName}</span>
          </div>
          <div>
            <span className="text-text-muted">仓库：</span>
            <span className="text-text-primary">{task.targetWarehouses.join("、")}</span>
          </div>
          <div>
            <span className="text-text-muted">预算工时：</span>
            <span className="text-text-primary">{task.budgetHours}h</span>
          </div>
          <div>
            <span className="text-text-muted">责任人：</span>
            <span className="text-text-primary">{task.assignedPerson || task.assignedRole || "-"}</span>
          </div>
        </div>
        {task.description && (
          <div className="mt-3 border-t border-border pt-3 text-small text-text-secondary whitespace-pre-wrap">
            {task.description}
          </div>
        )}
      </div>

      {/* Execution feedback */}
      <div className="mx-4 mt-4 space-y-5 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-body-lg font-body-strong text-text-primary">执行反馈</h2>

        {/* Completion */}
        <div>
          <div className="mb-2 text-small font-body-strong text-text-secondary">完成状态</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCompleted(true)}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-4 transition-colors ${
                completed ? "border-success bg-success-subtle text-success" : "border-border text-text-secondary"
              }`}
            >
              {completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              <span className="text-body-lg font-body-strong">已完成</span>
            </button>
            <button
              type="button"
              onClick={() => setCompleted(false)}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-4 transition-colors ${
                !completed ? "border-danger bg-danger-subtle text-danger" : "border-border text-text-secondary"
              }`}
            >
              {!completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              <span className="text-body-lg font-body-strong">未完成</span>
            </button>
          </div>
        </div>

        {/* Hours */}
        <div>
          <div className="mb-2 text-small font-body-strong text-text-secondary">实际工时</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={0.5}
              min={0}
              value={actualHours}
              onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
              className="flex-1 rounded-lg border border-border bg-white px-4 py-3 text-body-lg text-center outline-none focus:border-primary"
            />
            <span className="text-body text-text-secondary">小时</span>
          </div>
        </div>

        {/* Note */}
        <div>
          <div className="mb-2 text-small font-body-strong text-text-secondary">备注</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-4 py-3 text-body outline-none focus:border-primary resize-y"
            rows={3}
            placeholder="填写备注说明..."
          />
        </div>

        {/* Photos */}
        <div>
          <div className="mb-2 text-small font-body-strong text-text-secondary">拍照记录</div>
          <div className="flex flex-wrap gap-3">
            {photos.map((_, i) => (
              <div key={i} className="relative h-20 w-20 rounded-lg border border-border bg-bg-subtle flex items-center justify-center">
                <span className="text-small text-text-muted">照片{i + 1}</span>
                <button
                  type="button"
                  className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full bg-danger text-white text-mini flex items-center justify-center"
                  onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPhotos((p) => [...p, `mobile-photo-${Date.now()}.jpg`])}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-bg-page text-text-muted"
            >
              <Camera className="h-6 w-6" />
              <span className="text-mini">拍照</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="mx-4 my-6">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-lg bg-primary py-4 text-body-lg font-body-strong text-white shadow-sm transition-colors hover:bg-primary-hover active:bg-primary-active"
        >
          提交反馈
        </button>
      </div>
    </div>
  );
}
```

---

### Task 8: Navigation integration — update AppShell navigation tree

**Files:**
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 1: Add new Lucide icon imports and NavIconName values**

In `src/components/app-shell.tsx`, add to the icon imports:
```
import { LayoutDashboard, FileText, Settings2, ClipboardList } from "lucide-react";
```

Add to `NavIconName` type:
```typescript
type NavIconName =
  | "purchase"
  | "execute"
  | "master"
  | "orders"
  | "notice"
  | "receive"
  | "putaway"
  | "picking"
  | "shipping"
  | "stocktaking"
  | "checkin"
  | "supplier"
  | "customer"
  | "warehouse"
  | "som"        // new
  | "templates"  // new
  | "rules"      // new
  | "wt-tasks";  // new
```

- [ ] **Step 2: Add icon mappings for new nav item types in `iconMap`**

```typescript
const iconMap: Record<NavIconName, LucideIcon> = {
  // ... existing icons ...
  som: LayoutDashboard,
  templates: FileText,
  rules: Settings2,
  "wt-tasks": ClipboardList,
};
```

- [ ] **Step 3: Add SOM section to `navigationTree` at the beginning (top-level entry)**

Insert before the "采购协同" section:
```typescript
{
  id: "som",
  label: "SOM 任务管理",
  icon: "som",
  groups: [
    {
      id: "som-tasks",
      label: "任务管理",
      items: [
        { id: "som-dashboard", label: "SOM 任务总览", icon: "som" },
        { id: "som-templates", label: "任务主题管理", icon: "templates" },
        { id: "som-auto-rules", label: "自动派发规则", icon: "rules" },
      ],
    },
  ],
},
```

- [ ] **Step 4: Add WT task center item to the "仓内执行" group**

In the "execution" section, "warehouse-ops" group, add after "签到投单":
```typescript
{ id: "wt-task-center", label: "WT 任务中心", icon: "wt-tasks" },
```

---

### Task 9: Main App.tsx integration

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import SOM and WT page components at the top of App.tsx**

```typescript
import { SomDashboard } from "./pages/som/som-dashboard";
import { TemplateManagement } from "./pages/som/template-management";
import { AutoDispatchRules } from "./pages/som/auto-dispatch-rules";
import { WtTaskCenter } from "./pages/wt/wt-task-center";
```

- [ ] **Step 2: Add new tab keys to `WorkspaceTabKey` type union**

Add to the union:
```typescript
  | "som-dashboard"
  | "som-templates"
  | "som-auto-rules"
  | "wt-task-center";
```

- [ ] **Step 3: Add tab definitions to the `tabs` useMemo**

Add inside the `definitions` object:
```typescript
"som-dashboard": { key: "som-dashboard", label: "SOM 任务总览", closable: true, icon: LayoutDashboard },
"som-templates": { key: "som-templates", label: "任务主题管理", closable: true, icon: FileText },
"som-auto-rules": { key: "som-auto-rules", label: "自动派发规则", closable: true, icon: Settings2 },
"wt-task-center": { key: "wt-task-center", label: "WT 任务中心", closable: true, icon: ClipboardList },
```

- [ ] **Step 4: Add navigation handler cases for new nav items in `onNavItemSelect`**

```typescript
if (key === "som-dashboard") {
  openWorkspaceTab("som-dashboard");
}
if (key === "som-templates") {
  openWorkspaceTab("som-templates");
}
if (key === "som-auto-rules") {
  openWorkspaceTab("som-auto-rules");
}
if (key === "wt-task-center") {
  openWorkspaceTab("wt-task-center");
}
```

- [ ] **Step 5: Add rendering cases in the main render section**

```typescript
{activeTab === "som-dashboard" && (
  <SomDashboard onCreateTask={() => openWorkspaceTab("som-dashboard")} />
)}
{activeTab === "som-templates" && <TemplateManagement />}
{activeTab === "som-auto-rules" && <AutoDispatchRules />}
{activeTab === "wt-task-center" && <WtTaskCenter />}
```

- [ ] **Step 6: Add new Lucide icon imports to App.tsx**

```typescript
import { LayoutDashboard, FileText, Settings2, ClipboardList } from "lucide-react";
```

Also update the `activeNavItemId` mapping to include new tab keys:
```typescript
: activeTab === "wt-task-center"
  ? "wt-task-center"
: activeTab.startsWith("som-")
  ? activeTab
```
