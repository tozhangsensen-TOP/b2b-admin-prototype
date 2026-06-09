import { useMemo, useState } from "react";
import { ChevronDown, MonitorCheck, Smartphone } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { DemoToolbar } from "../components/ui/demo-toolbar";
import { ExceptionState } from "../components/ui/exception-state";
import { HorizontalScrollArea } from "../components/ui/horizontal-scroll-area";
import { Input } from "../components/ui/input";
import { ListPageMainCard } from "../components/ui/list-page-layout";
import { Modal } from "../components/ui/modal";
import { Pagination } from "../components/ui/pagination";
import { PageHeader } from "../components/ui/page-header";
import { getVisibleQuerySectionItems, hasCollapsedQuerySectionItems } from "../components/ui/query-section";
import { Select } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";
import {
  pickingLineItemsMap,
  type PickingLineItem,
  type PickingStatus,
  type PickingTaskRow,
} from "../data/picking-task";

export type PickingScenario = "normal" | "loading" | "empty" | "no-result" | "no-auth";

const pickingListTabs = [
  { label: "正常", value: "normal" },
  { label: "加载中", value: "loading" },
  { label: "空数据", value: "empty" },
  { label: "查询无结果", value: "no-result" },
  { label: "无权限", value: "no-auth" },
] as const;

const statusTabs = [
  { label: "全部", value: "全部" },
  { label: "待拣货", value: "待拣货" },
  { label: "拣货中", value: "拣货中" },
  { label: "部分拣货", value: "部分拣货" },
  { label: "已完成", value: "已完成" },
] as const;

const warehouseOptions = [
  { label: "全部", value: "全部" },
  { label: "上海生鲜仓", value: "上海生鲜仓" },
  { label: "北京中转仓", value: "北京中转仓" },
  { label: "广州常温仓", value: "广州常温仓" },
  { label: "武汉常温仓", value: "武汉常温仓" },
  { label: "杭州冷链仓", value: "杭州冷链仓" },
  { label: "深圳设备仓", value: "深圳设备仓" },
];

const priorityOptions = [
  { label: "全部", value: "全部" },
  { label: "高", value: "高" },
  { label: "中", value: "中" },
  { label: "低", value: "低" },
];

function statusBadge(status: PickingStatus) {
  if (status === "已完成") return <Badge tone="success">{status}</Badge>;
  if (status === "部分拣货") return <Badge tone="processing">{status}</Badge>;
  if (status === "拣货中") return <Badge tone="pending">{status}</Badge>;
  if (status === "待拣货") return <Badge tone="draft">{status}</Badge>;
  return <Badge tone="closed">{status}</Badge>;
}

function priorityBadge(priority: "高" | "中" | "低") {
  if (priority === "高") return <Badge tone="error">{priority}</Badge>;
  if (priority === "中") return <Badge tone="pending">{priority}</Badge>;
  return <Badge tone="draft">{priority}</Badge>;
}

type PickingFilters = {
  id: string;
  outboundOrderId: string;
  warehouse: string;
  priority: string;
};

const defaultFilters: PickingFilters = {
  id: "",
  outboundOrderId: "",
  warehouse: "全部",
  priority: "全部",
};

export function PickingTaskPage({
  tasks,
  scenario,
  onScenarioChange,
  onStartPicking,
  onConfirmPicking,
  onOpenPdaPicking,
}: {
  tasks: PickingTaskRow[];
  scenario: PickingScenario;
  onScenarioChange: (value: PickingScenario) => void;
  onStartPicking: (id: string) => void;
  onConfirmPicking: (id: string, items: PickingLineItem[]) => void;
  onOpenPdaPicking: (taskId?: string) => void;
}) {
  const [draftFilters, setDraftFilters] = useState<PickingFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<PickingFilters>(defaultFilters);
  const [activeStatusTab, setActiveStatusTab] = useState<string>("全部");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [pickingModalOpen, setPickingModalOpen] = useState(false);
  const [activePickingTask, setActivePickingTask] = useState<PickingTaskRow | null>(null);
  const [pickingItems, setPickingItems] = useState<PickingLineItem[]>([]);

  const queryFieldDefinitions = [
    { key: "id", label: "拣货任务号" },
    { key: "outboundOrderId", label: "出库单号" },
    { key: "warehouse", label: "仓库" },
    { key: "priority", label: "优先级" },
  ];
  const visibleQueryFields = getVisibleQuerySectionItems(queryFieldDefinitions, showMoreFilters);
  const visibleQueryFieldKeys = new Set(visibleQueryFields.map((f) => f.key));
  const hasCollapsedQueryFields = hasCollapsedQuerySectionItems(queryFieldDefinitions);

  const filteredTasks = useMemo(() => {
    return tasks.filter((row) => {
      const matchesStatusTab = activeStatusTab === "全部" || row.status === activeStatusTab;
      if (!matchesStatusTab) return false;
      if (activeFilters.id && !row.id.toLowerCase().includes(activeFilters.id.toLowerCase())) return false;
      if (activeFilters.outboundOrderId && !row.outboundOrderId.toLowerCase().includes(activeFilters.outboundOrderId.toLowerCase())) return false;
      if (activeFilters.warehouse !== "全部" && row.warehouse !== activeFilters.warehouse) return false;
      if (activeFilters.priority !== "全部" && row.priority !== activeFilters.priority) return false;
      return true;
    });
  }, [tasks, activeStatusTab, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const pageRows = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  const summaryCards = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "待拣货").length;
    const inProgress = tasks.filter((t) => t.status === "拣货中" || t.status === "部分拣货").length;
    const done = tasks.filter((t) => t.status === "已完成").length;
    const urgent = tasks.filter((t) => t.priority === "高" && t.status !== "已完成").length;
    return { pending, inProgress, done, urgent };
  }, [tasks]);

  function handleQuery() {
    setActiveFilters(draftFilters);
    setPage(1);
    const nextRows = tasks.filter((row) => {
      const matchesStatusTab = activeStatusTab === "全部" || row.status === activeStatusTab;
      if (!matchesStatusTab) return false;
      if (draftFilters.id && !row.id.toLowerCase().includes(draftFilters.id.toLowerCase())) return false;
      if (draftFilters.outboundOrderId && !row.outboundOrderId.toLowerCase().includes(draftFilters.outboundOrderId.toLowerCase())) return false;
      if (draftFilters.warehouse !== "全部" && row.warehouse !== draftFilters.warehouse) return false;
      if (draftFilters.priority !== "全部" && row.priority !== draftFilters.priority) return false;
      return true;
    });
    onScenarioChange(nextRows.length > 0 ? "normal" : "no-result");
  }

  function handleReset() {
    setDraftFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    setShowMoreFilters(false);
    setPage(1);
    onScenarioChange(tasks.length > 0 ? "normal" : "empty");
  }

  function openPickingConfirm(task: PickingTaskRow) {
    const lineItems = pickingLineItemsMap[task.id] ?? [];
    setActivePickingTask(task);
    setPickingItems(lineItems.map((item) => ({ ...item })));
    setPickingModalOpen(true);
  }

  function startPicking(task: PickingTaskRow) {
    onStartPicking(task.id);
    openPickingConfirm({ ...task, status: "拣货中" });
  }

  function fillSuggestedQty() {
    setPickingItems((current) =>
      current.map((item) => ({
        ...item,
        currentPickQty: Math.max(0, item.orderQty - item.pickedQty),
      })),
    );
  }

  function updatePickingItemQty(sku: string, value: string) {
    const qty = Math.max(0, Number(value) || 0);
    setPickingItems((current) =>
      current.map((item) => (item.sku === sku ? { ...item, currentPickQty: qty } : item)),
    );
  }

  function confirmPicking() {
    if (!activePickingTask) return;
    const itemsToPick = pickingItems.filter((item) => item.currentPickQty > 0);
    onConfirmPicking(activePickingTask.id, itemsToPick);
    setPickingModalOpen(false);
    setActivePickingTask(null);
  }

  const showTable = scenario === "normal";

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="PC拣货执行页" items={pickingListTabs} value={scenario} onChange={onScenarioChange} />

      <PageHeader
        title="拣货执行"
        description="PC端用于查看出库通知单下发后的拣货任务池，支持任务领取、执行跟踪、差异确认与跳转PDA H5拣货。"
        actions={
          <Button variant="primary" onClick={() => onOpenPdaPicking(tasks.find((task) => task.status !== "已完成")?.id)} disabled={!tasks.length}>
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            打开PDA H5
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">待拣货</div>
          <div className="mt-1 text-section-title font-section-title text-warning">{summaryCards.pending}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">执行中</div>
          <div className="mt-1 text-section-title font-section-title text-link">{summaryCards.inProgress}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">高优先级</div>
          <div className="mt-1 text-section-title font-section-title text-danger">{summaryCards.urgent}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">已完成</div>
          <div className="mt-1 text-section-title font-section-title text-success">{summaryCards.done}</div>
        </div>
      </div>

      <div className="grid gap-3">
        <Card>
          <div className="query-section-grid">
            {visibleQueryFieldKeys.has("id") ? (
              <div>
                <div className="field-label">拣货任务号</div>
                <Input value={draftFilters.id} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, id: e.target.value }))} />
              </div>
            ) : null}
            {visibleQueryFieldKeys.has("outboundOrderId") ? (
              <div>
                <div className="field-label">出库单号</div>
                <Input value={draftFilters.outboundOrderId} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, outboundOrderId: e.target.value }))} />
              </div>
            ) : null}
            {visibleQueryFieldKeys.has("warehouse") ? (
              <div>
                <div className="field-label">仓库</div>
                <Select value={draftFilters.warehouse} options={warehouseOptions} placeholder="请选择" onValueChange={(v) => setDraftFilters((f) => ({ ...f, warehouse: v }))} />
              </div>
            ) : null}
            {visibleQueryFieldKeys.has("priority") ? (
              <div>
                <div className="field-label">优先级</div>
                <Select value={draftFilters.priority} options={priorityOptions} placeholder="请选择" onValueChange={(v) => setDraftFilters((f) => ({ ...f, priority: v }))} />
              </div>
            ) : null}
          </div>
          <div className="query-section-actions">
            {hasCollapsedQueryFields ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-small text-link transition hover:text-link-hover"
                onClick={() => setShowMoreFilters((v) => !v)}
              >
                <ChevronDown aria-hidden="true" strokeWidth={1.8} className={`h-4 w-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
                {showMoreFilters ? "收起" : "展开"}
              </button>
            ) : null}
            <Button variant="secondary" onClick={handleReset}>重置</Button>
            <Button variant="primary" onClick={handleQuery}>查询</Button>
          </div>
        </Card>
      </div>

      {scenario === "no-auth" ? (
        <ExceptionState variant="403" description="当前用户没有拣货执行权限，需开通出库执行菜单和仓库数据范围。" primaryAction={<Button variant="primary">联系管理员</Button>} secondaryAction={<Button>返回首页</Button>} />
      ) : null}

      {scenario === "loading" ? (
        <Card title="加载中">
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-sm bg-bg-subtle" />
            ))}
          </div>
        </Card>
      ) : null}

      {scenario === "empty" ? (
        <ExceptionState variant="404" title="空数据" description="当前没有拣货执行任务，请先从出库通知单下发拣货。" />
      ) : null}

      {scenario === "no-result" ? (
        <ExceptionState variant="404" title="查询无结果" description="没有符合当前筛选条件的拣货任务，请调整条件后重试。" primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>} secondaryAction={<Button onClick={handleQuery}>重新查询</Button>} />
      ) : null}

      {showTable && filteredTasks.length > 0 ? (
        <ListPageMainCard>
          <div className="px-4 pt-3">
            <Tabs items={[...statusTabs]} value={activeStatusTab} onChange={(v) => { setActiveStatusTab(v); setPage(1); }} />
          </div>
          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 150, minWidth: 150 }}>拣货任务号</th>
                  <th style={{ width: 140, minWidth: 140 }}>波次号</th>
                  <th style={{ width: 150, minWidth: 150 }}>出库单号</th>
                  <th style={{ width: 130, minWidth: 130 }}>仓库</th>
                  <th style={{ width: 110, minWidth: 110 }}>拣货路径</th>
                  <th style={{ width: 90, minWidth: 90 }}>状态</th>
                  <th style={{ width: 80, minWidth: 80 }}>优先级</th>
                  <th style={{ width: 100, minWidth: 100 }}>应拣数量</th>
                  <th style={{ width: 100, minWidth: 100 }}>已拣数量</th>
                  <th style={{ width: 120, minWidth: 120 }}>要求完成</th>
                  <th style={{ width: 100, minWidth: 100 }}>拣货员</th>
                  <th style={{ width: 190, minWidth: 190 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="tabular-nums text-link">{row.id}</td>
                    <td className="tabular-nums">{row.waveNo}</td>
                    <td className="tabular-nums">{row.outboundOrderId}</td>
                    <td>{row.warehouse}</td>
                    <td>{row.route}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td>{priorityBadge(row.priority)}</td>
                    <td className="tabular-nums">{row.totalQty.toLocaleString()}</td>
                    <td className="tabular-nums">{row.pickedQty.toLocaleString()}</td>
                    <td>{row.dueAt.slice(5, 16)}</td>
                    <td>{row.picker}</td>
                    <td>
                      <div className="flex items-center gap-actions">
                        {row.status === "待拣货" ? (
                          <Button size="sm" variant="primary" onClick={() => startPicking(row)}>领取拣货</Button>
                        ) : row.status === "拣货中" || row.status === "部分拣货" ? (
                          <Button size="sm" variant="primary" onClick={() => openPickingConfirm(row)}>确认拣货</Button>
                        ) : (
                          <Button size="sm" disabled>已完成</Button>
                        )}
                        {row.status !== "待拣货" ? (
                          <Button size="sm" variant="secondary" onClick={() => onOpenPdaPicking(row.id)}>PDA H5</Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={filteredTasks.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            showTopBorder
            onPageChange={setPage}
            onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          />
        </ListPageMainCard>
      ) : null}

      <Modal open={pickingModalOpen} title={activePickingTask ? `PC确认拣货 - ${activePickingTask.id}` : "PC确认拣货"} onClose={() => setPickingModalOpen(false)}>
        <div className="space-y-4">
          {activePickingTask ? (
            <div className="grid gap-3 rounded-sm border border-border bg-bg-subtle p-3 text-small text-text-secondary md:grid-cols-4">
              <div>仓库：{activePickingTask.warehouse}</div>
              <div>路径：{activePickingTask.route}</div>
              <div>承运商：{activePickingTask.carrier}</div>
              <div>优先级：{activePickingTask.priority}</div>
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-sm border border-border p-3 text-small">
            <div className="inline-flex items-center gap-2 text-text-secondary">
              <MonitorCheck className="h-4 w-4 text-link" aria-hidden="true" />
              PC端用于主管或仓管补录/确认拣货结果；真实扫描流程请进入PDA H5页面操作。
            </div>
            <Button size="sm" variant="secondary" onClick={fillSuggestedQty}>填充建议量</Button>
          </div>

          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th>商品编码</th>
                  <th>商品名称</th>
                  <th>批次</th>
                  <th>库位</th>
                  <th>应拣</th>
                  <th>已拣</th>
                  <th>本次拣货</th>
                </tr>
              </thead>
              <tbody>
                {pickingItems.map((item) => (
                    <tr key={item.sku}>
                      <td className="tabular-nums">{item.sku}</td>
                      <td>{item.name}</td>
                      <td>{item.batchNo}</td>
                      <td>{item.sourceLocation}</td>
                      <td className="tabular-nums">{item.orderQty.toLocaleString()}</td>
                      <td className="tabular-nums">{item.pickedQty.toLocaleString()}</td>
                      <td>
                        <Input
                          type="number"
                          min={0}
                          max={item.orderQty - item.pickedQty}
                          value={item.currentPickQty || ""}
                          placeholder="请输入"
                          className="w-20"
                          onChange={(e) => updatePickingItemQty(item.sku, e.target.value)}
                        />
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={() => setPickingModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={confirmPicking}>确认拣货</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
