// src/pages/som/som-dashboard.tsx
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Send } from "lucide-react";
import type { Task } from "../../data/som-tasks";
import { initialSomTasks } from "../../data/som-tasks";
import { SegmentedControl } from "../../components/ui/segmented-control";
import { IssuedTasksTab } from "./issued-tasks-tab";
import { ExecutionMonitorTab } from "./execution-monitor-tab";
import { StatsDashboardTab } from "./stats-dashboard-tab";
import { CreateTaskModal } from "./create-task-modal";

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
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

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

  function handleTaskCreated(newTask: Task) {
    setTasks((current) => [newTask, ...current]);
    setCreateTaskOpen(false);
  }

  return (
    <div className="space-y-page-block p-page-block">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-h1">SOM 任务总览</h1>
          <p className="mt-1 text-body text-text-secondary">总部任务下发、执行监控与统计</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Send} label="总下发数" value={stats.total} color="bg-primary" />
        <StatCard icon={Clock} label="执行中" value={stats.inProgress} color="bg-warning" />
        <StatCard icon={CheckCircle2} label="已完成" value={stats.completed} color="bg-success" />
        <StatCard icon={AlertTriangle} label="已逾期" value={stats.overdue} color="bg-danger" />
      </div>

      <SegmentedControl items={subTabs} value={activeTab} onChange={setActiveTab} />

      {activeTab === "issued" && (
        <IssuedTasksTab
          tasks={tasks}
          onTasksChange={setTasks}
          onCreateTask={() => setCreateTaskOpen(true)}
        />
      )}
      {activeTab === "monitor" && <ExecutionMonitorTab tasks={tasks} />}
      {activeTab === "stats" && <StatsDashboardTab tasks={tasks} />}

      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onCreated={handleTaskCreated}
      />
    </div>
  );
}
