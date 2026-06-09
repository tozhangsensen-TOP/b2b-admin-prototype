import { useState } from "react";
import { ArrowLeft, Camera, Smartphone } from "lucide-react";
import type { Task } from "../../data/som-tasks";
import { Button } from "../../components/ui/button";

export function TaskExecutionView({
  task,
  onBack,
  onSwitchToMobile,
}: {
  task: Task;
  onBack: () => void;
  onSwitchToMobile: () => void;
}) {
  const [completed, setCompleted] = useState(false);
  const [actualHours, setActualHours] = useState(task.budgetHours);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  function handleSubmit() {
    alert(`任务已提交：\n完成状态：${completed ? "已完成" : "未完成"}\n工时：${actualHours}h\n备注：${note || "无"}\n照片：${photos.length}张`);
    onBack();
  }

  return (
    <div className="space-y-page-block p-page-block max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-body text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <div>
            <h1 className="text-h1 font-h1">{task.title}</h1>
            <p className="mt-1 text-body text-text-secondary">{task.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSwitchToMobile}
          className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-small text-primary hover:bg-primary-subtle transition-colors"
        >
          <Smartphone className="h-3.5 w-3.5" />
          移动端视图
        </button>
      </div>

      <div className="rounded-sm border border-border bg-white p-5">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-small text-text-muted">主题模板</div>
            <div className="mt-1 text-body text-text-primary">{task.templateName}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">优先级</div>
            <div className="mt-1 text-body text-text-primary">{task.priority === "urgent" ? "紧急" : task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">责任人</div>
            <div className="mt-1 text-body text-text-primary">{task.assignedPerson || task.assignedRole || "-"}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">截止时间</div>
            <div className="mt-1 text-body text-text-primary">{task.plannedEnd}</div>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-white p-5">
        <h2 className="text-body-lg font-body-strong text-text-primary mb-4">执行反馈</h2>

        <div className="space-y-5">
          <div>
            <div className="field-label">完成状态</div>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="completion"
                  checked={completed}
                  onChange={() => setCompleted(true)}
                  className="text-primary"
                />
                <span className="text-body text-text-primary">已完成</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="completion"
                  checked={!completed}
                  onChange={() => setCompleted(false)}
                  className="text-primary"
                />
                <span className="text-body text-text-primary">未完成</span>
              </label>
            </div>
          </div>

          <div>
            <div className="field-label">实际工时（小时）</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                step={0.5}
                min={0}
                value={actualHours}
                onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
                className="w-32 h-input-md rounded-sm border border-border bg-white px-3 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle"
              />
              <span className="text-body text-text-secondary">小时</span>
            </div>
          </div>

          <div>
            <div className="field-label">备注说明</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 w-full h-24 rounded-sm border border-border bg-white px-3 py-2 text-body outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-subtle resize-y"
              placeholder="填写执行情况、异常说明等"
            />
          </div>

          <div>
            <div className="field-label">拍照记录</div>
            <div className="mt-2 flex flex-wrap gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative h-24 w-24 rounded-sm border border-border bg-bg-subtle flex items-center justify-center overflow-hidden">
                  <span className="text-small text-text-muted">照片{i + 1}</span>
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-danger text-white text-mini flex items-center justify-center"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPhotos((p) => [...p, `photo-${Date.now()}.jpg`])}
                className="h-24 w-24 rounded-sm border-2 border-dashed border-border bg-bg-page flex flex-col items-center justify-center gap-1 text-text-muted hover:text-text-secondary hover:border-text-muted transition-colors"
              >
                <Camera className="h-6 w-6" />
                <span className="text-mini">添加照片</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="secondary" onClick={onBack}>取消</Button>
          <Button onClick={handleSubmit}>提交反馈</Button>
        </div>
      </div>
    </div>
  );
}
