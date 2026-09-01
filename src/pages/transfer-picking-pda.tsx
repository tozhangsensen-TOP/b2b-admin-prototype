import { useMemo, useState } from "react";
import {
  BatteryCharging,
  Check,
  Forklift,
  Lock,
  PackageCheck,
  ScanLine,
  Users,
  Wifi,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { SegmentedControl } from "../components/ui/segmented-control";
import { Select } from "../components/ui/select";
import {
  forkliftProgress,
  sorterProgress,
  transferPickingTasks,
  type ForkliftLine,
  type SorterLine,
  type TransferPickingTask,
} from "../data/transfer-picking";

type End = "forklift" | "sorter";

/* ───────── helpers ───────── */

function pickModeBadge(m: TransferPickingTask["pickMode"]) {
  if (m === "车统边拣边播") return <Badge tone="processing">{m}</Badge>;
  if (m === "车统后按店播种") return <Badge tone="pending">{m}</Badge>;
  return <Badge tone="draft">{m}</Badge>;
}

function recompute(t: TransferPickingTask): TransferPickingTask {
  const fp = forkliftProgress(t);
  const sp = sorterProgress(t);
  let status = t.status;
  if (fp >= 100 && sp >= 100) status = "已完成";
  else if (fp > 0 || sp > 0) status = sp >= 100 ? "部分完成" : "进行中";
  else status = "待领取";
  return { ...t, status };
}

/* 推进下架：指定库位批次 + 数量；边拣边播时同步推进分拣端 */
function applyForkliftPick(t: TransferPickingTask, line: ForkliftLine, qty: number): TransferPickingTask {
  const forkliftLines = t.forkliftLines.map((l) =>
    l.location === line.location && l.batchNo === line.batchNo
      ? { ...l, picked: Math.min(l.planned, l.picked + qty), status: (l.picked + qty >= l.planned ? "已下架" : "下架中") as ForkliftLine["status"] }
      : l,
  );
  let sorterLines = t.sorterLines.map((l) => ({ ...l }));
  if (t.pickMode === "车统边拣边播" && qty > 0) {
    let left = qty;
    const needy = sorterLines.filter((l) => l.sorted < l.planned);
    const per = Math.max(1, Math.ceil(qty / Math.max(1, needy.length)));
    sorterLines = sorterLines.map((l) => {
      if (left <= 0 || l.sorted >= l.planned) return l;
      const give = Math.min(per, l.planned - l.sorted, left);
      left -= give;
      const sorted = l.sorted + give;
      return { ...l, sorted, status: (sorted >= l.planned ? "已播种" : "播种中") as SorterLine["status"] };
    });
  }
  return recompute({ ...t, forkliftLines, sorterLines });
}

/* 推进播种：指定目标 + 数量 */
function applySorterSeed(t: TransferPickingTask, line: SorterLine, qty: number): TransferPickingTask {
  const sorterLines = t.sorterLines.map((l) =>
    l.dest === line.dest && l.sku === line.sku && l.batchNo === line.batchNo
      ? { ...l, sorted: Math.min(l.planned, l.sorted + qty), status: (l.sorted + qty >= l.planned ? "已播种" : "播种中") as SorterLine["status"] }
      : l,
  );
  return recompute({ ...t, sorterLines });
}

/* ════════════════════════════════════════════════════════
   页面
   ════════════════════════════════════════════════════════ */

export function TransferPickingPdaPage() {
  const [tasks, setTasks] = useState<TransferPickingTask[]>(() => transferPickingTasks.map((t) => ({ ...t })));
  const [end, setEnd] = useState<End>("forklift");
  const [taskId, setTaskId] = useState(transferPickingTasks[0].id);

  const task = tasks.find((t) => t.id === taskId) ?? tasks[0];
  const taskOptions = tasks.map((t) => ({ label: `${t.taskNo} · ${t.vehicleNo}`, value: t.id }));

  function update(fn: (t: TransferPickingTask) => TransferPickingTask) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? fn(t) : t)));
  }

  return (
    <PdaFrame
      title={end === "forklift" ? "叉车端 · 下架" : "分拣端 · 播种"}
      badge={task?.vehicleNo ?? ""}
      topExtra={
        <SegmentedControl
          items={[
            { label: "叉车端", value: "forklift" },
            { label: "分拣端", value: "sorter" },
          ]}
          value={end}
          onChange={(v) => setEnd(v as End)}
        />
      }
    >
      <div>
        <div className="field-label">任务号</div>
        <Select value={taskId} options={taskOptions} onValueChange={setTaskId} />
      </div>

      {task && (() => {
        const dests = Array.from(new Set(task.sorterLines.map((l) => l.dest)));
        const totalPlanned = task.sorterLines.reduce((s, l) => s + l.planned, 0);
        const skuSet = Array.from(new Set(task.forkliftLines.map((l) => l.skuName)));
        const primarySkuName = skuSet.length === 1 ? skuSet[0] : skuSet.length > 1 ? `${skuSet[0]} 等 ${skuSet.length} 个 SKU` : "—";
        return (
          <div className="rounded-sm border border-primary bg-primary-subtle p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-body-strong text-text-primary">{primarySkuName}</div>
                <div className="mt-0.5 truncate text-small text-text-muted">
                  {task.taskNo} · 车次 {task.vehicleNo}
                </div>
              </div>
              {pickModeBadge(task.pickMode)}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1 text-small text-text-secondary">
              <div>总需求量 {totalPlanned} 件</div>
              <div>需求仓数 {dests.length}</div>
              <div>下架 {forkliftProgress(task)}%</div>
              <div>播种 {sorterProgress(task)}%</div>
            </div>
            <div className="mt-2 rounded-sm bg-white/60 px-2 py-1.5 text-small">
              <div className="text-text-muted">
                需求仓：{dests.join(" ")}
              </div>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/50">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((forkliftProgress(task) + sorterProgress(task)) / 2)}%` }} />
            </div>
          </div>
        );
      })()}

      {end === "forklift"
        ? <ForkliftEnd task={task} onPick={(line, qty) => update((t) => applyForkliftPick(t, line, qty))} />
        : <SorterEnd task={task} onSeed={(line, qty) => update((t) => applySorterSeed(t, line, qty))} />}
    </PdaFrame>
  );
}

/* ════════════════════════════════════════════════════════
   叉车端 · 下架
   ════════════════════════════════════════════════════════ */

function ForkliftEnd({ task, onPick }: { task: TransferPickingTask; onPick: (line: ForkliftLine, qty: number) => void }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pickQty, setPickQty] = useState(0);

  const lines = task.forkliftLines;
  const active = lines.find((l) => `${l.location}|${l.batchNo}` === activeKey) ?? null;

  function openLine(l: ForkliftLine) {
    setActiveKey(`${l.location}|${l.batchNo}`);
    setPickQty(Math.max(0, l.planned - l.picked));
  }

  return (
    <>
      <div className="text-small text-text-muted">下架来源（按库位逐批）</div>
      <div className="grid gap-1.5">
        {lines.map((l) => {
          const done = l.picked >= l.planned;
          const isActive = active && active.location === l.location && active.batchNo === l.batchNo;
          return (
            <div key={`${l.location}-${l.batchNo}`} className={`rounded-sm border p-2.5 ${done ? "border-success bg-success-subtle" : isActive ? "border-primary bg-white" : "border-border bg-white"}`}>
              <button type="button" className="w-full text-left" onClick={() => !done && openLine(l)} disabled={done}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-small font-body-strong text-text-primary">{l.location}</span>
                    <span className="ml-2 text-small text-text-muted">批次 {l.batchNo}</span>
                  </div>
                  {done ? <Badge tone="success">✓ {l.planned}</Badge> : <span className="text-small text-text-secondary">{l.picked}/{l.planned}</span>}
                </div>
                <div className="mt-0.5 text-small text-text-muted">{l.skuName}</div>
              </button>

              {isActive && !done && (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  <div className="rounded-sm border border-border bg-white p-2">
                    <div className="field-label"><ScanLine className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />扫描 / 确认库位</div>
                    <Input value={l.location} readOnly />
                  </div>
                  <div className="flex items-center justify-between text-small text-text-secondary">
                    <span>本次下架数量</span>
                    <span className="font-body-strong text-text-primary">{pickQty} / {l.planned - l.picked}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[Math.ceil((l.planned - l.picked) / 2), Math.ceil((l.planned - l.picked) / 4), l.planned - l.picked].map((n, i) => (
                      <Button key={i} variant="secondary" size="sm" disabled={n <= 0} onClick={() => setPickQty(n)}>{n > 0 ? n : 0}</Button>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={pickQty <= 0 || pickQty > l.planned - l.picked}
                    onClick={() => { onPick(l, pickQty); setActiveKey(null); setPickQty(0); }}
                  >
                    <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    确认下架 {pickQty}
                    {task.pickMode === "车统边拣边播" && <span className="ml-1 text-small opacity-90">· 同步播种</span>}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-sm border border-border bg-white p-2.5 text-small text-text-secondary">
        <Forklift className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
        司机：{task.forkliftDriver}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════
   分拣端 · 播种
   ════════════════════════════════════════════════════════ */

function SorterEnd({ task, onSeed }: { task: TransferPickingTask; onSeed: (line: SorterLine, qty: number) => void }) {
  const allForkliftDone = task.forkliftLines.every((l) => l.status === "已下架");
  const locked = task.pickMode === "车统后按店播种" && !allForkliftDone;

  // 按 SKU 分组
  const skuGroups = useMemo(() => {
    const map = new Map<string, { sku: string; skuName: string; lines: SorterLine[] }>();
    for (const l of task.sorterLines) {
      const g = map.get(l.sku) ?? { sku: l.sku, skuName: l.skuName, lines: [] };
      g.lines.push(l);
      map.set(l.sku, g);
    }
    return Array.from(map.values());
  }, [task.sorterLines]);

  return (
    <>
      {locked && (
        <div className="flex items-center gap-1.5 rounded-sm border border-pending bg-tag-pending px-2.5 py-1.5 text-small text-text-primary">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          当前为「车统后按店播种」：待叉车端全部下架完成后，分拣端才可播种。
        </div>
      )}

      <div className="text-small text-text-muted">见货分货：选择本次批次，按 SKU 分到各仓</div>

      <div className="grid gap-2">
        {skuGroups.map((g) => (
          <SkuSeedCard
            key={g.sku}
            sku={g.sku}
            skuName={g.skuName}
            lines={g.lines}
            forkliftLines={task.forkliftLines}
            locked={locked}
            onSeed={onSeed}
          />
        ))}
      </div>

      <div className="rounded-sm border border-border bg-white p-2.5 text-small text-text-secondary">
        <Users className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
        分拣员：{task.sorter}
      </div>
    </>
  );
}

/* SKU 见货分货卡片：选批次 → 各仓输数量 → 确认播种 */
function SkuSeedCard({
  sku,
  skuName,
  lines,
  forkliftLines,
  locked,
  onSeed,
}: {
  sku: string;
  skuName: string;
  lines: SorterLine[];
  forkliftLines: ForkliftLine[];
  locked: boolean;
  onSeed: (line: SorterLine, qty: number) => void;
}) {
  // 可选批次：forkliftLines 中该 SKU 且已下架数量 > 0 的批次
  const availableBatches = useMemo(() => {
    const set = new Set<string>();
    forkliftLines
      .filter((fl) => fl.sku === sku && fl.picked > 0)
      .forEach((fl) => set.add(fl.batchNo));
    return Array.from(set);
  }, [forkliftLines, sku]);

  const [batch, setBatch] = useState(availableBatches[0] ?? "");
  const [inputs, setInputs] = useState<Record<string, number>>({});

  // 当前批次下的各仓明细
  const batchLines = lines.filter((l) => l.batchNo === batch);
  const totalPlanned = lines.reduce((s, l) => s + l.planned, 0);
  const totalSorted = lines.reduce((s, l) => s + l.sorted, 0);

  function setQty(dest: string, qty: number) {
    setInputs((prev) => ({ ...prev, [dest]: qty }));
  }

  function fillRemaining(dest: string, line: SorterLine) {
    setQty(dest, Math.max(0, line.planned - line.sorted));
  }

  function confirmAll() {
    for (const l of batchLines) {
      const qty = inputs[l.dest] ?? 0;
      if (qty > 0) onSeed(l, qty);
    }
    setInputs({});
  }

  const hasInput = batchLines.some((l) => (inputs[l.dest] ?? 0) > 0);

  return (
    <div className="rounded-sm border border-border bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="truncate font-body-strong text-text-primary">{skuName}</div>
          <div className="mt-0.5 text-small text-text-muted">
            总需求 {totalPlanned} · 已播种 {totalSorted}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="field-label">本次批次（见货选择）</div>
        {availableBatches.length === 0 ? (
          <div className="rounded-sm border border-border bg-bg-subtle px-2 py-1.5 text-small text-text-muted">
            该 SKU 暂无已下架批次，无法播种
          </div>
        ) : (
          <Select
            value={batch}
            onValueChange={setBatch}
            options={availableBatches.map((b) => ({ label: `批次 ${b}`, value: b }))}
          />
        )}
      </div>

      {availableBatches.length > 0 && (
        <>
          <div className="mt-2 space-y-1.5">
            {batchLines.map((l) => {
              const remain = Math.max(0, l.planned - l.sorted);
              const v = inputs[l.dest] ?? 0;
              const done = remain <= 0;
              return (
                <div
                  key={l.dest}
                  className={`rounded-sm border px-2.5 py-1.5 ${done ? "border-success bg-success-subtle" : "border-border bg-white"}`}
                >
                  <div className="flex items-center justify-between text-small">
                    <span className="text-text-primary">
                      {l.dest}{l.store ? ` · ${l.store}` : ""}
                    </span>
                    <span className="text-text-secondary">
                      需 {l.planned} · 已 {l.sorted}
                    </span>
                  </div>
                  {!done && !locked && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={remain}
                        value={v || ""}
                        placeholder="0"
                        className="flex-1 text-center"
                        onChange={(e) => setQty(l.dest, Math.max(0, Math.min(remain, Number(e.target.value) || 0)))}
                      />
                      <Button variant="secondary" size="sm" onClick={() => fillRemaining(l.dest, l)}>剩余 {remain}</Button>
                    </div>
                  )}
                  {done && <div className="mt-0.5 text-small text-success">✓ 已播种完成</div>}
                </div>
              );
            })}
          </div>

          <Button
            variant="primary"
            className="mt-2 w-full"
            disabled={!hasInput || locked}
            onClick={confirmAll}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            确认播种 → 批次 {batch}
          </Button>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   PDA 框架
   ════════════════════════════════════════════════════════ */

function PdaFrame({
  title,
  badge,
  onBack,
  topExtra,
  children,
}: {
  title: string;
  badge: string;
  onBack?: () => void;
  topExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#E8EDF3] px-3 py-4">
      <div className="mx-auto max-w-[430px] overflow-hidden rounded-[28px] border border-[#1F2937] bg-[#111827] p-2 shadow-xl">
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
            <div className="text-body font-medium text-text-primary">{title}</div>
            <Badge tone="pending">{badge}</Badge>
          </div>
          {topExtra && <div className="border-b border-border bg-white px-3 py-2">{topExtra}</div>}
          <div className="space-y-3 p-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
