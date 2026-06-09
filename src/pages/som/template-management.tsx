import { useState } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import type { TaskTemplate, TaskTemplateStatus, TaskFrequency } from "../../data/som-tasks";
import { initialTaskTemplates } from "../../data/som-tasks";
import { Button } from "../../components/ui/button";
import { Modal } from "../../components/ui/modal";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { priorityLabels } from "./som-dashboard";

const frequencyLabels: Record<TaskFrequency, string> = {
  once: "一次性",
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
  custom: "自定义",
};

const templateStatusLabels: Record<TaskTemplateStatus, string> = {
  enabled: "启用",
  disabled: "禁用",
};

export function TemplateManagement() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(initialTaskTemplates);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  function handleToggleStatus(tpl: TaskTemplate) {
    setTemplates((current) =>
      current.map((t) =>
        t.id === tpl.id ? { ...t, status: t.status === "enabled" ? "disabled" : "enabled" } : t,
      ),
    );
  }

  return (
    <div className="space-y-page-block p-page-block">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-h1">任务主题管理</h1>
          <p className="mt-1 text-body text-text-secondary">维护总部任务下发的主题模板</p>
        </div>
        <Button onClick={() => setEditingTemplate({
          id: `tpl-${Date.now()}`,
          name: "",
          description: "",
          defaultPriority: "medium",
          defaultFrequency: "once",
          defaultBudgetHours: 1,
          requirePhoto: false,
          requireNote: true,
          status: "enabled",
        })}>
          <Plus className="mr-1 h-4 w-4" />
          新建主题
        </Button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-body">
          <thead className="bg-bg-subtle text-left text-body text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-body-strong">名称</th>
              <th className="px-4 py-3 font-body-strong">说明</th>
              <th className="px-4 py-3 font-body-strong">默认优先级</th>
              <th className="px-4 py-3 font-body-strong">默认频率</th>
              <th className="px-4 py-3 font-body-strong">默认工时</th>
              <th className="px-4 py-3 font-body-strong">状态</th>
              <th className="px-4 py-3 font-body-strong">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {templates.map((tpl) => (
              <tr key={tpl.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3 font-body-strong text-text-primary">{tpl.name}</td>
                <td className="px-4 py-3 text-text-secondary max-w-[240px] truncate">{tpl.description}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                    tpl.defaultPriority === "urgent" ? "bg-danger-subtle text-danger" :
                    tpl.defaultPriority === "high" ? "bg-warning-subtle text-warning" :
                    "bg-bg-subtle text-text-secondary"
                  }`}>
                    {priorityLabels[tpl.defaultPriority]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{frequencyLabels[tpl.defaultFrequency]}</td>
                <td className="px-4 py-3 text-text-secondary">{tpl.defaultBudgetHours}h</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-mini font-body-strong ${
                    tpl.status === "enabled" ? "bg-success-subtle text-success" : "bg-bg-subtle text-text-muted"
                  }`}>
                    {templateStatusLabels[tpl.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-body text-primary hover:text-primary-hover transition-colors"
                      onClick={() => setEditingTemplate({ ...tpl })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      编辑
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-body text-text-secondary hover:text-text-primary transition-colors"
                      onClick={() => handleToggleStatus(tpl)}
                    >
                      {tpl.status === "enabled" ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {tpl.status === "enabled" ? "禁用" : "启用"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingTemplate ? (
        <TemplateEditModal
          template={editingTemplate}
          onSave={(updated) => {
            setTemplates((current) => {
              const exists = current.some((t) => t.id === updated.id);
              return exists
                ? current.map((t) => (t.id === updated.id ? updated : t))
                : [...current, updated];
            });
            setEditingTemplate(null);
          }}
          onClose={() => setEditingTemplate(null)}
        />
      ) : null}
    </div>
  );
}

function TemplateEditModal({
  template,
  onSave,
  onClose,
}: {
  template: TaskTemplate;
  onSave: (tpl: TaskTemplate) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TaskTemplate>({ ...template });

  return (
    <Modal open title={template.id.startsWith("tpl-") && !initialTaskTemplates.some((t) => t.id === template.id) ? "新建主题" : "编辑主题"} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div>
          <div className="field-label">主题名称</div>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="输入主题名称" />
        </div>
        <div>
          <div className="field-label">说明/作业指导</div>
          <textarea
            className="w-full h-24 rounded-sm border border-border bg-white px-3 py-2 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle resize-y"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="输入作业说明"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="field-label">默认优先级</div>
            <Select
              options={Object.entries(priorityLabels).map(([k, v]) => ({ label: v, value: k }))}
              value={form.defaultPriority}
              onValueChange={(v) => setForm((f) => ({ ...f, defaultPriority: v as any }))}
            />
          </div>
          <div>
            <div className="field-label">默认频率</div>
            <Select
              options={Object.entries(frequencyLabels).map(([k, v]) => ({ label: v, value: k }))}
              value={form.defaultFrequency}
              onValueChange={(v) => setForm((f) => ({ ...f, defaultFrequency: v as any }))}
            />
          </div>
          <div>
            <div className="field-label">默认工时（小时）</div>
            <Input
              type="number"
              step={0.5}
              value={form.defaultBudgetHours}
              onChange={(e) => setForm((f) => ({ ...f, defaultBudgetHours: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requirePhoto}
              onChange={(e) => setForm((f) => ({ ...f, requirePhoto: e.target.checked }))}
              className="rounded-sm border-border"
            />
            <span className="text-body text-text-primary">需要拍照反馈</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requireNote}
              onChange={(e) => setForm((f) => ({ ...f, requireNote: e.target.checked }))}
              className="rounded-sm border-border"
            />
            <span className="text-body text-text-primary">需要填写备注</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={() => onSave(form)}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}
