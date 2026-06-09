// src/pages/wt/create-self-task-modal.tsx
import { useState } from "react";
import type { Task, TaskPriority } from "../../data/som-tasks";
import { initialWtTasks } from "../../data/wt-tasks";
import { Button } from "../../components/ui/button";
import { Modal } from "../../components/ui/modal";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { priorityLabels } from "../som/som-dashboard";

interface CreateSelfTaskModalProps {
  open: boolean;
  warehouse: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}

type SelfTaskType = "self-piece" | "self-time";

const typeOptions = [
  { label: "计件", value: "self-piece" },
  { label: "计时", value: "self-time" },
];

export function CreateSelfTaskModal({
  open,
  warehouse,
  onClose,
  onCreated,
}: CreateSelfTaskModalProps) {
  const [taskType, setTaskType] = useState<SelfTaskType>("self-piece");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignedPerson, setAssignedPerson] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [budgetHours, setBudgetHours] = useState(1);
  const [description, setDescription] = useState("");
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [requireNote, setRequireNote] = useState(true);

  function handleSubmit() {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newTask: Task = {
      id: `WT-${String(initialWtTasks.length + 1).padStart(3, "0")}`,
      title: title || "未命名任务",
      templateId: null,
      templateName: "",
      type: taskType,
      source: "wt",
      sourceRuleId: null,
      priority,
      targetWarehouses: [warehouse],
      assignedRole: "",
      assignedPerson: assignedPerson || "当前用户",
      budgetHours,
      frequency: "once",
      cronExpression: "",
      plannedStart,
      plannedEnd,
      attachments: [],
      description,
      requirePhoto,
      requireNote,
      status: "pending_review",
      executions: [],
      createdBy: assignedPerson || "当前用户",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    onCreated(newTask);
    resetForm();
    onClose();
  }

  function resetForm() {
    setTaskType("self-piece");
    setTitle("");
    setPriority("medium");
    setAssignedPerson("");
    setPlannedStart("");
    setPlannedEnd("");
    setBudgetHours(1);
    setDescription("");
    setRequirePhoto(false);
    setRequireNote(true);
  }

  const priorityOptions = Object.entries(priorityLabels).map(([k, v]) => ({
    label: v,
    value: k,
  }));

  return (
    <Modal open={open} title="新建自建任务" onClose={onClose}>
      <div className="space-y-4 p-6">
        <div>
          <div className="field-label">任务类型</div>
          <div className="mt-2 flex gap-3">
            {typeOptions.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-2 rounded-sm border px-4 py-2 text-body transition-colors ${
                  taskType === opt.value
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-border bg-white text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <input
                  type="radio"
                  name="taskType"
                  className="text-primary"
                  checked={taskType === opt.value}
                  onChange={() => setTaskType(opt.value as SelfTaskType)}
                />
                {opt.label}
              </label>
            ))}
          </div>
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
          <div className="field-label">执行人</div>
          <Input
            value={assignedPerson}
            onChange={(e) => setAssignedPerson(e.target.value)}
            placeholder="输入执行人姓名"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="field-label">目标仓库</div>
            <div className="mt-1 rounded-sm border border-border bg-bg-subtle px-3 py-2 text-body text-text-secondary">
              {warehouse}
            </div>
          </div>
          <div>
            <div className="field-label">任务状态</div>
            <div className="mt-1 rounded-sm border border-border bg-bg-subtle px-3 py-2 text-body text-warning">
              待审核
            </div>
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
          <Button onClick={handleSubmit}>提交审核</Button>
        </div>
      </div>
    </Modal>
  );
}
