// src/pages/som/issued-tasks-tab.tsx
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Task } from "../../data/som-tasks";
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
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
          <Select
            className="w-32"
            options={priorityOptions}
            value={filters.priority}
            placeholder="优先级"
            onValueChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
          />
        </div>
        <Button onClick={onCreateTask}>
          <Plus className="mr-1 h-4 w-4" />
          新建下发
        </Button>
      </div>

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
