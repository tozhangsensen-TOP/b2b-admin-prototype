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
