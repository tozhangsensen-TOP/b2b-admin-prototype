import { useMemo, useState } from "react";
import { ArrowLeft, BatteryCharging, ScanLine, Wifi } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { pickingLineItemsMap, type PickingLineItem, type PickingTaskRow } from "../data/picking-task";

const exceptionOptions = [
  { label: "无异常", value: "无异常" },
  { label: "库位无货", value: "库位无货" },
  { label: "条码不符", value: "条码不符" },
  { label: "商品破损", value: "商品破损" },
  { label: "批次差异", value: "批次差异" },
];

export function PickingPdaH5Page({
  tasks,
  activeTaskId,
  onBackToPc,
  onConfirmPicking,
}: {
  tasks: PickingTaskRow[];
  activeTaskId?: string;
  onBackToPc: () => void;
  onConfirmPicking: (id: string, items: PickingLineItem[]) => void;
}) {
  const availableTasks = tasks.filter((task) => task.status !== "已完成");
  const initialTask = tasks.find((task) => task.id === activeTaskId) ?? availableTasks[0] ?? tasks[0];
  const [taskId, setTaskId] = useState(initialTask?.id ?? "");
  const task = tasks.find((item) => item.id === taskId) ?? initialTask;
  const sourceItems = task ? pickingLineItemsMap[task.id] ?? [] : [];
  const [items, setItems] = useState<PickingLineItem[]>(sourceItems.map((item) => ({ ...item })));
  const [activeSku, setActiveSku] = useState(sourceItems[0]?.sku ?? "");
  const [scanLocation, setScanLocation] = useState(sourceItems[0]?.sourceLocation ?? "");
  const [scanBarcode, setScanBarcode] = useState(sourceItems[0]?.barcode ?? "");
  const [exceptionReason, setExceptionReason] = useState("无异常");

  const activeItem = items.find((item) => item.sku === activeSku) ?? items[0];
  const taskOptions = tasks.map((item) => ({ label: item.id, value: item.id }));
  const progress = useMemo(() => {
    if (!task) return 0;
    const picked = items.reduce((sum, item) => sum + item.pickedQty + item.currentPickQty, 0);
    return Math.min(100, Math.round((picked / task.totalQty) * 100));
  }, [items, task]);

  function switchTask(nextTaskId: string) {
    const nextItems = pickingLineItemsMap[nextTaskId] ?? [];
    setTaskId(nextTaskId);
    setItems(nextItems.map((item) => ({ ...item })));
    setActiveSku(nextItems[0]?.sku ?? "");
    setScanLocation(nextItems[0]?.sourceLocation ?? "");
    setScanBarcode(nextItems[0]?.barcode ?? "");
    setExceptionReason("无异常");
  }

  function updateCurrentQty(value: string) {
    if (!activeItem) return;
    const qty = Math.max(0, Number(value) || 0);
    setItems((current) =>
      current.map((item) => (item.sku === activeItem.sku ? { ...item, currentPickQty: qty } : item)),
    );
  }

  function fillCurrentRemaining() {
    if (!activeItem) return;
    updateCurrentQty(String(Math.max(0, activeItem.orderQty - activeItem.pickedQty)));
  }

  function submitPicking() {
    if (!task) return;
    onConfirmPicking(task.id, items.filter((item) => item.currentPickQty > 0));
  }

  const locationMatched = Boolean(activeItem && scanLocation === activeItem.sourceLocation);
  const barcodeMatched = Boolean(activeItem && (scanBarcode === activeItem.barcode || scanBarcode === activeItem.sku));

  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#E8EDF3] px-3 py-4">
      <div className="mx-auto max-w-[420px] overflow-hidden rounded-[28px] border border-[#1F2937] bg-[#111827] p-2 shadow-xl">
        <div className="rounded-[22px] bg-[#F7F9FC]">
          <div className="flex items-center justify-between bg-[#111827] px-4 py-2 text-[12px] text-white">
            <span>09:41</span>
            <span className="inline-flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              <BatteryCharging className="h-3.5 w-3.5" aria-hidden="true" />
              86%
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border bg-white px-3 py-3">
            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-sm hover:bg-bg-hover" onClick={onBackToPc}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="text-body font-medium text-text-primary">PDA H5拣货</div>
            <Badge tone={locationMatched && barcodeMatched ? "success" : "pending"}>{locationMatched && barcodeMatched ? "校验通过" : "待扫描"}</Badge>
          </div>

          <div className="space-y-3 p-3">
            <div>
              <div className="field-label">任务号</div>
              <Select value={taskId} options={taskOptions} onValueChange={switchTask} />
            </div>

            {task ? (
              <div className="rounded-sm border border-border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-small text-text-muted">出库单</div>
                    <div className="font-medium text-text-primary">{task.outboundOrderId}</div>
                  </div>
                  <Badge tone={task.priority === "高" ? "error" : "pending"}>{task.priority}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-small text-text-secondary">
                  <div>仓库：{task.warehouse}</div>
                  <div>路径：{task.route}</div>
                  <div>应拣：{task.totalQty}</div>
                  <div>进度：{progress}%</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            {activeItem ? (
              <div className="rounded-sm border border-border bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-small text-text-muted">{activeItem.sku}</div>
                    <div className="font-medium text-text-primary">{activeItem.name}</div>
                    <div className="mt-1 text-small text-text-secondary">{activeItem.spec} / {activeItem.batchNo}</div>
                  </div>
                  <Badge tone="draft">{activeItem.unit}</Badge>
                </div>

                <div className="mt-3 grid gap-3">
                  <div>
                    <div className="field-label">扫描库位</div>
                    <Input value={scanLocation} placeholder="请扫描库位码" onChange={(event) => setScanLocation(event.target.value)} />
                    <div className="mt-1 text-small text-text-muted">建议库位：{activeItem.sourceLocation}</div>
                  </div>
                  <div>
                    <div className="field-label">扫描商品条码</div>
                    <Input value={scanBarcode} placeholder="请扫描商品条码" onChange={(event) => setScanBarcode(event.target.value)} />
                    <div className="mt-1 text-small text-text-muted">条码：{activeItem.barcode}</div>
                  </div>
                  <div>
                    <div className="field-label">本次拣货数量</div>
                    <div className="flex gap-2">
                      <Input type="number" min={0} value={activeItem.currentPickQty || ""} placeholder="数量" onChange={(event) => updateCurrentQty(event.target.value)} />
                      <Button variant="secondary" onClick={fillCurrentRemaining}>余量</Button>
                    </div>
                  </div>
                  <div>
                    <div className="field-label">异常原因</div>
                    <Select value={exceptionReason} options={exceptionOptions} onValueChange={setExceptionReason} />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              {items.map((item) => (
                <button
                  key={item.sku}
                  type="button"
                  className={`flex items-center justify-between rounded-sm border p-3 text-left ${item.sku === activeSku ? "border-primary bg-primary-subtle" : "border-border bg-white"}`}
                  onClick={() => {
                    setActiveSku(item.sku);
                    setScanLocation(item.sourceLocation);
                    setScanBarcode(item.barcode);
                  }}
                >
                  <span>
                    <span className="block text-small font-medium text-text-primary">{item.name}</span>
                    <span className="block text-small text-text-muted">{item.sourceLocation}</span>
                  </span>
                  <span className="text-small tabular-nums text-text-secondary">{item.pickedQty + item.currentPickQty}/{item.orderQty}</span>
                </button>
              ))}
            </div>

            <div className="sticky bottom-0 flex gap-2 bg-[#F7F9FC] pb-3 pt-1">
              <Button className="flex-1" variant="secondary" onClick={onBackToPc}>返回PC</Button>
              <Button className="flex-1" variant="primary" onClick={submitPicking}>
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                确认拣货
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
