// src/pages/wt/wt-task-pda.tsx
// WT 任务 PDA：统一入口承接非单据类任务（单证/劳务/保洁）
// 规则：任务池共享，不限领取人数；每人独立执行记录；劳务任务开始/结束须实时拍照，自动计算工时
import { useMemo, useRef, useState } from "react";
import {
  BatteryCharging,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardList,
  Boxes,
  FileBadge,
  Grid2X2,
  MoveRight,
  ScanLine,
  MapPin,
  Timer,
  Users,
  Wifi,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  calcWorkHours,
  claimStats,
  currentPdaUser,
  initialClaims,
  initialWtTasks,
  myClaimPhase,
  nowTime,
  priorityLabels,
  todayDate,
  type WtClaimRecord,
  type WtPdaTask,
  type WtTaskCategory,
  type ClaimPhase,
} from "../../data/wt-labor";

type Filter = "全部" | WtTaskCategory;
type PdaScreen = "home" | "center" | "tasks";

const phaseMeta: Record<string, { label: string; tone: "pending" | "draft" | "processing" | "success" }> = {
  none: { label: "待领取", tone: "pending" },
  claimed: { label: "已领取", tone: "draft" },
  working: { label: "进行中", tone: "processing" },
  done: { label: "已完成", tone: "success" },
};

export function WtTaskPdaPage() {
  const [tasks] = useState<WtPdaTask[]>(() => initialWtTasks.map((t) => ({ ...t })));
  const [claims, setClaims] = useState<WtClaimRecord[]>(() => initialClaims.map((c) => ({ ...c })));
  const [filter, setFilter] = useState<Filter>("全部");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [screen, setScreen] = useState<PdaScreen>("home");
  const [pendingModule, setPendingModule] = useState<WtTaskCategory | null>(null);
  const [moduleVisitDates, setModuleVisitDates] = useState<Partial<Record<WtTaskCategory, string>>>({});
  const [taskListMode, setTaskListMode] = useState<"pending" | "history">("pending");
  const actionLockRef = useRef<Record<string, boolean>>({});

  const filtered = useMemo(
    () => tasks.filter((t) => {
      const sameModule = filter === "全部" || t.category === filter;
      if (!sameModule) return false;
      const phase = myClaimPhase(claims, t.id, currentPdaUser);
      return taskListMode === "history" ? phase === "done" : phase !== "done";
    }),
    [tasks, claims, filter, taskListMode],
  );

  const task = tasks.find((t) => t.id === detailId);

  function handleClaim(taskId: string) {
    setClaims((prev) => [
      ...prev,
      {
        id: `CL-${Date.now()}`,
        taskId,
        person: currentPdaUser,
        updatedAt: nowTime(),
        claimedAt: nowTime(),
        startedDate: undefined,
        startedAt: null,
        startPhoto: null,
        endedAt: null,
        endPhoto: null,
        workHours: null,
      },
    ]);
  }

  function handleClaimAndStart(taskId: string) {
    if (actionLockRef.current[`start-${taskId}`]) return;
    actionLockRef.current[`start-${taskId}`] = true;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const claimId = `CL-${Date.now()}`;
    const startedAt = nowTime();
    setClaims((prev) => [
      ...prev,
      {
        id: claimId,
        taskId,
        person: currentPdaUser,
        updatedAt: startedAt,
        claimedAt: startedAt,
        startedDate: todayDate(),
        startedAt,
        startPhoto: task.requirePhoto ? `photo-${claimId}-start` : null,
        endedAt: null,
        endPhoto: null,
        workHours: null,
      },
    ]);
  }

  /** 拍照仅留证据，不改变执行阶段 */
  function handlePhoto(taskId: string, kind: "start" | "end") {
    setClaims((prev) =>
      prev.map((c) =>
        c.taskId === taskId && c.person === currentPdaUser
          ? kind === "start"
            ? { ...c, startPhoto: c.startPhoto ?? `photo-${c.id}-start`, updatedAt: nowTime() }
            : { ...c, endPhoto: c.endPhoto ?? `photo-${c.id}-end`, updatedAt: nowTime() }
          : c,
      ),
    );
  }

  function handleStart(taskId: string) {
    setClaims((prev) =>
      prev.map((c) =>
        c.taskId === taskId && c.person === currentPdaUser && !c.startedAt
          ? { ...c, startedDate: c.startedDate ?? todayDate(), startedAt: nowTime(), updatedAt: nowTime() }
          : c,
      ),
    );
  }

  function handleEnd(taskId: string) {
    setClaims((prev) =>
      prev.map((c) => {
        if (c.taskId !== taskId || c.person !== currentPdaUser || !c.startedAt || c.endedAt) return c;
        const endedAt = nowTime();
        return { ...c, endedAt, workHours: calcWorkHours(c.startedAt, endedAt) };
      }),
    );
  }

  function handleLaborEnd(taskId: string) {
    if (actionLockRef.current[`end-${taskId}`]) return;
    actionLockRef.current[`end-${taskId}`] = true;
    const task = tasks.find((item) => item.id === taskId);
    setClaims((prev) =>
      prev.map((c) => {
        if (c.taskId !== taskId || c.person !== currentPdaUser || !c.startedAt || c.endedAt) return c;
        const endedAt = nowTime();
        return { ...c, endedDate: todayDate(), endedAt, endPhoto: task?.requirePhoto ? `photo-${c.id}-end` : null, updatedAt: endedAt, workHours: calcWorkHours(c.startedAt, endedAt, c.startedDate, todayDate()) };
      }),
    );
  }

  if (task) {
    return (
      <PdaFrame title="WT 任务 · 任务详情" badge={todayDate()}>
        <TaskDetail
          task={task}
          claims={claims}
          onBack={() => setDetailId(null)}
          onClaim={() => handleClaim(task.id)}
          onClaimAndStart={() => handleClaimAndStart(task.id)}
          onPhoto={(kind) => handlePhoto(task.id, kind)}
          onStart={() => handleStart(task.id)}
          onEnd={() => handleEnd(task.id)}
        />
      </PdaFrame>
    );
  }

  if (screen === "home") {
    return <PdaFrame title="常温库" badge={todayDate()}><PdaHome tasks={tasks} claims={claims} onOpenTaskCenter={() => setScreen("center")} /></PdaFrame>;
  }

  if (screen === "center") {
    return <PdaFrame title="任务中心" badge={todayDate()}><>
      <TaskCenterHome
        tasks={tasks}
        claims={claims}
        onBack={() => setScreen("home")}
        onOpenModule={(category) => {
          if (moduleVisitDates[category] === todayDate()) {
            setFilter(category);
            setTaskListMode("pending");
            setScreen("tasks");
          } else {
            setPendingModule(category);
          }
        }}
      />
      {pendingModule ? (
        <ModuleClaimDialog
          category={pendingModule}
          onCancel={() => setPendingModule(null)}
          onConfirm={() => {
            setModuleVisitDates((current) => ({ ...current, [pendingModule]: todayDate() }));
            setFilter(pendingModule);
            setTaskListMode("pending");
            setPendingModule(null);
            setScreen("tasks");
          }}
        />
      ) : null}
    </></PdaFrame>;
  }

  return (
    <PdaFrame title={moduleTitle(filter)} badge={todayDate()}>
      <button type="button" onClick={() => setScreen("center")} className="inline-flex items-center gap-1 text-small text-primary">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        返回任务中心
      </button>
      <div className="rounded-[16px] bg-white px-3 py-3 shadow-sm">
        <div className="text-[18px] font-semibold text-text-primary">{moduleTitle(filter)}</div>
        <div className="mt-1 text-mini text-text-muted">当前模块共 {filtered.length} 项任务 · {filter === "劳务" ? "直接完成上下班打卡" : "点击任务查看详情"}</div>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg-subtle p-1">
        <button type="button" onClick={() => setTaskListMode("pending")} className={`rounded-md py-2 text-small font-body-strong ${taskListMode === "pending" ? "bg-white text-primary shadow-sm" : "text-text-muted"}`}>待处理任务</button>
        <button type="button" onClick={() => setTaskListMode("history")} className={`rounded-md py-2 text-small font-body-strong ${taskListMode === "history" ? "bg-white text-primary shadow-sm" : "text-text-muted"}`}>历史完成</button>
      </div>
      <div className="flex items-center justify-between rounded-sm border border-border bg-white px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-small text-text-secondary">
          <Users className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          {currentPdaUser}
        </span>
        <span className="rounded-full bg-primary-subtle px-2 py-1 text-mini font-body-strong text-primary">{filter}</span>
      </div>

      <div className="flex items-start gap-1.5 rounded-sm bg-bg-subtle px-2.5 py-2 text-mini text-text-muted">
        <Users className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        {filter === "劳务" ? "劳务任务为上下班打卡：点击上班打卡开始计时，点击下班打卡结束并记录工时。" : filter === "单证" ? "单证任务为工作打卡：点击开始打卡记录开始时间，点击结束打卡完成任务。" : "任务池全员共享，不限领取人数：点击任务即可领取，各自记录开始/结束时间与工时。"}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? <div className="rounded-[16px] border border-dashed border-border bg-white px-3 py-10 text-center text-small text-text-muted">{taskListMode === "history" ? "暂无历史完成任务" : "暂无待处理任务"}</div> : null}
        {filtered.map((t) => {
          const phase = myClaimPhase(claims, t.id, currentPdaUser);
          const meta = phaseMeta[phase];
          const stats = claimStats(claims, t.id);
          if (t.category === "劳务" || t.category === "单证" || t.category === "保洁打卡") {
            return <TaskClockCard key={t.id} task={t} phase={phase} mine={claims.find((claim) => claim.taskId === t.id && claim.person === currentPdaUser)} isLabor={t.category === "劳务"} requiresPhoto={t.requirePhoto} onStart={() => handleClaimAndStart(t.id)} onEnd={() => handleLaborEnd(t.id)} />;
          }
          return (
            <button
              key={t.id}
              type="button"
              className="block w-full rounded-sm border border-border bg-white p-3 text-left transition hover:bg-bg-hover"
              onClick={() => setDetailId(t.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-body-strong text-text-primary">{t.title}</span>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge tone="draft">{t.category}</Badge>
                <Badge tone={t.priority === "urgent" ? "error" : t.priority === "high" ? "pending" : "draft"}>
                  {priorityLabels[t.priority]}
                </Badge>
                {t.requirePhoto ? (
                  <Badge tone="processing">
                    <Camera className="mr-1 h-3 w-3" aria-hidden="true" />
                    需拍照
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-mini text-text-secondary">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {t.warehouse} · {t.location}
                </span>
                <span>截止 {t.plannedEnd}</span>
              </div>
              {stats.total > 0 ? (
                <div className="mt-1.5 flex items-center gap-2 border-t border-border pt-1.5 text-mini text-text-muted">
                  <span>已有 {stats.total} 人领取</span>
                  <span>·</span>
                  <span>{stats.working} 人进行中</span>
                  {stats.done > 0 ? (
                    <>
                      <span>·</span>
                      <span>{stats.done} 人已完成</span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <PdaBottomNav active="任务中心" onHome={() => setScreen("home")} />
    </PdaFrame>
  );
}

function TaskClockCard({ task, phase, mine, isLabor, requiresPhoto, onStart, onEnd }: { task: WtPdaTask; phase: ClaimPhase; mine?: WtClaimRecord; isLabor: boolean; requiresPhoto: boolean; onStart: () => void; onEnd: () => void }) {
  const startLabel = isLabor ? "上班打卡" : "开始打卡";
  const endLabel = isLabor ? "下班打卡" : "结束打卡";
  const startActionLabel = requiresPhoto ? `实时拍照并${startLabel}` : startLabel;
  const endActionLabel = requiresPhoto ? `实时拍照并${endLabel}` : endLabel;
  return <div className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
    <div className="flex items-start justify-between gap-2"><div><div className="font-body-strong text-text-primary">{task.title}</div><div className="mt-1 text-mini text-text-secondary">{task.warehouse} · {task.location}</div></div><Badge tone={phase === "working" ? "processing" : phase === "done" ? "success" : "pending"}>{phase === "working" ? "上班中" : phase === "done" ? "已完成" : "待打卡"}</Badge></div>
    <div className="mt-3 space-y-2">
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${mine?.startedAt ? "bg-success-subtle" : "bg-bg-subtle"}`}>
        <div className="min-w-0 flex-1"><div className="text-mini text-text-muted">{startLabel}</div><div className="mt-1 text-body font-body-strong text-text-primary">{mine?.startedAt ?? "--:--:--"}</div></div>
        {phase === "none" ? <Button className="shrink-0" onClick={onStart}><Clock3 className="mr-1 h-4 w-4" aria-hidden="true" />{requiresPhoto ? <><Camera className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{startActionLabel}</> : startActionLabel}</Button> : null}
        {mine?.startPhoto ? <span className="inline-flex shrink-0 items-center gap-1 text-mini text-success"><Check className="h-3.5 w-3.5" />已拍照</span> : null}
      </div>
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${mine?.endedAt ? "bg-success-subtle" : "bg-bg-subtle"}`}>
        <div className="min-w-0 flex-1"><div className="text-mini text-text-muted">{endLabel}</div><div className="mt-1 text-body font-body-strong text-text-primary">{mine?.endedAt ?? "--:--:--"}</div></div>
        {phase === "working" ? <Button className="shrink-0" onClick={onEnd}><Check className="mr-1 h-4 w-4" aria-hidden="true" />{requiresPhoto ? <><Camera className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{endActionLabel}</> : endActionLabel}</Button> : null}
        {mine?.endPhoto ? <span className="inline-flex shrink-0 items-center gap-1 text-mini text-success"><Check className="h-3.5 w-3.5" />已拍照</span> : null}
      </div>
    </div>
    {phase === "done" && mine?.workHours !== null ? <div className="mt-3 rounded-lg bg-success-subtle py-2 text-center text-small font-body-strong text-success">本次工时 {mine?.workHours} 小时</div> : null}
  </div>;
}

function PdaHome({ tasks, claims, onOpenTaskCenter }: { tasks: WtPdaTask[]; claims: WtClaimRecord[]; onOpenTaskCenter: () => void }) {
  const mine = claims.filter((claim) => claim.person === currentPdaUser);
  const todayCount = (category?: WtTaskCategory) => mine.filter((claim) => {
    const task = tasks.find((item) => item.id === claim.taskId);
    return task && (!category || task.category === category);
  }).length;
  return <div className="flex min-h-[620px] flex-col">
    <div className="flex items-center justify-between px-1 pb-3"><div><div className="text-[22px] font-semibold text-[#18212f]">常温库</div><div className="mt-0.5 text-mini text-text-muted">当前作业仓 · PDA工作台</div></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-small font-body-strong">张</div></div>
    <div className="grid grid-cols-2 gap-3">
      <PdaHomeCard icon={<MoveRight className="h-7 w-7" />} title="移位" count="0" tone="blue" />
      <PdaHomeCard icon={<Grid2X2 className="h-7 w-7" />} title="盘点" count="43" tone="green" />
      <PdaHomeCard icon={<ScanLine className="h-7 w-7" />} title="库存查询" tone="blue" />
      <button type="button" onClick={onOpenTaskCenter} className="group min-h-[148px] rounded-[18px] border border-primary/15 bg-primary p-4 text-left text-white shadow-[0_8px_24px_rgba(37,99,235,0.2)] transition hover:translate-y-[-1px]"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20"><ClipboardList className="h-7 w-7" /></div><ChevronRight className="h-5 w-5 opacity-70" /></div><div className="mt-5 text-[18px] font-semibold">任务中心</div><div className="mt-1 text-mini text-white/75">今日已领取 {todayCount()} 项</div></button>
    </div>
    <div className="mt-auto pt-8"><PdaBottomNav active="在库" onHome={() => undefined} /></div>
  </div>;
}

function PdaHomeCard({ icon, title, count, tone }: { icon: React.ReactNode; title: string; count?: string; tone: "blue" | "green" }) {
  return <button type="button" className={`min-h-[148px] rounded-[18px] border border-white bg-gradient-to-br ${tone === "green" ? "from-[#E8FFF6] to-white" : "from-[#EEF4FF] to-white"} p-4 text-left shadow-sm`}><div className={`flex h-12 w-12 items-center justify-center rounded-full ${tone === "green" ? "bg-[#35CFA7]" : "bg-primary"} text-white`}>{icon}</div><div className="mt-5 text-[18px] font-semibold text-[#18212f]">{title}</div>{count ? <div className="mt-1 text-[22px] font-semibold text-[#EB6262]">{count}<span className="ml-1 text-small font-normal text-text-muted">总数</span></div> : <div className="mt-1 text-mini text-text-muted">快速进入</div>}</button>;
}

function TaskCenterHome({ tasks, claims, onBack, onOpenModule }: { tasks: WtPdaTask[]; claims: WtClaimRecord[]; onBack: () => void; onOpenModule: (category: WtTaskCategory) => void }) {
  const modules: Array<{ category: WtTaskCategory; icon: React.ReactNode; hint: string; tone: string }> = [
    { category: "单证", icon: <FileBadge className="h-7 w-7" />, hint: "单证打卡", tone: "bg-[#EEF4FF] text-primary" },
    { category: "劳务", icon: <Users className="h-7 w-7" />, hint: "劳务打卡 · 开始/结束实时拍照", tone: "bg-[#E8FFF6] text-[#10B981]" },
    { category: "保洁打卡", icon: <Boxes className="h-7 w-7" />, hint: "开始/结束实时拍照", tone: "bg-[#FFF5E8] text-[#F59E0B]" },
  ];
  return <div className="space-y-3"><button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-small text-primary"><ChevronLeft className="h-4 w-4" />返回在库</button><div className="rounded-[16px] bg-primary px-4 py-4 text-white"><div className="text-[18px] font-semibold">WT 计时任务</div><div className="mt-1 text-small text-white/75">请选择任务模块开始作业</div></div><div className="space-y-2">{modules.map((module) => { const moduleTasks = tasks.filter((task) => task.category === module.category); const mineCount = claims.filter((claim) => claim.person === currentPdaUser && moduleTasks.some((task) => task.id === claim.taskId)).length; const doing = moduleTasks.filter((task) => myClaimPhase(claims, task.id, currentPdaUser) === "working").length; const label = module.category === "单证" ? "单证打卡" : module.category === "劳务" ? "劳务打卡" : "保洁打卡"; return <button key={module.category} type="button" onClick={() => onOpenModule(module.category)} className="flex w-full items-center gap-3 rounded-[16px] border border-border bg-white p-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-bg-hover"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${module.tone}`}>{module.icon}</div><div className="min-w-0 flex-1"><div className="font-body-strong text-text-primary">{label}</div><div className="mt-1 text-mini text-text-muted">{module.hint}</div></div><div className="text-right"><div className="text-[20px] font-semibold text-text-primary">{mineCount}</div><div className="text-mini text-text-muted">{doing ? `${doing} 进行中` : "今日已领取"}</div></div><ChevronRight className="h-4 w-4 text-text-muted" /></button>; })}</div><PdaBottomNav active="任务中心" onHome={onBack} /></div>;
}

function moduleTitle(filter: Filter) {
  if (filter === "单证") return "单证打卡";
  if (filter === "劳务") return "劳务打卡";
  if (filter === "保洁打卡") return "保洁打卡";
  return "任务中心";
}

function ModuleClaimDialog({ category, onCancel, onConfirm }: { category: WtTaskCategory; onCancel: () => void; onConfirm: () => void }) {
  const title = moduleTitle(category);
  return <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-6">
    <div className="w-full max-w-[360px] rounded-[20px] bg-white p-5 shadow-2xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary"><ClipboardList className="h-6 w-6" /></div>
      <div className="mt-4 text-[18px] font-semibold text-text-primary">确认领取今日任务？</div>
      <div className="mt-2 text-small leading-6 text-text-secondary">即将进入「{title}」任务列表。确认后，今天再次进入该模块将直接展示待处理任务和历史完成记录。</div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border py-2.5 text-small text-text-secondary">暂不领取</button>
        <button type="button" onClick={onConfirm} className="rounded-lg bg-primary py-2.5 text-small font-body-strong text-white">确认领取</button>
      </div>
    </div>
  </div>;
}

function PdaBottomNav({ active, onHome }: { active: string; onHome: () => void }) {
  return <div className="mt-3 grid grid-cols-3 border-t border-border bg-white pt-3 text-center text-mini text-text-muted"><button type="button" className="py-1">出库</button><button type="button" className="py-1">入库</button><button type="button" onClick={onHome} className={`py-1 font-body-strong ${active === "在库" || active === "任务中心" ? "text-primary" : ""}`}>▣<span className="ml-1">在库</span></button></div>;
}

/* ════════════════════════════════════════════════════════
   任务详情：领取 → 开始（拍照）→ 结束（拍照）→ 工时
   ════════════════════════════════════════════════════════ */

function TaskDetail({
  task,
  claims,
  onBack,
  onClaim,
  onClaimAndStart,
  onPhoto,
  onStart,
  onEnd,
}: {
  task: WtPdaTask;
  claims: WtClaimRecord[];
  onBack: () => void;
  onClaim: () => void;
  onClaimAndStart: () => void;
  onPhoto: (kind: "start" | "end") => void;
  onStart: () => void;
  onEnd: () => void;
}) {
  const mine = claims.find((c) => c.taskId === task.id && c.person === currentPdaUser);
  const phase = myClaimPhase(claims, task.id, currentPdaUser);
  const stats = claimStats(claims, task.id);
  const needPhoto = task.requirePhoto;

  const canStart = phase === "claimed" && (!needPhoto || Boolean(mine?.startPhoto));
  const canEnd = phase === "working" && (!needPhoto || Boolean(mine?.endPhoto));

  return (
    <div className="space-y-3">
      <button type="button" className="inline-flex items-center gap-1 text-small text-primary" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        返回任务列表
      </button>

      <div className="rounded-sm border border-border bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-body-strong text-text-primary">{task.title}</span>
          <Badge tone={phaseMeta[phase].tone}>{phaseMeta[phase].label}</Badge>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="draft">{task.category}</Badge>
          <Badge tone={task.priority === "urgent" ? "error" : task.priority === "high" ? "pending" : "draft"}>
            {priorityLabels[task.priority]}
          </Badge>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1 text-mini text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {task.warehouse} · {task.location}
          </span>
          <span>截止 {task.plannedEnd}</span>
        </div>
        <div className="mt-2 border-t border-border pt-2 text-mini text-text-secondary">{task.description}</div>
        {needPhoto ? (
          <div className="mt-2 flex items-start gap-1.5 rounded-sm border border-warning/30 bg-warning-subtle px-2.5 py-1.5 text-mini text-warning">
            <Camera className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            劳务任务：开始与结束均须实时拍照（人像 + 作业区域），不可从相册选取。
          </div>
        ) : null}
      </div>

      {/* 我的执行记录 */}
      <div className="rounded-sm border border-border bg-white p-3">
        <div className="text-small font-body-strong text-text-primary">我的执行</div>

        {phase === "none" ? (
          task.category === "劳务" ? (
            <Button className="mt-3 w-full" onClick={onClaimAndStart}>
              <Clock3 className="mr-1 h-4 w-4" aria-hidden="true" />
              {needPhoto ? "拍照并开始打卡" : "领取并开始打卡"}
            </Button>
          ) : (
            <Button className="mt-3 w-full" onClick={onClaim}>
              领取任务
            </Button>
          )
        ) : null}

        {mine ? (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <PhaseCell
                label="开始"
                time={mine.startedAt}
                hasPhoto={Boolean(mine.startPhoto)}
                needPhoto={needPhoto}
                active={phase === "claimed"}
              />
              <PhaseCell
                label="结束"
                time={mine.endedAt}
                hasPhoto={Boolean(mine.endPhoto)}
                needPhoto={needPhoto}
                active={phase === "working"}
              />
            </div>

            {mine.workHours !== null ? (
              <div className="flex items-center justify-center gap-1.5 rounded-sm bg-success-subtle px-2.5 py-2 text-small font-body-strong text-success">
                <Timer className="h-4 w-4" aria-hidden="true" />
                本次工时 {mine.workHours} 小时
              </div>
            ) : null}

            {phase === "claimed" ? (
              <div className="space-y-2">
                {needPhoto && !mine.startPhoto ? (
                  <Button variant="secondary" className="w-full" onClick={() => onPhoto("start")}>
                    <Camera className="mr-1 h-4 w-4" aria-hidden="true" />
                    开始前实时拍照
                  </Button>
                ) : null}
                <Button className="w-full" disabled={!canStart} onClick={onStart}>
                  <Clock3 className="mr-1 h-4 w-4" aria-hidden="true" />
                  开始作业
                </Button>
              </div>
            ) : null}

            {phase === "working" ? (
              <div className="space-y-2">
                {needPhoto && !mine.endPhoto ? (
                  <Button variant="secondary" className="w-full" onClick={() => onPhoto("end")}>
                    <Camera className="mr-1 h-4 w-4" aria-hidden="true" />
                    结束前实时拍照
                  </Button>
                ) : null}
                <Button className="w-full" disabled={!canEnd} onClick={onEnd}>
                  <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                  结束作业
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 全员领取记录（不限领取人数） */}
      <div className="rounded-sm border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-small font-body-strong text-text-primary">领取记录</span>
          <span className="text-mini text-text-muted">
            {stats.total} 人领取 · {stats.working} 人进行中
          </span>
        </div>
        <div className="divide-y divide-border">
          {claims.filter((c) => c.taskId === task.id).length === 0 ? (
            <div className="px-3 py-3 text-center text-mini text-text-muted">暂无人领取</div>
          ) : (
            claims
              .filter((c) => c.taskId === task.id)
              .map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
                  <div>
                    <div className="text-small font-body-strong text-text-primary">
                      {c.person}
                      {c.person === currentPdaUser ? <span className="ml-1 text-mini text-primary">（我）</span> : null}
                    </div>
                    <div className="text-mini text-text-muted">领取 {c.claimedAt}</div>
                  </div>
                  <div className="text-right text-mini text-text-secondary">
                    <div>
                      开始 <span className="font-body-strong text-text-primary">{c.startedAt ?? "--:--"}</span>
                      {c.startPhoto ? <Check className="ml-1 inline h-3 w-3 text-success" aria-hidden="true" /> : null}
                    </div>
                    <div>
                      结束 <span className="font-body-strong text-text-primary">{c.endedAt ?? "--:--"}</span>
                      {c.endPhoto ? <Check className="ml-1 inline h-3 w-3 text-success" aria-hidden="true" /> : null}
                    </div>
                    <div>工时 {c.workHours !== null ? `${c.workHours}h` : "--"}</div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseCell({
  label,
  time,
  hasPhoto,
  needPhoto,
  active,
}: {
  label: string;
  time: string | null;
  hasPhoto: boolean;
  needPhoto: boolean;
  active: boolean;
}) {
  return (
    <div className={`rounded-sm border p-2 ${time ? "border-success bg-success-subtle" : "border-border bg-white"}`}>
      <div className="flex items-center justify-between">
        <span className="text-mini font-body-strong text-text-primary">{label}时间</span>
        {hasPhoto ? <Check className="h-3 w-3 text-success" aria-hidden="true" /> : null}
      </div>
      <div className="mt-1 text-body font-body-strong text-text-primary">{time ?? "--:--:--"}</div>
      <div className="mt-1 text-mini">
        {time ? (
          hasPhoto ? (
            <span className="text-success">已实时拍照</span>
          ) : (
            <span className="text-text-muted">未拍照</span>
          )
        ) : active && needPhoto ? (
          <span className="text-warning">待拍照</span>
        ) : (
          <span className="text-text-muted">--</span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   PDA 框架（与调拨拣货 PDA 同风格）
   ════════════════════════════════════════════════════════ */

function PdaFrame({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#E8EDF3] px-3 py-4">
      <div className="mx-auto max-w-[430px] overflow-hidden rounded-[28px] border border-[#1F2937] bg-[#111827] p-2 shadow-xl">
        <div className="rounded-[22px] bg-[#F7F9FC]">
          <div className="flex items-center justify-between bg-[#111827] px-4 py-2 text-[12px] text-white">
            <span>09:41</span>
            <span className="inline-flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              <BatteryCharging className="h-3.5 w-3.5" aria-hidden="true" />
              86%
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border bg-white px-3 py-3">
            <div className="inline-flex items-center gap-2 text-body font-medium text-text-primary">
              <FileBadge className="h-4 w-4 text-primary" aria-hidden="true" />
              {title}
            </div>
            {badge ? <Badge tone="pending">{badge}</Badge> : null}
          </div>
          <div className="space-y-3 p-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
