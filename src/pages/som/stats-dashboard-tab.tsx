// src/pages/som/stats-dashboard-tab.tsx
import { useMemo } from "react";
import type { Task } from "../../data/som-tasks";
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
