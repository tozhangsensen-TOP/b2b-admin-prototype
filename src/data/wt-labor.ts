// src/data/wt-labor.ts
// WT 任务 PDA 数据：非单据类任务池（单证/劳务/保洁），统一入口领取，不限领取人数
// 每人领取后产生独立执行记录：开始（劳务需拍照）→ 结束（劳务需拍照）→ 自动计算工时

export type WtTaskCategory = "单证" | "劳务" | "保洁打卡";

export interface WtPdaTask {
  id: string;
  title: string;
  category: WtTaskCategory;
  warehouse: string;
  location: string;
  priority: "urgent" | "high" | "medium" | "low";
  plannedStart?: string;
  plannedEnd: string;
  description: string;
  /** 劳务任务开始/结束时必须实时拍照 */
  requirePhoto: boolean;
}

export interface WtClaimRecord {
  id: string;
  taskId: string;
  person: string;
  occurredDate?: string;
  updatedAt?: string;
  claimedAt: string;
  startedDate?: string;
  startedAt: string | null;
  startPhoto: string | null;
  endedDate?: string;
  endedAt: string | null;
  endPhoto: string | null;
  /** 工时（小时，一位小数） */
  workHours: number | null;
}

/* 当前登录的 PDA 用户（原型演示） */
export const currentPdaUser = "张单证";

export function nowTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function todayDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 计算完整日期时间工时；未传日期时按同一天兼容旧数据。 */
export function calcWorkHours(startedAt: string, endedAt: string, startedDate?: string, endedDate?: string): number {
  const start = new Date(`${startedDate ?? "1970-01-01"}T${startedAt}`);
  const end = new Date(`${endedDate ?? startedDate ?? "1970-01-01"}T${endedAt}`);
  const diff = Math.max(0, end.getTime() - start.getTime());
  return Math.round((diff / 3600000) * 10) / 10;
}

export const initialWtTasks: WtPdaTask[] = [
  {
    id: "WT-T-001",
    title: "单证打卡",
    category: "单证",
    warehouse: "A库",
    location: "单证室",
    priority: "medium",
    plannedEnd: "17:00",
    description: "完成当日单证工作后进行开始与结束打卡。",
    requirePhoto: false,
  },
  {
    id: "WT-T-003",
    title: "劳务打卡",
    category: "劳务",
    warehouse: "B库",
    location: "1-3号冻库",
    priority: "high",
    plannedEnd: "18:00",
    description: "劳务人员上下班打卡，开始与结束均需实时拍照留证。",
    requirePhoto: true,
  },
  {
    id: "WT-T-005",
    title: "保洁打卡",
    category: "保洁打卡",
    warehouse: "A库",
    location: "库区作业面",
    priority: "medium",
    plannedEnd: "17:30",
    description: "保洁人员上下班打卡，开始与结束均需实时拍照留证。",
    requirePhoto: true,
  },
];

/** 预置：其他人员已领取劳务打卡任务（体现"不限领取人数"），当前用户预置一条保洁打卡进行中记录 */
export const initialClaims: WtClaimRecord[] = [
  {
    id: "CL-9001",
    taskId: "WT-T-003",
    person: "刘大强",
    claimedAt: "08:12:00",
    startedAt: "08:20:11",
    startPhoto: "photo-9001-start",
    endedAt: "12:35:40",
    endPhoto: "photo-9001-end",
    workHours: 4.3,
  },
  {
    id: "CL-9002",
    taskId: "WT-T-003",
    person: "王二虎",
    claimedAt: "08:15:30",
    startedAt: "08:26:02",
    startPhoto: "photo-9002-start",
    endedAt: null,
    endPhoto: null,
    workHours: null,
  },
  {
    id: "CL-9003",
    taskId: "WT-T-005",
    person: currentPdaUser,
    claimedAt: "09:05:00",
    startedAt: "09:10:33",
    startPhoto: "photo-9003-start",
    endedAt: null,
    endPhoto: null,
    workHours: null,
  },
];

export const priorityLabels: Record<WtPdaTask["priority"], string> = {
  urgent: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

export type ClaimPhase = "none" | "claimed" | "working" | "done";

/** 当前用户在某任务上的领取状态 */
export function myClaimPhase(claims: WtClaimRecord[], taskId: string, person: string): ClaimPhase {
  const mine = claims.find((c) => c.taskId === taskId && c.person === person);
  if (!mine) return "none";
  if (mine.endedAt) return "done";
  if (mine.startedAt) return "working";
  return "claimed";
}

/** 某任务的领取人数与进行中人数 */
export function claimStats(claims: WtClaimRecord[], taskId: string) {
  const list = claims.filter((c) => c.taskId === taskId);
  return { total: list.length, working: list.filter((c) => c.startedAt && !c.endedAt).length, done: list.filter((c) => c.endedAt).length };
}
