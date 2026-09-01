import { useMemo, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  Forklift,
  PackageCheck,
  Smartphone,
  Truck,
  Users,
  Waves,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { DescriptionList } from "../components/ui/description-list";
import { Drawer } from "../components/ui/drawer";
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/modal";
import { PageHeader } from "../components/ui/page-header";
import { SegmentedControl } from "../components/ui/segmented-control";
import { Select } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  forkliftDrivers,
  forkliftProgress,
  getRule,
  sorters,
  sorterProgress,
  transferPickingTasks,
  vehicles,
  waves,
  type ClaimDimension,
  type PickMode,
  type TaskStatus,
  type TransferPickingTask,
} from "../data/transfer-picking";

/* ───────── helpers ───────── */

function taskStatusBadge(s: TaskStatus) {
  if (s === "已完成") return <Badge tone="success">{s}</Badge>;
  if (s === "进行中") return <Badge tone="processing">{s}</Badge>;
  if (s === "部分完成") return <Badge tone="pending">{s}</Badge>;
  return <Badge tone="draft">{s}</Badge>;
}
function pickModeBadge(m: PickMode) {
  if (m === "车统边拣边播") return <Badge tone="processing">{m}</Badge>;
  if (m === "车统后按店播种") return <Badge tone="pending">{m}</Badge>;
  return <Badge tone="draft">{m}</Badge>;
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "success" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
      <div className={`h-full rounded-full ${tone === "success" ? "bg-success" : "bg-primary"}`} style={{ width: `${value}%` }} />
    </div>
  );
}

/* 推进叉车端下架：找一个未完成的库位批次，推进一段 */
function advanceForklift(t: TransferPickingTask): TransferPickingTask {
  const lines = t.forkliftLines.map((l) => ({ ...l }));
  const idx = lines.findIndex((l) => l.picked < l.planned);
  if (idx < 0) return t;
  const remain = lines[idx].planned - lines[idx].picked;
  const step = Math.max(1, Math.min(remain, Math.ceil(lines[idx].planned / 3)));
  lines[idx].picked += step;
  lines[idx].status = lines[idx].picked >= lines[idx].planned ? "已下架" : "下架中";
  // 边拣边播：同步推进分拣端
  let sorterLines = t.sorterLines.map((l) => ({ ...l }));
  if (t.pickMode === "车统边拣边播") {
    sorterLines = advanceSorterLines(sorterLines, step);
  }
  return { ...t, forkliftLines: lines, sorterLines };
}

function advanceSorterLines<R extends { sorted: number; planned: number; status: "待播种" | "播种中" | "已播种" }>(
  lines: R[],
  qty: number,
): R[] {
  let left = qty;
  return lines.map((l) => {
    if (left <= 0 || l.sorted >= l.planned) return l;
    const remain = l.planned - l.sorted;
    const give = Math.min(remain, Math.max(1, Math.ceil(qty / lines.length)));
    left -= give;
    const sorted = l.sorted + give;
    return { ...l, sorted, status: sorted >= l.planned ? ("已播种" as const) : ("播种中" as const) };
  });
}

function advanceSorter(t: TransferPickingTask): TransferPickingTask {
  const allForkliftDone = t.forkliftLines.every((l) => l.status === "已下架");
  if (t.pickMode === "车统后按店播种" && !allForkliftDone) return t; // 需先下架完
  const lines = t.sorterLines.map((l) => ({ ...l }));
  const idx = lines.findIndex((l) => l.sorted < l.planned);
  if (idx < 0) return t;
  const remain = lines[idx].planned - lines[idx].sorted;
  const step = Math.max(1, Math.min(remain, Math.ceil(lines[idx].planned / 2)));
  lines[idx].sorted += step;
  lines[idx].status = lines[idx].sorted >= lines[idx].planned ? "已播种" : "播种中";
  return { ...t, sorterLines: lines };
}

function recomputeStatus(t: TransferPickingTask): TransferPickingTask {
  const fp = forkliftProgress(t);
  const sp = sorterProgress(t);
  let status: TaskStatus = t.status;
  if (fp >= 100 && sp >= 100) status = "已完成";
  else if (fp > 0 || sp > 0) status = sp >= 100 ? "部分完成" : "进行中";
  else status = "待领取";
  return { ...t, status };
}

/* ════════════════════════════════════════════════════════
   主页面
   ════════════════════════════════════════════════════════ */

export function TransferPickingPage({ onOpenRules, onOpenPda }: { onOpenRules?: () => void; onOpenPda?: () => void }) {
  const rule = getRule();
  const [tasks, setTasks] = useState<TransferPickingTask[]>(() => transferPickingTasks.map((t) => ({ ...t })));
  const [activeTaskId, setActiveTaskId] = useState(transferPickingTasks[0].id);
  const [claimDimension, setClaimDimension] = useState<ClaimDimension>(rule.claimDimension);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ kind: "vehicle" | "wave"; id: string } | null>(null);
  const [assignDriver, setAssignDriver] = useState(forkliftDrivers[0].value);
  const [assignSorter, setAssignSorter] = useState(sorters[0].value);
  const [pcAssign, setPcAssign] = useState(rule.pcAssign);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? tasks[0];
  const activeWaveNo = activeTask.waveNo;
  const activeVehicleNo = activeTask.vehicleNo;

  const waveOptions = waves.map((w) => ({ label: `${w.waveNo}（${w.taskCount}任务/${w.vehicleCount}车）`, value: w.waveNo }));
  const vehicleOptions = vehicles
    .filter((v) => v.waveNo === activeWaveNo)
    .map((v) => ({ label: `${v.vehicleNo}${v.driver ? ` · ${v.driver}` : ""}`, value: v.vehicleNo }));

  function updateTask(id: string, fn: (t: TransferPickingTask) => TransferPickingTask) {
    setTasks((prev) => prev.map((t) => (t.id === id ? recomputeStatus(fn(t)) : t)));
  }

  function pickVehicleTask(vehicleNo: string): string {
    const t = tasks.find((x) => x.vehicleNo === vehicleNo && x.status !== "已完成");
    return t?.id ?? tasks.find((x) => x.vehicleNo === vehicleNo)?.id ?? activeTaskId;
  }

  /* 派生统计 */
  const stats = useMemo(() => {
    const pendingWaves = waves.filter((w) => w.status === "待领取").length;
    const runningVehicles = vehicles.filter((v) => v.status === "进行中").length;
    const forkliftOnDuty = new Set(tasks.filter((t) => t.status === "进行中" || t.status === "部分完成").map((t) => t.forkliftDriver)).size;
    const sorterOnDuty = new Set(tasks.filter((t) => t.status === "进行中" || t.status === "部分完成").map((t) => t.sorter)).size;
    return { pendingWaves, runningVehicles, forkliftOnDuty, sorterOnDuty };
  }, [tasks]);

  const claimable =
    claimDimension === "按车"
      ? vehicles.filter((v) => v.status === "待领取").map((v) => ({ id: v.vehicleNo, label: v.vehicleNo, sub: `波次 ${v.waveNo} · ${v.taskCount} 任务`, kind: "vehicle" as const }))
      : waves.filter((w) => w.status === "待领取").map((w) => ({ id: w.waveNo, label: `${w.waveNo}`, sub: `${w.taskCount} 任务 / ${w.vehicleCount} 车 · 优先级 ${w.priority}`, kind: "wave" as const }));

  function doClaim(id: string) {
    // 标记对应任务为进行中并占位人员
    setTasks((prev) =>
      prev.map((t) => {
        const match = claimDimension === "按车" ? t.vehicleNo === id : t.waveNo === id;
        if (!match || t.status !== "待领取") return t;
        return { ...t, status: "进行中", forkliftDriver: t.forkliftDriver === "—" ? forkliftDrivers[0].value : t.forkliftDriver, sorter: t.sorter === "—" ? sorters[0].value : t.sorter };
      }),
    );
  }

  function doAssign() {
    if (!assignTarget) return;
    setTasks((prev) =>
      prev.map((t) => {
        const match = assignTarget.kind === "vehicle" ? t.vehicleNo === assignTarget.id : t.waveNo === assignTarget.id;
        if (!match) return t;
        return { ...t, forkliftDriver: assignDriver, sorter: assignSorter, status: t.status === "待领取" ? "进行中" : t.status };
      }),
    );
    setAssignTarget(null);
  }

  const detailTask = tasks.find((t) => t.id === detailId) ?? null;

  return (
    <div className="space-y-page-block">
      <PageHeader
        title="调拨拣货作业中心"
        description="合单 / 合车 / 波次配置下，叉车司机下架 与 分拣员播种 两端并行协同，打破单人串行瓶颈。"
        actions={
          <div className="flex gap-2">
            <Button variant="primary" onClick={onOpenPda}>
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              双端 PDA
            </Button>
          </div>
        }
      />

      {/* 统计卡 */}
      <div className="grid gap-4 lg:grid-cols-4">
        {[
          { label: "待领取波次", value: stats.pendingWaves, hint: "合单合车后待派发", icon: <Waves className="h-4 w-4 text-primary" /> },
          { label: "进行中车次", value: stats.runningVehicles, hint: "下架 / 播种进行中", icon: <Truck className="h-4 w-4 text-primary" /> },
          { label: "叉车端在岗", value: stats.forkliftOnDuty, hint: "司机数", icon: <Forklift className="h-4 w-4 text-primary" /> },
          { label: "分拣端在岗", value: stats.sorterOnDuty, hint: "分拣员数", icon: <Users className="h-4 w-4 text-primary" /> },
        ].map((s) => (
          <Card key={s.label} className="bg-white">
            <div className="flex items-center justify-between">
              <div className="text-small text-text-muted">{s.label}</div>
              {s.icon}
            </div>
            <div className="mt-2 text-[28px] font-semibold leading-none text-text-primary">{s.value}</div>
            <div className="mt-2 text-small text-text-secondary">{s.hint}</div>
          </Card>
        ))}
      </div>

      {/* 规则摘要 + 拣货模式切换 */}
      <Card
        title="当前生效规则"
        extra={
          <SegmentedControl
            items={[
              { label: "车统后按店播种", value: "车统后按店播种" },
              { label: "车统边拣边播", value: "车统边拣边播" },
              { label: "直接SKU播种", value: "直接SKU播种" },
            ]}
            value={activeTask.pickMode}
            onChange={(v) => updateTask(activeTask.id, (t) => ({ ...t, pickMode: v as PickMode }))}
          />
        }
      >
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg-subtle px-2.5 py-1 text-small text-text-secondary">
            合单：<span className="font-body-strong text-text-primary">{rule.mergeDimension}</span> · ≥{rule.autoMergeThreshold}单自动{rule.manualMergeSelect ? " · 保留手动" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg-subtle px-2.5 py-1 text-small text-text-secondary">
            合车：上限{rule.vehicleCapacity}车 · {rule.vehicleDimension}{rule.autoGenerateOnFull ? " · 满车自动" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg-subtle px-2.5 py-1 text-small text-text-secondary">
            波次：{rule.waveMode} {rule.waveValue}{rule.waveMode === "按时间窗" ? "分钟" : "单"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg-subtle px-2.5 py-1 text-small text-text-secondary">
            领取：{rule.claimDimension} · {rule.claimOrder}{rule.pcAssign ? " · PC指派" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-primary bg-primary-subtle px-2.5 py-1 text-small text-primary">
            双人两端协同：{rule.dualPersonCollab ? "开启" : "关闭"}
          </span>
        </div>
      </Card>

      {/* 双人两端协同看板 */}
      <Card
        title="双人两端协同作业看板"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="w-[200px]"
              value={activeWaveNo}
              onValueChange={(w) => {
                const v = vehicles.find((x) => x.waveNo === w)?.vehicleNo;
                if (v) setActiveTaskId(pickVehicleTask(v));
              }}
              options={waveOptions}
            />
            <Select
              className="w-[220px]"
              value={activeVehicleNo}
              onValueChange={(v) => setActiveTaskId(pickVehicleTask(v))}
              options={vehicleOptions}
            />
          </div>
        }
      >
        <DualBoard
          task={activeTask}
          onAdvanceForklift={() => updateTask(activeTask.id, advanceForklift)}
          onAdvanceSorter={() => updateTask(activeTask.id, advanceSorter)}
        />
      </Card>

      {/* 任务领取 / 派发 */}
      <Card
        title="任务领取 / 派发"
        extra={
          <div className="flex items-center gap-3">
            <SegmentedControl
              items={[
                { label: "按车", value: "按车" },
                { label: "按波次", value: "按波次" },
              ]}
              value={claimDimension}
              onChange={(v) => setClaimDimension(v as ClaimDimension)}
            />
            <div className="flex items-center gap-1.5 text-small text-text-secondary">
              PC指派
              <Switch checked={pcAssign} onCheckedChange={setPcAssign} />
            </div>
          </div>
        }
      >
        {claimable.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-body text-text-muted">没有待领取的{claimDimension === "按车" ? "车次" : "波次"}</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {claimable.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-sm border border-border bg-white px-3 py-2.5">
                <div>
                  <div className="font-body-strong text-text-primary">{c.label}</div>
                  <div className="mt-0.5 text-small text-text-muted">{c.sub}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => doClaim(c.id)}>领取</Button>
                  {pcAssign && (
                    <Button variant="primary" size="sm" onClick={() => setAssignTarget({ kind: c.kind, id: c.id })}>指派</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 text-small text-text-muted">
          领取顺序：<span className="font-body-strong text-text-primary">{rule.claimOrder}</span>（前端可选，PC可指派叉车司机 / 分拣员）
        </div>
      </Card>

      {/* 执行监控 */}
      <Card title="任务执行监控">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-body">
            <thead>
              <tr className="border-b border-border text-left text-small text-text-muted">
                <th className="py-2 pr-3 font-tag">任务号</th>
                <th className="py-2 pr-3 font-tag">波次/车次</th>
                <th className="py-2 pr-3 font-tag">拣货模式</th>
                <th className="py-2 pr-3 font-tag">叉车端(下架)</th>
                <th className="py-2 pr-3 font-tag">分拣端(播种)</th>
                <th className="py-2 pr-3 font-tag">叉车/分拣</th>
                <th className="py-2 pr-3 font-tag">状态</th>
                <th className="py-2 pr-3 font-tag">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="py-2.5 pr-3 font-body-strong text-text-primary">{t.taskNo}</td>
                  <td className="py-2.5 pr-3 text-text-secondary">{t.waveNo}<br /><span className="text-small text-text-muted">{t.vehicleNo}</span></td>
                  <td className="py-2.5 pr-3">{pickModeBadge(t.pickMode)}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24"><ProgressBar value={forkliftProgress(t)} tone={forkliftProgress(t) >= 100 ? "success" : "primary"} /></div>
                      <span className="text-small text-text-secondary">{forkliftProgress(t)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24"><ProgressBar value={sorterProgress(t)} tone={sorterProgress(t) >= 100 ? "success" : "primary"} /></div>
                      <span className="text-small text-text-secondary">{sorterProgress(t)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-small text-text-secondary">{t.forkliftDriver}<br />{t.sorter}</td>
                  <td className="py-2.5 pr-3">{taskStatusBadge(t.status)}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setActiveTaskId(t.id)}>看板</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(t.id)}>详情</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 详情抽屉 */}
      <Drawer open={!!detailTask} title={detailTask?.taskNo} onClose={() => setDetailId(null)} widthClassName="w-[min(46vw,820px)] min-w-[520px]">
        {detailTask && (
          <div className="space-y-4">
            <DescriptionList
              columns={3}
              items={[
                { label: "波次号", value: detailTask.waveNo },
                { label: "车次", value: detailTask.vehicleNo },
                { label: "拣货模式", value: pickModeBadge(detailTask.pickMode) },
                { label: "叉车司机", value: detailTask.forkliftDriver },
                { label: "分拣员", value: detailTask.sorter },
                { label: "状态", value: taskStatusBadge(detailTask.status) },
                { label: "下架进度", value: `${forkliftProgress(detailTask)}%` },
                { label: "播种进度", value: `${sorterProgress(detailTask)}%` },
              ]}
            />
            <div>
              <div className="mb-2 font-body-strong text-text-primary">叉车端 · 下架明细</div>
              <div className="space-y-1.5">
                {detailTask.forkliftLines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between rounded-sm border border-border bg-white px-3 py-2 text-small">
                    <span className="text-text-primary">{l.location} · 批次 {l.batchNo}</span>
                    <span className="text-text-secondary">{l.picked}/{l.planned} {l.skuName.split(" ")[1] ?? "件"}</span>
                    <Badge tone={l.status === "已下架" ? "success" : l.status === "下架中" ? "processing" : "draft"}>{l.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-body-strong text-text-primary">分拣端 · 播种明细</div>
              <div className="space-y-1.5">
                {detailTask.sorterLines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between rounded-sm border border-border bg-white px-3 py-2 text-small">
                    <span className="text-text-primary">{l.dest}{l.store ? ` · ${l.store}` : ""} · 批次 {l.batchNo}</span>
                    <span className="text-text-secondary">{l.sorted}/{l.planned}</span>
                    <Badge tone={l.status === "已播种" ? "success" : l.status === "播种中" ? "processing" : "draft"}>{l.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 指派 Modal */}
      <Modal open={!!assignTarget} title={`PC 指派 · ${assignTarget?.kind === "vehicle" ? "车次" : "波次"} ${assignTarget?.id}`} onClose={() => setAssignTarget(null)} widthClassName="max-w-[480px]">
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-small text-text-muted">指派叉车司机（下架端）</div>
            <Select value={assignDriver} onValueChange={setAssignDriver} options={forkliftDrivers} />
          </div>
          <div>
            <div className="mb-1 text-small text-text-muted">指派分拣员（播种端）</div>
            <Select value={assignSorter} onValueChange={setAssignSorter} options={sorters} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>取消</Button>
            <Button variant="primary" onClick={doAssign}>
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              确认指派
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   双人两端协同看板
   ════════════════════════════════════════════════════════ */

function DualBoard({
  task,
  onAdvanceForklift,
  onAdvanceSorter,
}: {
  task: TransferPickingTask;
  onAdvanceForklift: () => void;
  onAdvanceSorter: () => void;
}) {
  const fp = forkliftProgress(task);
  const sp = sorterProgress(task);
  const allForkliftDone = task.forkliftLines.every((l) => l.status === "已下架");
  const sorterLocked = task.pickMode === "车统后按店播种" && !allForkliftDone;

  const linkageNote =
    task.pickMode === "车统边拣边播"
      ? `边拣边播：分拣端实时跟进下架，已同步 ${sp}%`
      : task.pickMode === "车统后按店播种"
        ? sorterLocked
          ? "先下架后播种：待叉车端全部下架完成，分拣端按店播种"
          : "下架已完成，分拣端按店播种中"
        : "直接 SKU 播种：按 SKU 直播，不按店聚合";

  return (
    <div>
      {/* 任务头 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-primary bg-primary-subtle px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-body-strong text-text-primary">{task.taskNo}</span>
          {pickModeBadge(task.pickMode)}
          {taskStatusBadge(task.status)}
        </div>
        <div className="text-small text-text-secondary">
          {task.waveNo} · {task.vehicleNo} · 共 {task.totalQty} 件
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px_1fr]">
        {/* 叉车端 */}
        <div className="rounded-sm border border-border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-body-strong text-text-primary">
              <Forklift className="h-4 w-4 text-primary" aria-hidden="true" />
              叉车端 · 下架
            </div>
            <Badge tone="processing">{task.forkliftDriver}</Badge>
          </div>
          <div className="mb-2 flex items-center justify-between text-small text-text-secondary">
            <span>下架进度</span>
            <span className="font-body-strong text-text-primary">{fp}%</span>
          </div>
          <ProgressBar value={fp} tone={fp >= 100 ? "success" : "primary"} />
          <div className="mt-3 space-y-1.5">
            {task.forkliftLines.map((l, i) => (
              <div key={i} className={`rounded-sm border px-2.5 py-1.5 text-small ${l.status === "已下架" ? "border-success bg-success-subtle" : l.status === "下架中" ? "border-primary bg-primary-subtle" : "border-border bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-text-primary">{l.location}</span>
                  <Badge tone={l.status === "已下架" ? "success" : l.status === "下架中" ? "processing" : "draft"}>{l.status}</Badge>
                </div>
                <div className="mt-0.5 text-text-muted">批次 {l.batchNo} · {l.skuName} · {l.picked}/{l.planned}</div>
              </div>
            ))}
          </div>
          <Button variant="primary" size="sm" className="mt-3 w-full" disabled={fp >= 100} onClick={onAdvanceForklift}>
            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
            模拟下架一批
          </Button>
        </div>

        {/* 联动状态 */}
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-bg-subtle px-3 py-4 text-center">
          <div className="text-small text-text-muted">任务联动</div>
          <div className="mt-1 flex items-center gap-1 text-text-secondary">
            <span className="text-small">下架</span>
            <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="text-small">播种</span>
          </div>
          <div className="mt-3 w-full">
            <div className="text-small text-text-muted">两端并行度</div>
            <div className="mt-1 flex items-center justify-center gap-1 text-body-lg font-body-strong text-primary">
              {task.pickMode === "车统边拣边播" ? "同步并行" : task.pickMode === "车统后按店播种" ? "先下后播" : "SKU 直播"}
            </div>
          </div>
          <div className="mt-3 rounded-sm bg-white px-2 py-1.5 text-small text-text-secondary">{linkageNote}</div>
          <div className="mt-3 grid w-full grid-cols-2 gap-2 text-small">
            <div className="rounded-sm bg-white px-2 py-1.5">
              <div className="text-text-muted">下架</div>
              <div className="font-body-strong text-text-primary">{fp}%</div>
            </div>
            <div className="rounded-sm bg-white px-2 py-1.5">
              <div className="text-text-muted">播种</div>
              <div className="font-body-strong text-text-primary">{sp}%</div>
            </div>
          </div>
        </div>

        {/* 分拣端 */}
        <div className={`rounded-sm border bg-white p-3 ${sorterLocked ? "border-border opacity-70" : "border-border"}`}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-body-strong text-text-primary">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              分拣端 · 播种
            </div>
            <Badge tone="processing">{task.sorter}</Badge>
          </div>
          <div className="mb-2 flex items-center justify-between text-small text-text-secondary">
            <span>播种进度</span>
            <span className="font-body-strong text-text-primary">{sp}%</span>
          </div>
          <ProgressBar value={sp} tone={sp >= 100 ? "success" : "primary"} />
          <div className="mt-3 space-y-1.5">
            {task.sorterLines.map((l, i) => (
              <div key={i} className={`rounded-sm border px-2.5 py-1.5 text-small ${l.status === "已播种" ? "border-success bg-success-subtle" : l.status === "播种中" ? "border-primary bg-primary-subtle" : "border-border bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-text-primary">{l.dest}{l.store ? ` · ${l.store}` : ""}</span>
                  <Badge tone={l.status === "已播种" ? "success" : l.status === "播种中" ? "processing" : "draft"}>{l.status}</Badge>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-text-muted">
                  <span>{l.skuName} · {l.sorted}/{l.planned}</span>
                  <span className="rounded-sm bg-bg-subtle px-1.5 py-0.5 text-text-secondary">批次 {l.batchNo}</span>
                </div>
              </div>
            ))}
          </div>
          <Button variant="primary" size="sm" className="mt-3 w-full" disabled={sp >= 100 || sorterLocked} onClick={onAdvanceSorter}>
            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {sorterLocked ? "等待下架完成" : "模拟播种一批"}
          </Button>
        </div>
      </div>
    </div>
  );
}
