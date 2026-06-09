// src/pages/wt/wt-task-center.tsx
import { useMemo, useState } from "react";
import { Plus, Smartphone, Monitor } from "lucide-react";
import type { Task } from "../../data/som-tasks";
import { initialSomTasks } from "../../data/som-tasks";
import { initialWtTasks } from "../../data/wt-tasks";
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
