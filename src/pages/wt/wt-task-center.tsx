// src/pages/wt/wt-task-center.tsx
import { useMemo, useState } from "react";
import { Plus, Smartphone, Monitor, Download, Pencil } from "lucide-react";
import type { Task } from "../../data/som-tasks";
import { initialSomTasks } from "../../data/som-tasks";
import { initialWtTasks } from "../../data/wt-tasks";
import { calcWorkHours, nowTime, type WtClaimRecord, type WtPdaTask, type WtTaskCategory } from "../../data/wt-labor";
import { Button } from "../../components/ui/button";
import { SegmentedControl } from "../../components/ui/segmented-control";
import {
  statusLabels,
  sourceLabels,
  priorityLabels,
} from "../som/som-dashboard";
import { TaskExecutionView } from "./task-execution-view";
import { MobileTaskView } from "./mobile-task-view";
import { CreateSelfTaskModal } from "./create-self-task-modal";

type WtSubTab = "all" | "pending" | "self" | "review";

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
  const [activeExecutionTask, setActiveExecutionTask] =
    useState<Task | null>(null);
  const [showMobileView, setShowMobileView] = useState(false);
  const [mobileExecutionTask, setMobileExecutionTask] =
    useState<Task | null>(null);
  const [mobilePreviewMode, setMobilePreviewMode] = useState(false);
  const [wtTasks, setWtTasks] = useState<Task[]>(initialWtTasks);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const allTasks = useMemo(() => {
    const somAssigned = initialSomTasks.filter((t) =>
      t.targetWarehouses.includes(demoWarehouse),
    );
    return [...somAssigned, ...wtTasks];
  }, [wtTasks]);

  const pendingTasks = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.status === "issued" ||
          t.status === "effective" ||
          t.status === "in_progress",
      ),
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
    {
      value: "all" as const,
      label: `全部任务(${allTasks.length})`,
    },
    {
      value: "pending" as const,
      label: `待执行(${pendingTasks.length})`,
    },
    {
      value: "self" as const,
      label: `自建任务(${selfTasks.length})`,
    },
    {
      value: "review" as const,
      label: `我的审核(${reviewTasks.length})`,
    },
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

  // Mobile preview mode: show the first pending task in mobile view
  if (mobilePreviewMode) {
    const previewTask = pendingTasks[0] ?? allTasks[0];
    if (previewTask) {
      return (
        <MobileTaskView
          task={previewTask}
          onBack={() => setMobilePreviewMode(false)}
          onSubmitted={() => setMobilePreviewMode(false)}
        />
      );
    }
  }

  return (
    <div className="space-y-page-block p-page-block">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-h1">WT 任务中心</h1>
          <p className="mt-1 text-body text-text-secondary">
            当前仓库：{demoWarehouse}{" "}
            {activeTab !== "review"
              ? `· ${mobilePreviewMode ? "移动端视图" : "PC端视图"}`
              : ""}
          </p>
        </div>
        {activeTab !== "review" && (
          <button
            type="button"
            onClick={() => setMobilePreviewMode((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-small text-primary hover:bg-primary-subtle transition-colors"
          >
            {mobilePreviewMode ? (
              <>
                <Monitor className="h-3.5 w-3.5" />
                切换到PC端
              </>
            ) : (
              <>
                <Smartphone className="h-3.5 w-3.5" />
                移动端预览
              </>
            )}
          </button>
        )}
      </div>

      <SegmentedControl
        items={subTabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "all" && (
        <TaskListSection
          tasks={allTasks}
          onExecute={(task) => setActiveExecutionTask(task)}
        />
      )}
      {activeTab === "pending" && (
        <TaskListSection
          tasks={pendingTasks}
          onExecute={(task) => setActiveExecutionTask(task)}
        />
      )}
      {activeTab === "self" && (
        <SelfTaskSection
          onCreateTask={() => setCreateTaskOpen(true)}
        />
      )}
      {activeTab === "review" && (
        <ReviewSection
          tasks={reviewTasks}
          onTasksChange={setWtTasks}
        />
      )}

      <CreateSelfTaskModal
        open={createTaskOpen}
        warehouse={demoWarehouse}
        onClose={() => setCreateTaskOpen(false)}
        onCreated={(task) => {
          setWtTasks((current) => [...current, task]);
          setCreateTaskOpen(false);
        }}
      />
    </div>
  );
}

export function ClockTaskManagement({ tasks, claims, onTasksChange, onClaimsChange }: { tasks: WtPdaTask[]; claims: WtClaimRecord[]; onTasksChange: (tasks: WtPdaTask[]) => void; onClaimsChange: (claims: WtClaimRecord[]) => void }) {
  const [editing, setEditing] = useState<WtPdaTask | null>(null);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [editLogs, setEditLogs] = useState<Array<{ id: string; taskTitle: string; editor: string; editedAt: string; changes: string }>>([]);
  function exportClaims() {
    const header = ["领取日期", "任务名称", "模块", "执行人", "领取时间", "开始时间", "开始照片", "结束时间", "结束照片", "工时", "最后更新时间"];
    const lines = claims.map((claim) => {
      const task = tasks.find((item) => item.id === claim.taskId);
      return [claim.occurredDate ?? new Date().toISOString().slice(0, 10), task?.title ?? claim.taskId, task?.category ?? "", claim.person, claim.claimedAt, claim.startedAt ? `${claim.startedDate ?? claim.occurredDate ?? ""} ${claim.startedAt}`.trim() : "", claim.startPhoto ? "已上传" : task?.requirePhoto ? "未上传" : "无需拍照", claim.endedAt ? `${claim.endedDate ?? claim.occurredDate ?? ""} ${claim.endedAt}`.trim() : "", claim.endPhoto ? "已上传" : task?.requirePhoto ? "未上传" : "无需拍照", claim.workHours ?? "", claim.updatedAt ?? claim.endedAt ?? claim.startedAt ?? claim.claimedAt].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",");
    });
    const blob = new Blob([`\uFEFF${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `WT计时任务领取完成明细-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><div><h2 className="text-h2 font-h2">领取完成明细</h2><p className="mt-1 text-small text-text-secondary">单证、劳务、保洁打卡任务的领取、开始、结束和工时记录</p></div><div className="flex items-center gap-2"><Button variant="secondary" onClick={() => setCreatingRecord(true)}><Plus className="mr-1.5 h-4 w-4" />新增记录</Button><Button variant="secondary" onClick={exportClaims}><Download className="mr-1.5 h-4 w-4" />导出明细</Button></div></div>
    <ClaimDetailPanel tasks={tasks} claims={claims} onEdit={(task) => setEditing(task)} />
    {creatingRecord ? <ClockClaimCreateForm tasks={tasks} onCancel={() => setCreatingRecord(false)} onSave={(record) => { onClaimsChange([...claims, record]); setEditLogs((logs) => [{ id: `${Date.now()}`, taskTitle: tasks.find((task) => task.id === record.taskId)?.title ?? record.taskId, editor: "当前管理员", editedAt: new Date().toLocaleString("zh-CN", { hour12: false }), changes: "新增候补打卡记录" }, ...logs]); setCreatingRecord(false); }} /> : null}
    {editing ? <ClockTaskEditForm mode="edit" task={editing} onCancel={() => setEditing(null)} onSave={(next) => { const previous = tasks.find((task) => task.id === next.id); onTasksChange(tasks.map((task) => task.id === next.id ? next : task)); setEditLogs((logs) => [{ id: `${Date.now()}`, taskTitle: next.title, editor: "当前管理员", editedAt: new Date().toLocaleString("zh-CN", { hour12: false }), changes: `时间 ${previous?.plannedStart ?? "未设置"}-${previous?.plannedEnd ?? "未设置"} → ${next.plannedStart ?? "未设置"}-${next.plannedEnd}` }, ...logs]); setEditing(null); }} /> : null}
    <EditLogPanel logs={editLogs} />
  </div>;
}

function ClaimDetailPanel({ tasks, claims, onEdit }: { tasks: WtPdaTask[]; claims: WtClaimRecord[]; onEdit: (task: WtPdaTask) => void }) {
  const rows = claims.map((claim) => ({ claim, task: tasks.find((task) => task.id === claim.taskId) }));
  return <div className="overflow-x-auto rounded-sm border border-border bg-white"><table className="w-full text-small"><thead className="bg-bg-subtle text-left text-text-secondary"><tr><th className="px-3 py-2">领取日期</th><th className="px-3 py-2">任务名称</th><th className="px-3 py-2">模块</th><th className="px-3 py-2">执行人</th><th className="px-3 py-2">领取时间</th><th className="px-3 py-2">开始时间</th><th className="px-3 py-2">开始照片</th><th className="px-3 py-2">结束时间</th><th className="px-3 py-2">结束照片</th><th className="px-3 py-2">统计工时</th><th className="px-3 py-2">最后更新时间</th><th className="px-3 py-2">状态</th><th className="px-3 py-2">操作</th></tr></thead><tbody className="divide-y divide-border">{rows.length ? rows.map(({ task, claim }) => <tr key={claim.id}><td className="px-3 py-2">{claim.occurredDate ?? "2026-09-09"}</td><td className="px-3 py-2 font-body-strong">{task?.title ?? claim.taskId}</td><td className="px-3 py-2">{task?.category ?? "--"}</td><td className="px-3 py-2">{claim.person}</td><td className="px-3 py-2">{claim.claimedAt}</td><td className="px-3 py-2">{claim.startedAt ? `${claim.startedDate ?? claim.occurredDate ?? ""} ${claim.startedAt}`.trim() : "--"}</td><td className="px-3 py-2">{claim.startPhoto ? "已上传" : task?.requirePhoto ? "未上传" : "无需拍照"}</td><td className="px-3 py-2">{claim.endedAt ? `${claim.endedDate ?? claim.occurredDate ?? ""} ${claim.endedAt}`.trim() : "--"}</td><td className="px-3 py-2">{claim.endPhoto ? "已上传" : task?.requirePhoto ? "未上传" : "无需拍照"}</td><td className="px-3 py-2">{claim.workHours == null ? "--" : `${claim.workHours}h`}</td><td className="px-3 py-2">{claim.updatedAt ?? claim.endedAt ?? claim.startedAt ?? claim.claimedAt}</td><td className="px-3 py-2">{claim.endedAt ? "已完成" : claim.startedAt ? "进行中" : "已领取"}</td><td className="px-3 py-2">{task ? <button type="button" onClick={() => onEdit(task)} className="inline-flex items-center gap-1 text-primary"><Pencil className="h-3.5 w-3.5" />编辑</button> : null}</td></tr>) : <tr><td colSpan={13} className="px-3 py-6 text-center text-text-muted">暂无领取记录</td></tr>}</tbody></table></div>;
}

function EditLogPanel({ logs }: { logs: Array<{ id: string; taskTitle: string; editor: string; editedAt: string; changes: string }> }) {
  return <div className="rounded-sm border border-border bg-white"><div className="border-b border-border px-4 py-3 font-body-strong text-text-primary">修改日志</div>{logs.length ? <div className="divide-y divide-border">{logs.map((log) => <div key={log.id} className="flex items-center justify-between gap-4 px-4 py-3 text-small"><div><span className="font-body-strong">{log.taskTitle}</span><span className="ml-3 text-text-secondary">{log.changes}</span></div><div className="shrink-0 text-text-muted">{log.editor} · {log.editedAt}</div></div>)}</div> : <div className="px-4 py-5 text-small text-text-muted">暂无修改记录</div>}</div>;
}

function ClockClaimCreateForm({ tasks, onCancel, onSave }: { tasks: WtPdaTask[]; onCancel: () => void; onSave: (record: WtClaimRecord) => void }) {
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [person, setPerson] = useState("");
  const [occurredDate, setOccurredDate] = useState(new Date().toISOString().slice(0, 10));
  const [claimedAt, setClaimedAt] = useState("09:00:00");
  const [startedAt, setStartedAt] = useState("09:00:00");
  const [endedAt, setEndedAt] = useState("");
  const [endedDate, setEndedDate] = useState(occurredDate);
  return <div className="rounded-sm border border-primary/30 bg-primary-subtle p-4"><div className="mb-3 flex items-center justify-between"><div className="font-body-strong text-text-primary">新增候补打卡记录</div><button type="button" onClick={onCancel} className="text-small text-text-muted">取消</button></div><div className="grid grid-cols-2 gap-3"><label className="text-small text-text-secondary">任务<select value={taskId} onChange={(event) => setTaskId(event.target.value)} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2"><option value="" disabled>请选择任务</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title} · {task.category}</option>)}</select></label><label className="text-small text-text-secondary">执行人<input value={person} onChange={(event) => setPerson(event.target.value)} placeholder="填写姓名" className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2" /></label><label className="text-small text-text-secondary">领取日期<input type="date" value={occurredDate} onChange={(event) => { setOccurredDate(event.target.value); if (!endedAt) setEndedDate(event.target.value); }} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2" /></label><label className="text-small text-text-secondary">领取时间<input type="time" step="1" value={claimedAt} onChange={(event) => setClaimedAt(event.target.value)} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2" /></label><label className="text-small text-text-secondary">开始时间<input type="time" step="1" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2" /></label><label className="text-small text-text-secondary">结束日期<input type="date" value={endedDate} onChange={(event) => setEndedDate(event.target.value)} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2" /></label><label className="text-small text-text-secondary">结束时间<input type="time" step="1" value={endedAt} onChange={(event) => setEndedAt(event.target.value)} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2" /></label></div><div className="mt-3 flex justify-end"><Button disabled={!taskId || !person || !startedAt} onClick={() => onSave({ id: `CL-${Date.now()}`, taskId, person, occurredDate, updatedAt: nowTime(), claimedAt, startedDate: occurredDate, startedAt, startPhoto: null, endedDate: endedAt ? endedDate : undefined, endedAt: endedAt || null, endPhoto: null, workHours: endedAt ? calcWorkHours(startedAt, endedAt, occurredDate, endedDate) : null })}>新增记录</Button></div></div>;
}

function ClockTaskEditForm({ task, mode, onCancel, onSave }: { task: WtPdaTask; mode: "create" | "edit"; onCancel: () => void; onSave: (task: WtPdaTask) => void }) {
  const [draft, setDraft] = useState(task);
  return <div className="rounded-sm border border-primary/30 bg-primary-subtle p-4"><div className="mb-3 flex items-center justify-between"><div className="font-body-strong text-text-primary">{mode === "create" ? "新增打卡任务" : "编辑打卡任务"}</div><button type="button" onClick={onCancel} className="text-small text-text-muted">取消</button></div><div className="grid grid-cols-2 gap-3"><label className="text-small text-text-secondary">任务名称<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-text-primary" /></label><label className="text-small text-text-secondary">模块<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as WtTaskCategory })} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-text-primary"><option value="单证">单证打卡</option><option value="劳务">劳务打卡</option><option value="保洁打卡">保洁打卡</option></select></label><label className="text-small text-text-secondary">作业地点<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-text-primary" /></label><label className="text-small text-text-secondary">开始时间<input type="time" value={draft.plannedStart ?? "09:00"} onChange={(event) => setDraft({ ...draft, plannedStart: event.target.value })} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-text-primary" /></label><label className="text-small text-text-secondary">截止时间<input type="time" value={draft.plannedEnd} onChange={(event) => setDraft({ ...draft, plannedEnd: event.target.value })} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-text-primary" /></label></div><label className="mt-3 block text-small text-text-secondary">任务说明<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={2} className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-text-primary" /></label><div className="mt-3 flex justify-end"><Button onClick={() => onSave({ ...draft, requirePhoto: draft.category === "劳务" || draft.category === "保洁打卡" })}>{mode === "create" ? "新增" : "保存修改"}</Button></div></div>;
}

function SelfTaskSection({
  onCreateTask,
}: {
  onCreateTask: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-body text-text-secondary">
          可创建计件或计时任务，提交后需经理审核
        </p>
        <Button onClick={onCreateTask}>
          <Plus className="mr-1 h-4 w-4" />
          新建自建任务
        </Button>
      </div>
    </div>
  );
}

function ReviewSection({
  tasks,
  onTasksChange,
}: {
  tasks: Task[];
  onTasksChange: (update: (current: Task[]) => Task[]) => void;
}) {
  function handleReview(taskId: string, action: "approved" | "rejected") {
    onTasksChange((current) =>
      current.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status:
                action === "approved"
                  ? ("approved" as const)
                  : ("rejected" as const),
            }
          : t,
      ),
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-white py-12 text-center text-body text-text-muted">
        暂无待审核任务
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-sm border border-border bg-white p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-body-lg font-body-strong text-text-primary">
                {task.title}
              </h3>
              <p className="mt-1 text-small text-text-muted">
                {task.type === "self-piece" ? "计件" : "计时"} ·{" "}
                {task.assignedPerson} · {task.plannedStart}
              </p>
              {task.description && (
                <p className="mt-2 text-body text-text-secondary">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleReview(task.id, "rejected")}
              >
                驳回
              </Button>
              <Button
                size="sm"
                onClick={() => handleReview(task.id, "approved")}
              >
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
}: {
  tasks: Task[];
  onExecute: (task: Task) => void;
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
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-text-muted"
              >
                暂无任务
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr
                key={task.id}
                className="hover:bg-bg-hover transition-colors"
              >
                <td className="px-4 py-3 font-body-strong text-text-primary">
                  {task.title}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                      task.source === "auto"
                        ? "bg-warning-subtle text-warning"
                        : task.source === "som"
                          ? "bg-primary-subtle text-primary"
                          : "bg-bg-subtle text-text-secondary"
                    }`}
                  >
                    {sourceLabels[task.source]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {task.assignedPerson || task.assignedRole || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                      task.priority === "urgent"
                        ? "bg-danger-subtle text-danger"
                        : task.priority === "high"
                          ? "bg-warning-subtle text-warning"
                          : "bg-bg-subtle text-text-secondary"
                    }`}
                  >
                    {priorityLabels[task.priority]}
                  </span>
                </td>
                <td className="px-4 py-3 text-small text-text-secondary">
                  {task.plannedEnd}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                      task.status === "completed"
                        ? "bg-success-subtle text-success"
                        : task.status === "overdue"
                          ? "bg-danger-subtle text-danger"
                          : task.status === "in_progress"
                            ? "bg-warning-subtle text-warning"
                            : task.status === "pending_review"
                              ? "bg-warning-subtle text-warning"
                              : task.status === "approved"
                                ? "bg-success-subtle text-success"
                                : task.status === "rejected"
                                  ? "bg-danger-subtle text-danger"
                                  : "bg-bg-subtle text-text-secondary"
                    }`}
                  >
                    {statusLabelMap[task.status] || task.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {task.status === "issued" ||
                  task.status === "effective" ||
                  task.status === "in_progress" ? (
                    <Button size="sm" onClick={() => onExecute(task)}>
                      执行
                    </Button>
                  ) : (
                    <button
                      type="button"
                      className="text-body text-primary hover:text-primary-hover transition-colors"
                      onClick={() =>
                        alert(JSON.stringify(task, null, 2))
                      }
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
