import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  CornerDownRight,
  Database,
  Forklift,
  Layers3,
  PackageCheck,
  ScanLine,
  Smartphone,
  Warehouse,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/modal";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import {
  combinedTasks,
  suggestCombinedTasks,
  transferOrders,
  type CombinedTask,
  type TaskStatus,
} from "../data/transfer-dispatch";

type ViewMode = "pc" | "pda";

const driverOptions = [
  { label: "刘海峰 / 叉车司机", value: "刘海峰" },
  { label: "陈伟 / 叉车司机", value: "陈伟" },
  { label: "王强 / 叉车司机", value: "王强" },
];

/* ───────── helpers ───────── */

function statusBadge(status: TaskStatus) {
  if (status === "已完成") return <Badge tone="success">{status}</Badge>;
  if (status === "待发运" || status === "分播中") return <Badge tone="processing">{status}</Badge>;
  if (status === "下架中") return <Badge tone="pending">{status}</Badge>;
  return <Badge tone="draft">{status}</Badge>;
}

/* ════════════════════════════════════════════════════════
   主页面
   ════════════════════════════════════════════════════════ */

export function TransferDispatchPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("pc");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(combinedTasks[0].id);
  const [selectedDriver, setSelectedDriver] = useState("刘海峰");

  const activeTask = combinedTasks.find((t) => t.id === activeTaskId) ?? combinedTasks[0];

  const pendingOrders = useMemo(
    () => transferOrders.filter((o) => o.status === "待合并"),
    [],
  );
  const { tasks: suggestions } = useMemo(
    () => suggestCombinedTasks(pendingOrders),
    [pendingOrders],
  );

  if (viewMode === "pda") {
    return <DriverPdaView task={activeTask} onBack={() => setViewMode("pc")} />;
  }

  const totalPending = pendingOrders.length;
  const running = combinedTasks.filter((t) => t.status !== "已完成").length;

  return (
    <div className="space-y-page-block">
      <PageHeader
        title="调拨作业中心"
        description="同一 SKU 的调拨单合并为一个大任务。不同库位/批次的货，叉车在 PDA 上逐批下架并指定分到各仓的数量，全程可追溯。"
        actions={
          <Button variant="primary" onClick={() => setViewMode("pda")}>
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            司机PDA
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["待合并调拨单", totalPending, `含 ${suggestions.length} 个建议任务`],
          ["执行中任务", running, "下架中 / 分播中 / 待发运"],
          ["当前司机", [...new Set(combinedTasks.map((t) => t.forkliftDriver))].length, "绑定任务中的司机"],
          ["本周完成", combinedTasks.filter((t) => t.status === "已完成").length, "已完结的调拨任务"],
        ].map(([label, value, hint]) => (
          <Card key={label} className="bg-white">
            <div className="text-small text-text-muted">{label}</div>
            <div className="mt-2 text-[28px] font-semibold leading-none text-text-primary">{value}</div>
            <div className="mt-2 text-small text-text-secondary">{hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="1. 调拨单合并任务">
          {suggestions.length === 0 ? (
            <div className="flex h-28 items-center justify-center text-body text-text-muted">没有待合并的调拨单</div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((s) => (
                <div key={s.sku} className="overflow-hidden rounded-sm border border-primary">
                  <div className="flex items-center justify-between bg-primary-subtle px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="font-body-strong text-text-primary">{s.skuName}</span>
                    </div>
                    <Badge tone="processing">合并任务 · {s.orderCount} 单</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-border bg-white px-3 py-2 text-small text-text-secondary">
                    <div>SKU：{s.sku}</div>
                    <div>批次：{s.batchNo}</div>
                    <div>库位：{s.location}</div>
                  </div>
                  <div className="bg-white px-3 py-2">
                    <div className="text-small text-text-muted">分播目标</div>
                    <div className="mt-1.5 grid gap-1.5">
                      {s.destinations.map((d) => (
                        <div key={d.targetWarehouse} className="flex items-center justify-between rounded-sm border border-border px-2.5 py-1.5">
                          <span className="text-small text-text-primary">{d.targetWarehouse}</span>
                          <span className="text-small font-body-strong text-text-primary">{d.qty} {s.unit}</span>
                          <span className="text-small text-text-muted">{d.orderId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border bg-bg-subtle px-3 py-1.5 text-small text-text-secondary">
                    <span>合计</span>
                    <span className="font-body-strong text-text-primary">{s.totalQty} {s.unit}</span>
                  </div>
                </div>
              ))}
              {suggestions.length === 1 && suggestions[0].orderCount === 1 && (
                <div className="rounded-sm border border-primary bg-primary-subtle px-3 py-2 text-small text-text-primary">
                  只有 1 个调拨单，直接生成独立任务派给叉车司机，不等待合并。
                </div>
              )}
            </div>
          )}
        </Card>

        <Card title="2. 任务派发">
          {suggestions.length === 0 ? (
            <div className="flex h-28 items-center justify-center text-body text-text-muted">没有待派发的任务</div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((s) => (
                <div key={s.sku} className="rounded-sm border border-primary bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-body-strong text-text-primary">{s.skuName} · {s.totalQty} {s.unit}</span>
                      <div className="mt-0.5 text-small text-text-muted">{s.destinations.map((d) => `${d.targetWarehouse} ${d.qty}${s.unit}`).join("、")}</div>
                    </div>
                    <Badge tone="processing">{s.orderCount > 1 ? `${s.orderCount}单合并` : "单任务"}</Badge>
                  </div>
                  <div className="mt-2">
                    <div className="text-small text-text-muted">指派叉车司机</div>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver} options={driverOptions} />
                  </div>
                  <div className="mt-1 text-small text-text-secondary">SKU {s.sku} · 批次 {s.batchNo} · 库位 {s.location}</div>
                </div>
              ))}
              <Button variant="primary" className="w-full" onClick={() => setAssignModalOpen(true)}>
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                生成任务并派发给司机
              </Button>
            </div>
          )}
          <details className="mt-3 rounded-sm border border-border bg-bg-subtle px-3 py-2 text-small text-text-secondary">
            <summary className="cursor-pointer font-body-strong">操作说明</summary>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>同一 SKU + 批次自动合并为大任务</li>
              <li>不同库位可能有不同批次的同一 SKU</li>
              <li>PDA 逐批下架 + 指定分仓，全程可追溯</li>
              <li>一个调拨单也生成任务，不等凑单</li>
            </ul>
          </details>
        </Card>
      </div>

      {/* ─── 执行监控（带批次追溯） ─── */}
      <Card title="3. 任务执行监控（含批次追溯）">
        <div className="grid gap-4">
          {combinedTasks.map((task) => {
            const isActive = task.id === activeTaskId;
            const isMerged = task.destinations.length > 1;
            return (
              <button
                key={task.id}
                type="button"
                className={`rounded-sm border p-4 text-left ${isActive ? "border-primary bg-primary-subtle" : "border-border bg-white hover:bg-bg-hover"}`}
                onClick={() => setActiveTaskId(task.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-body-strong text-text-primary">{task.taskNo}</span>
                    {statusBadge(task.status)}
                    {isMerged ? <Badge tone="processing">合并</Badge> : <Badge tone="draft">独立</Badge>}
                  </div>
                  <div className="text-right text-small text-text-secondary">
                    <div>司机：{task.forkliftDriver}</div>
                    <div>下架：{task.pickedQty}/{task.totalQty}</div>
                  </div>
                </div>
                <div className="mt-1 text-small text-text-secondary">{task.skuName}</div>

                {/* 分播进度 */}
                {isMerged && (
                  <>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {task.destinations.map((d) => (
                        <div key={d.targetWarehouse} className="flex items-center gap-1 text-small text-text-secondary">
                          <span className="text-text-muted">{d.targetWarehouse.replace("配送仓-", "")}:</span>
                          <span className="font-body-strong text-text-primary">{d.sortedQty}/{d.plannedQty}</span>
                        </div>
                      ))}
                    </div>

                    {/* 批次追溯明细 */}
                    <details className="mt-2 rounded-sm border border-border bg-white px-2.5 py-1.5">
                      <summary className="cursor-pointer text-small text-text-muted">
                        <Database className="mr-1 inline h-3 w-3" aria-hidden="true" />
                        批次来源追溯
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {task.pickRecords.map((rec) => (
                          <div key={rec.id} className="rounded-sm bg-bg-subtle px-2 py-1.5 text-small">
                            <div className="text-text-muted">
                              下架 {rec.location} | 批次 {rec.batchNo} | {rec.qty} {task.unit}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-text-primary">
                              {rec.allocations.map((a) => (
                                <span key={a.targetWarehouse} className="flex items-center gap-1">
                                  <CornerDownRight className="h-3 w-3 text-text-muted" aria-hidden="true" />
                                  {a.targetWarehouse.replace("配送仓-", "")} +{a.qty}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                )}

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Modal open={assignModalOpen} title="调拨任务已派发" onClose={() => setAssignModalOpen(false)} widthClassName="max-w-[560px]">
        <div className="space-y-4">
          <div className="rounded-sm border border-primary bg-primary-subtle p-3">
            <div className="font-body-strong text-text-primary">已生成 {suggestions.length} 个调拨任务</div>
          </div>
          {suggestions.map((s) => (
            <div key={s.sku} className="rounded-sm border border-border bg-white p-3">
              <div className="font-body-strong text-text-primary">{s.skuName} · {s.totalQty} {s.unit}</div>
              <div className="mt-1.5 grid grid-cols-2 gap-1 text-small text-text-secondary">
                <div>司机：{selectedDriver}</div>
                <div>{s.orderCount > 1 ? `${s.orderCount} 单合并` : "独立任务"}</div>
              </div>
              <div className="mt-1 text-small text-text-muted">{s.destinations.map((d) => `${d.targetWarehouse} ${d.qty}${s.unit}`).join("、")}</div>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>继续PC监控</Button>
            <Button variant="primary" onClick={() => { setAssignModalOpen(false); setViewMode("pda"); }}>
              打开司机PDA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   PDA：叉车司机 — 逐批下架 + 批次→分仓分配
   ════════════════════════════════════════════════════════ */

type PdaStep = "list" | "batch" | "pick" | "allocate";

function DriverPdaView({ task, onBack }: { task: CombinedTask; onBack: () => void }) {
  const [step, setStep] = useState<PdaStep>("list");

  /* 哪些库位已完成下架 */
  const [locationDone, setLocationDone] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    task.pickLocations.forEach((pl) => {
      if (pl.pickedQty > 0) m[pl.location] = pl.pickedQty;
    });
    return m;
  });

  /* 分播累积 */
  const [sortTotal, setSortTotal] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    task.destinations.forEach((d) => {
      m[d.targetWarehouse] = d.sortedQty;
    });
    return m;
  });

  /* 当前选择的库位 — 找到第一个未下架完的 */
  const [activeLocationIdx, setActiveLocationIdx] = useState(() => {
    const idx = task.pickLocations.findIndex(
      (pl) => (locationDone[pl.location] ?? 0) < pl.availableQty,
    );
    return idx >= 0 ? idx : 0;
  });
  const activeLoc = task.pickLocations[activeLocationIdx];

  /* 多批次选择 */
  const [multiBatchIndices, setMultiBatchIndices] = useState<number[]>([]);

  /* 本次下架数量 */
  const [pickQty, setPickQty] = useState(0);

  /* 分播分配：自选仓模式 */
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [allocQty, setAllocQty] = useState(0);
  const [allocDone, setAllocDone] = useState<Record<string, number>>({});

  const allPicked = task.pickLocations.every((pl) => locationDone[pl.location] >= pl.availableQty);
  const totalSorted = Object.values(sortTotal).reduce((s, v) => s + v, 0);
  const allSorted = task.destinations.every((d) => (sortTotal[d.targetWarehouse] ?? 0) >= d.plannedQty);

  /* 还有需求的仓（按原始顺序过滤） */
  const needyDestinations = task.destinations.filter(
    (d) => (sortTotal[d.targetWarehouse] ?? 0) < d.plannedQty,
  );

  function remaining(warehouse: string): number {
    const d = task.destinations.find((dd) => dd.targetWarehouse === warehouse);
    if (!d) return 0;
    return Math.max(0, d.plannedQty - (sortTotal[warehouse] ?? 0));
  }

  function enterPick() {
    const batchIndices = task.pickLocations
      .map((pl, i) => (pl.location === activeLoc.location ? i : -1))
      .filter((i) => i >= 0 && (locationDone[task.pickLocations[i].location] ?? 0) < task.pickLocations[i].availableQty);
    if (batchIndices.length > 1) {
      // 同一库位有多个待下架批次 → 先选批次
      setMultiBatchIndices(batchIndices);
      setStep("batch");
    } else {
      setPickQty(0);
      setStep("pick");
    }
  }

  /* 进入分播分配 */
  function enterAllocate() {
    setSelectedDest(null);
    setAllocQty(0);
    setAllocDone({});
    setStep("allocate");
  }

  /* 确认选中的仓的分配 */
  function confirmAllocStep() {
    if (!selectedDest) return;

    const newAllocDone = { ...allocDone, [selectedDest]: allocQty };
    setAllocDone(newAllocDone);

    const accounted = Object.values(newAllocDone).reduce((s, v) => s + v, 0);
    if (accounted >= pickQty) {
      // 全部分完 → 写入下架 + 分播
      setLocationDone((prev) => ({ ...prev, [activeLoc.location]: (prev[activeLoc.location] ?? 0) + pickQty }));
      setSortTotal((prev) => {
        const next = { ...prev };
        Object.entries(newAllocDone).forEach(([wh, qty]) => {
          next[wh] = (next[wh] ?? 0) + qty;
        });
        return next;
      });
      setStep("list");
      const nextIdx = task.pickLocations.findIndex(
        (pl, i) => i > activeLocationIdx && !(locationDone[pl.location] >= pl.availableQty),
      );
      if (nextIdx >= 0) setActiveLocationIdx(nextIdx);
    } else {
      // 还有 → 回到选仓
      setSelectedDest(null);
      setAllocQty(0);
    }
  }

  /* ── 总览 step ── */
  if (step === "list") {
    return (
      <PdaFrame title="调拨拣货" badge={task.destinations.length > 1 ? "合并任务" : "独立任务"} onBack={onBack}>
        <div className="rounded-sm border border-primary bg-primary-subtle p-3">
          <div className="font-body-strong text-text-primary">{task.skuName}</div>
          <div className="mt-1 grid grid-cols-2 gap-1 text-small text-text-secondary">
            <div>总计 {task.totalQty} {task.unit}</div>
            <div>司机 {task.forkliftDriver}</div>
            <div>下架 {task.pickedQty}/{task.totalQty}</div>
            <div>分播 {totalSorted}/{task.totalQty}</div>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/50">
            <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
          </div>
        </div>

        {/* 库位批次列表 */}
        <div className="grid gap-1.5">
          <div className="text-small text-text-muted">下架来源（按库位逐批）</div>
          {task.pickLocations.map((pl, i) => {
            const picked = locationDone[pl.location] ?? 0;
            const completed = picked >= pl.availableQty;
            const isCurrent = i === activeLocationIdx && !completed;
            return (
              <div
                key={pl.location}
                className={`rounded-sm border p-2.5 ${
                  completed
                    ? "border-success bg-success-subtle"
                    : isCurrent
                      ? "border-primary bg-primary-subtle"
                      : "border-border bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-small font-body-strong text-text-primary">{pl.location}</span>
                    <span className="ml-2 text-small text-text-muted">批次 {pl.batchNo}</span>
                  </div>
                  {completed ? (
                    <Badge tone="success">✓ {pl.availableQty}{task.unit}</Badge>
                  ) : (
                    <span className="text-small text-text-secondary">
                      {picked}/{pl.availableQty} {task.unit}
                    </span>
                  )}
                </div>
                {isCurrent && !completed && (
                  <Button variant="primary" size="sm" className="mt-1.5 w-full" onClick={enterPick}>
                    <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
                    开始此库位下架
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* 分播需求 */}
        <div className="rounded-sm border border-border bg-white p-3">
          <div className="text-small text-text-muted">分播需求</div>
          <div className="mt-2 grid gap-2">
            {task.destinations.map((d) => {
              const current = sortTotal[d.targetWarehouse] ?? 0;
              const done = current >= d.plannedQty;
              const pct = d.plannedQty > 0 ? Math.round((current / d.plannedQty) * 100) : 0;
              return (
                <div key={d.targetWarehouse}>
                  <div className="flex items-center justify-between text-small">
                    <span className="flex items-center gap-1.5">
                      {d.targetWarehouse.replace("配送仓-", "")}
                      {done && <Badge tone="success">✓</Badge>}
                    </span>
                    <span className="text-text-secondary">{current}/{d.plannedQty}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                    <div className={`h-full rounded-full ${done ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 批次追溯 */}
        <details className="rounded-sm border border-border bg-white p-2.5">
          <summary className="cursor-pointer text-small text-text-muted">
            <Database className="mr-1 inline h-3 w-3" aria-hidden="true" />
            历史下架记录追溯
          </summary>
          <div className="mt-2 space-y-1.5">
            {task.pickRecords.map((rec) => (
              <div key={rec.id} className="rounded-sm bg-bg-subtle px-2 py-1.5 text-small">
                <div className="text-text-muted">{rec.location} | 批次 {rec.batchNo} | {rec.qty} {task.unit}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-text-primary">
                  {rec.allocations.map((a) => (
                    <span key={a.targetWarehouse}>{a.targetWarehouse.replace("配送仓-", "")} +{a.qty}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>

        {allPicked && allSorted && <Badge tone="success">全部下架 + 分播完成</Badge>}

        <Button variant="secondary" className="w-full" onClick={onBack}>返回PC</Button>
      </PdaFrame>
    );
  }

  /* ── 批次选择 step（同一库位多批次时） ── */
  if (step === "batch") {
    return (
      <PdaFrame title="选择批次" badge={activeLoc.location} onBack={() => setStep("list")}>
        <div className="rounded-sm border border-primary bg-primary-subtle p-3">
          <div className="font-body-strong text-text-primary">{activeLoc.location}</div>
          <div className="mt-1 text-small text-text-secondary">该库位有多个批次待下架，请选择</div>
        </div>
        <div className="grid gap-2">
          {multiBatchIndices.map((idx) => {
            const pl = task.pickLocations[idx];
            const picked = locationDone[pl.location] ?? 0;
            const remaining = pl.availableQty - picked;
            return (
              <button
                key={`${pl.batchNo}-${idx}`}
                type="button"
                className="rounded-sm border border-border bg-white p-3 text-left hover:bg-primary-subtle"
                onClick={() => {
                  setActiveLocationIdx(idx);
                  setPickQty(0);
                  setStep("pick");
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-body-strong text-text-primary">批次 {pl.batchNo}</span>
                  <span className="text-small text-text-secondary">剩余 {remaining} {task.unit}</span>
                </div>
              </button>
            );
          })}
        </div>
        <Button variant="secondary" className="w-full" onClick={() => setStep("list")}>返回</Button>
      </PdaFrame>
    );
  }

  /* ── 下架 step ── */
  if (step === "pick") {
    const alreadyDone = locationDone[activeLoc.location] ?? 0;
    const maxQty = activeLoc.availableQty - alreadyDone;
    return (
      <PdaFrame title="① 下架" badge={`批次 ${activeLoc.batchNo}`} onBack={() => setStep("list")}>
        <div className="rounded-sm border border-primary bg-primary-subtle p-3">
          <div className="font-body-strong text-text-primary">{activeLoc.location}</div>
          <div className="mt-1 text-small text-text-secondary">{task.skuName} · 批次 {activeLoc.batchNo}</div>
        </div>
        <div className="rounded-sm border border-border bg-white p-3">
          <div className="field-label">
            <ScanLine className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            扫描 / 确认库位
          </div>
          <Input value={activeLoc.location} readOnly />
        </div>
        <div className="rounded-sm border border-border bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-small text-text-muted">下架数量</span>
            <span className="text-body-lg font-body-strong text-text-primary">{pickQty} / {maxQty}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[maxQty, Math.floor(maxQty * 0.5), Math.floor(maxQty * 0.25)].map((n) => (
              <Button key={n} variant="secondary" size="sm" onClick={() => setPickQty(n)} disabled={n <= 0}>
                {n > 0 ? n : 0}
              </Button>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setPickQty(maxQty)}>全量</Button>
          </div>
        </div>
        <Button
          variant="primary"
          className="w-full"
          disabled={pickQty <= 0 || pickQty > maxQty}
          onClick={enterAllocate}
        >
          下架 {pickQty} {task.unit}，去分播
          <CornerDownRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PdaFrame>
    );
  }

  /* ── allocate step：自选仓 → 输数量 ── */
  const accountedSoFar = Object.values(allocDone).reduce((s, v) => s + v, 0);
  const remainingToAlloc = pickQty - accountedSoFar;

  if (step === "allocate") {
    /* ── 模式 A：选仓 ── */
    if (!selectedDest) {
      const allDone = accountedSoFar >= pickQty;
      return (
        <PdaFrame title="② 分播" badge={`批次 ${activeLoc.batchNo}`} onBack={() => setStep("pick")}>
          <div className="flex items-center justify-between rounded-sm border border-primary bg-primary-subtle px-3 py-2">
            <span className="text-small text-text-primary">
              {activeLoc.batchNo} 批次 · {pickQty} {task.unit}
            </span>
            <span className="text-small text-text-secondary">
              已分 {accountedSoFar}，剩 {remainingToAlloc}
            </span>
          </div>

          {allDone ? (
            <div className="rounded-sm border border-success bg-success-subtle p-4 text-center">
              <div className="font-body-strong text-success">全部分完 ✓</div>
              <Button variant="primary" className="mt-3 w-full" onClick={confirmAllocStep}>
                完成分播，返回总览
              </Button>
            </div>
          ) : (
            <>
              <div className="text-small text-text-muted">选择分到哪个仓</div>
              <div className="grid grid-cols-1 gap-2">
                {task.destinations.map((d) => {
                  const remain = remaining(d.targetWarehouse);
                  const alreadyHere = allocDone[d.targetWarehouse] ?? 0;
                  const satisfied = remain <= 0;
                  return (
                    <button
                      key={d.targetWarehouse}
                      type="button"
                      disabled={satisfied}
                      className={`rounded-sm border p-3 text-left transition ${
                        satisfied
                          ? "border-border bg-bg-subtle opacity-50"
                          : "border-primary bg-white hover:bg-primary-subtle"
                      }`}
                      onClick={() => setSelectedDest(d.targetWarehouse)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-body-strong text-text-primary">
                          {d.targetWarehouse.replace("配送仓-", "")}
                        </span>
                        {satisfied ? (
                          <Badge tone="success">已满足</Badge>
                        ) : (
                          <span className="text-small text-text-secondary">
                            还需 {remain} {task.unit}
                          </span>
                        )}
                      </div>
                      {alreadyHere > 0 && (
                        <div className="mt-0.5 text-small text-text-muted">
                          本次已分配 {alreadyHere} {task.unit}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="rounded-sm border border-border bg-white p-2.5 text-center text-small">
            <span className="text-text-muted">分播进度 </span>
            <span className="font-body-strong text-text-primary">
              {accountedSoFar} / {pickQty} {task.unit}
            </span>
          </div>

          <Button variant="secondary" className="w-full" onClick={() => setStep("pick")}>
            返回修改下架数量
          </Button>
        </PdaFrame>
      );
    }

    /* ── 模式 B：输入分配数量 ── */
    const need = remaining(selectedDest);
    const canMax = Math.min(need, remainingToAlloc);

    return (
      <PdaFrame title="② 分播" badge={`${selectedDest.replace("配送仓-", "")}`} onBack={() => { setSelectedDest(null); setAllocQty(0); }}>
        <div className="flex items-center justify-between rounded-sm border border-primary bg-primary-subtle px-3 py-2">
          <span className="text-small text-text-primary">
            {activeLoc.batchNo} 批次 · 剩 {remainingToAlloc} {task.unit}
          </span>
          <span className="text-small text-text-secondary">
            已分 {accountedSoFar}/{pickQty}
          </span>
        </div>

        <div className="rounded-sm border-2 border-primary bg-white p-4 text-center">
          <div className="text-small text-text-muted">分到</div>
          <div className="mt-1 text-[22px] font-bold text-text-primary">
            {selectedDest.replace("配送仓-", "")}
          </div>
          <div className="mt-1 text-small text-text-secondary">
            还可接收 {need} {task.unit}
          </div>
          <div className="mx-auto mt-3 flex max-w-[180px] items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-10 w-10 rounded-full p-0 text-lg"
              onClick={() => setAllocQty(Math.max(0, allocQty - 10))}
              disabled={allocQty <= 0}
            >−</Button>
            <Input
              type="number"
              min={0}
              max={canMax}
              value={allocQty || ""}
              placeholder="0"
              className="text-center text-body-lg"
              onChange={(e) => setAllocQty(Math.max(0, Math.min(canMax, Number(e.target.value) || 0)))}
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-10 w-10 rounded-full p-0 text-lg"
              onClick={() => setAllocQty(Math.min(canMax, allocQty + 10))}
              disabled={allocQty >= canMax}
            >+</Button>
          </div>
          <div className="mt-2 flex justify-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => setAllocQty(Math.min(canMax, 10))}>10</Button>
            <Button variant="secondary" size="sm" onClick={() => setAllocQty(Math.min(canMax, 50))}>50</Button>
            <Button variant="secondary" size="sm" onClick={() => setAllocQty(canMax)}>全部 {canMax}</Button>
          </div>
        </div>

        <div className="rounded-sm border border-border bg-white p-2.5 text-center">
          <span className="text-small text-text-muted">本仓分配 </span>
          <span className="font-body-strong text-text-primary">
            {allocQty} / {accountedSoFar + allocQty + (remainingToAlloc - allocQty)} {task.unit}
          </span>
        </div>

        <Button variant="primary" className="w-full" disabled={allocQty <= 0} onClick={confirmAllocStep}>
          <PackageCheck className="h-4 w-4" aria-hidden="true" />
          {accountedSoFar + allocQty >= pickQty
            ? "全部分完 ✓"
            : `确认 ${allocQty} ${task.unit} 分到 ${selectedDest.replace("配送仓-", "")}`}
        </Button>
      </PdaFrame>
    );
  }

  return (
    <PdaFrame title="调拨拣货" badge="合并任务" onBack={onBack}>
      <div className="text-center text-body text-text-muted">加载中...</div>
    </PdaFrame>
  );
}

/* ════════════════════════════════════════════════════════
   PDA 框架组件
   ════════════════════════════════════════════════════════ */

function PdaFrame({
  title,
  badge,
  onBack,
  children,
}: {
  title: string;
  badge: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#E8EDF3] px-3 py-4">
      <div className="mx-auto max-w-[430px] overflow-hidden rounded-[28px] border border-[#1F2937] bg-[#111827] p-2 shadow-xl">
        <div className="rounded-[22px] bg-[#F7F9FC]">
          <div className="flex items-center justify-between bg-[#111827] px-4 py-2 text-[12px] text-white">
            <span>09:41</span>
            <span>5G · 86%</span>
          </div>
          <div className="flex items-center justify-between border-b border-border bg-white px-3 py-3">
            <Button variant="ghost" size="sm" onClick={onBack}>‹ 返回</Button>
            <div className="font-body-strong text-text-primary">{title}</div>
            <Badge tone="pending">{badge}</Badge>
          </div>
          <div className="space-y-3 p-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
