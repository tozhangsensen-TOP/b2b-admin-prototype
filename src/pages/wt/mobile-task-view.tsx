// src/pages/wt/mobile-task-view.tsx
import { useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Circle } from "lucide-react";
import type { Task } from "../../data/som-tasks";

export function MobileTaskView({
  task,
  onBack,
  onSubmitted,
}: {
  task: Task;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const [completed, setCompleted] = useState(false);
  const [actualHours, setActualHours] = useState(task.budgetHours);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  function handleSubmit() {
    alert(`移动端任务提交：\n${task.title}\n完成：${completed ? "是" : "否"}\n工时：${actualHours}h\n备注：${note || "无"}`);
    onSubmitted();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-primary px-4 py-3 text-white">
        <button type="button" onClick={onBack} className="text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-body-lg font-body-strong">{task.title}</div>
          <div className="text-small text-white/80">{task.source === "som" ? "SOM下发" : task.source === "auto" ? "系统自动" : "自建"} · 截止 {task.plannedEnd}</div>
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 text-small">
          <div>
            <span className="text-text-muted">主题：</span>
            <span className="text-text-primary">{task.templateName}</span>
          </div>
          <div>
            <span className="text-text-muted">仓库：</span>
            <span className="text-text-primary">{task.targetWarehouses.join("、")}</span>
          </div>
          <div>
            <span className="text-text-muted">预算工时：</span>
            <span className="text-text-primary">{task.budgetHours}h</span>
          </div>
          <div>
            <span className="text-text-muted">责任人：</span>
            <span className="text-text-primary">{task.assignedPerson || task.assignedRole || "-"}</span>
          </div>
        </div>
        {task.description && (
          <div className="mt-3 border-t border-border pt-3 text-small text-text-secondary whitespace-pre-wrap">
            {task.description}
          </div>
        )}
      </div>

      <div className="mx-4 mt-4 space-y-5 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-body-lg font-body-strong text-text-primary">执行反馈</h2>

        <div>
          <div className="mb-2 text-small font-body-strong text-text-secondary">完成状态</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCompleted(true)}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-4 transition-colors ${
                completed ? "border-success bg-success-subtle text-success" : "border-border text-text-secondary"
              }`}
            >
              {completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              <span className="text-body-lg font-body-strong">已完成</span>
            </button>
            <button
              type="button"
              onClick={() => setCompleted(false)}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-4 transition-colors ${
                !completed ? "border-danger bg-danger-subtle text-danger" : "border-border text-text-secondary"
              }`}
            >
              {!completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              <span className="text-body-lg font-body-strong">未完成</span>
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 text-small font-body-strong text-text-secondary">实际工时</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={0.5}
              min={0}
              value={actualHours}
              onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
              className="flex-1 rounded-lg border border-border bg-white px-4 py-3 text-body-lg text-center outline-none focus:border-primary"
            />
            <span className="text-body text-text-secondary">小时</span>
          </div>
        </div>

        <div>
          <div className="mb-2 text-small font-body-strong text-text-secondary">备注</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-4 py-3 text-body outline-none focus:border-primary resize-y"
            rows={3}
            placeholder="填写备注说明..."
          />
        </div>

        <div>
          <div className="mb-2 text-small font-body-strong text-text-secondary">拍照记录</div>
          <div className="flex flex-wrap gap-3">
            {photos.map((_, i) => (
              <div key={i} className="relative h-20 w-20 rounded-lg border border-border bg-bg-subtle flex items-center justify-center">
                <span className="text-small text-text-muted">照片{i + 1}</span>
                <button
                  type="button"
                  className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full bg-danger text-white text-mini flex items-center justify-center"
                  onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPhotos((p) => [...p, `mobile-photo-${Date.now()}.jpg`])}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-bg-page text-text-muted"
            >
              <Camera className="h-6 w-6" />
              <span className="text-mini">拍照</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-4 my-6">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-lg bg-primary py-4 text-body-lg font-body-strong text-white shadow-sm transition-colors hover:bg-primary-hover active:bg-primary-active"
        >
          提交反馈
        </button>
      </div>
    </div>
  );
}
