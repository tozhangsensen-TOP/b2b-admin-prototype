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
                <Button variant="secondary" size="sm" onClick={() => handleExecuteNow(rule)}>
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
