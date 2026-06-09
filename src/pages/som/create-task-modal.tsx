// src/pages/som/create-task-modal.tsx
import { useMemo, useState } from "react";
import { initialTaskTemplates, initialSomTasks } from "../../data/som-tasks";
import type { Task, TaskPriority } from "../../data/som-tasks";
import { Button } from "../../components/ui/button";
import { Modal } from "../../components/ui/modal";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { priorityLabels } from "./som-dashboard";

const demoWarehouses = ["A库", "B库", "C库", "D库"];

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (task: Task) => void;
}

export function CreateTaskModal({ open, onClose, onCreated }: CreateTaskModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [targetWarehouses, setTargetWarehouses] = useState<string[]>(["A库"]);
  const [assignedRole, setAssignedRole] = useState("");
  const [assignedPerson, setAssignedPerson] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [budgetHours, setBudgetHours] = useState(1);
  const [description, setDescription] = useState("");
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [requireNote, setRequireNote] = useState(true);

  const selectedTemplate = useMemo(
    () => initialTaskTemplates.find((t) => t.id === selectedTemplateId),
    [selectedTemplateId],
  );

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    const tpl = initialTaskTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setTitle(tpl.name);
      setPriority(tpl.defaultPriority);
      setBudgetHours(tpl.defaultBudgetHours);
      setRequirePhoto(tpl.requirePhoto);
      setRequireNote(tpl.requireNote);
    }
  }

  function handleWarehouseToggle(wh: string) {
    setTargetWarehouses((current) =>
      current.includes(wh) ? current.filter((w) => w !== wh) : [...current, wh],
    );
  }

  function handleSubmit() {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newTask: Task = {
      id: `SOM-${String(initialSomTasks.length + 1).padStart(3, "0")}`,
      title: title || (selectedTemplate?.name ?? "未命名任务"),
      templateId: selectedTemplate?.id ?? null,
      templateName: selectedTemplate?.name ?? "",
      type: "issued",
      source: "som",
      sourceRuleId: null,
      priority,
      targetWarehouses,
      assignedRole,
      assignedPerson,
      budgetHours,
      frequency: selectedTemplate?.defaultFrequency ?? "once",
      cronExpression: "",
      plannedStart,
      plannedEnd,
      attachments: [],
      description,
      requirePhoto,
      requireNote,
      status: "issued",
      executions: [],
      createdBy: "SOM管理员",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    onCreated(newTask);
    resetForm();
    onClose();
  }

  function resetForm() {
    setSelectedTemplateId("");
    setTitle("");
    setPriority("medium");
    setTargetWarehouses(["A库"]);
    setAssignedRole("");
    setAssignedPerson("");
    setPlannedStart("");
    setPlannedEnd("");
    setBudgetHours(1);
    setDescription("");
    setRequirePhoto(false);
    setRequireNote(true);
  }

  const templateOptions = [
    { label: "不选择模板（自定义）", value: "" },
    ...initialTaskTemplates.map((t) => ({ label: t.name, value: t.id })),
  ];

  const priorityOptions = Object.entries(priorityLabels).map(([k, v]) => ({
    label: v,
    value: k,
  }));

  return (
    <Modal open={open} title="新建下发任务" onClose={onClose}>
      <div className="space-y-4 p-6">
        <div>
          <div className="field-label">主题模板</div>
          <Select
            options={templateOptions}
            value={selectedTemplateId}
            onValueChange={handleTemplateChange}
          />
        </div>

        <div>
          <div className="field-label">任务标题</div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入任务标题"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="field-label">优先级</div>
            <Select
              options={priorityOptions}
              value={priority}
              onValueChange={(v) => setPriority(v as TaskPriority)}
            />
          </div>
          <div>
            <div className="field-label">预算工时（小时）</div>
            <Input
              type="number"
              step={0.5}
              min={0}
              value={budgetHours}
              onChange={(e) => setBudgetHours(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div>
          <div className="field-label">目标仓库</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {demoWarehouses.map((wh) => (
              <label
                key={wh}
                className={`cursor-pointer rounded-sm border px-3 py-1.5 text-small transition-colors ${
                  targetWarehouses.includes(wh)
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-border bg-white text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={targetWarehouses.includes(wh)}
                  onChange={() => handleWarehouseToggle(wh)}
                />
                {wh}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="field-label">责任人角色</div>
            <Input
              value={assignedRole}
              onChange={(e) => setAssignedRole(e.target.value)}
              placeholder="如：冻库主管"
            />
          </div>
          <div>
            <div className="field-label">指定人员（可选）</div>
            <Input
              value={assignedPerson}
              onChange={(e) => setAssignedPerson(e.target.value)}
              placeholder="留空则按角色分配"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="field-label">计划开始时间</div>
            <Input
              type="datetime-local"
              value={plannedStart}
              onChange={(e) => setPlannedStart(e.target.value)}
            />
          </div>
          <div>
            <div className="field-label">计划截止时间</div>
            <Input
              type="datetime-local"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="field-label">任务说明</div>
          <textarea
            className="w-full h-24 rounded-sm border border-border bg-white px-3 py-2 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入作业说明、注意事项等"
          />
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requirePhoto}
              onChange={(e) => setRequirePhoto(e.target.checked)}
              className="rounded-sm border-border"
            />
            <span className="text-body text-text-primary">需要拍照反馈</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requireNote}
              onChange={(e) => setRequireNote(e.target.checked)}
              className="rounded-sm border-border"
            />
            <span className="text-body text-text-primary">需要填写备注</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit}>确认下发</Button>
        </div>
      </div>
    </Modal>
  );
}
