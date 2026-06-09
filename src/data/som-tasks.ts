export type TaskPriority = "urgent" | "high" | "medium" | "low";

export type TaskFrequency = "once" | "daily" | "weekly" | "monthly" | "custom";

export type TaskType = "issued" | "self-piece" | "self-time";

export type TaskSource = "som" | "auto" | "wt";

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
  status: string;
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
