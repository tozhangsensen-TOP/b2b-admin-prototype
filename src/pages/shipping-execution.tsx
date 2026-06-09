import { useMemo, useState } from "react";
import { ChevronDown, PackageCheck, Truck } from "lucide-react";
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
import { shippingLineItemsMap, type ShippingExecutionRow, type ShippingLineItem, type ShippingStatus } from "../data/shipping-execution";

export type ShippingScenario = "normal" | "loading" | "empty" | "no-result" | "no-auth";

const demoTabs = [
  { label: "正常", value: "normal" },
  { label: "加载中", value: "loading" },
  { label: "空数据", value: "empty" },
  { label: "查询无结果", value: "no-result" },
  { label: "无权限", value: "no-auth" },
] as const;

const statusTabs = [
  { label: "全部", value: "全部" },
  { label: "待复核", value: "待复核" },
  { label: "复核中", value: "复核中" },
  { label: "待交接", value: "待交接" },
  { label: "已发运", value: "已发运" },
  { label: "异常", value: "异常" },
] as const;

const warehouseOptions = [
  { label: "全部", value: "全部" },
  { label: "上海生鲜仓", value: "上海生鲜仓" },
  { label: "北京中转仓", value: "北京中转仓" },
  { label: "广州常温仓", value: "广州常温仓" },
  { label: "武汉常温仓", value: "武汉常温仓" },
  { label: "杭州冷链仓", value: "杭州冷链仓" },
];

type Filters = {
  id: string;
  outboundOrderId: string;
  warehouse: string;
};

const defaultFilters: Filters = {
  id: "",
  outboundOrderId: "",
  warehouse: "全部",
};

function statusBadge(status: ShippingStatus) {
  if (status === "已发运") return <Badge tone="success">{status}</Badge>;
  if (status === "待交接") return <Badge tone="processing">{status}</Badge>;
  if (status === "复核中") return <Badge tone="pending">{status}</Badge>;
  if (status === "异常") return <Badge tone="error">{status}</Badge>;
  return <Badge tone="draft">{status}</Badge>;
}

function priorityBadge(priority: "高" | "中" | "低") {
  if (priority === "高") return <Badge tone="error">{priority}</Badge>;
  if (priority === "中") return <Badge tone="pending">{priority}</Badge>;
  return <Badge tone="draft">{priority}</Badge>;
}

export function ShippingExecutionPage({
  tasks,
  scenario,
  onScenarioChange,
  onConfirmReview,
  onShip,
}: {
  tasks: ShippingExecutionRow[];
  scenario: ShippingScenario;
  onScenarioChange: (value: ShippingScenario) => void;
  onConfirmReview: (id: string, items: ShippingLineItem[]) => void;
  onShip: (id: string) => void;
}) {
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<Filters>(defaultFilters);
  const [activeStatusTab, setActiveStatusTab] = useState("全部");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<ShippingExecutionRow | null>(null);
  const [lineItems, setLineItems] = useState<ShippingLineItem[]>([]);

  const queryFieldDefinitions = [
    { key: "id", label: "复核单号" },
    { key: "outboundOrderId", label: "出库通知单号" },
    { key: "warehouse", label: "仓库" },
  ];
  const visibleFields = getVisibleQuerySectionItems(queryFieldDefinitions, showMoreFilters);
  const visibleKeys = new Set(visibleFields.map((field) => field.key));
  const hasCollapsedFields = hasCollapsedQuerySectionItems(queryFieldDefinitions);

  const filteredTasks = useMemo(() => {
    return tasks.filter((row) => {
      if (activeStatusTab !== "全部" && row.status !== activeStatusTab) return false;
      if (activeFilters.id && !row.id.toLowerCase().includes(activeFilters.id.toLowerCase())) return false;
      if (activeFilters.outboundOrderId && !row.outboundOrderId.toLowerCase().includes(activeFilters.outboundOrderId.toLowerCase())) return false;
      if (activeFilters.warehouse !== "全部" && row.warehouse !== activeFilters.warehouse) return false;
      return true;
    });
  }, [tasks, activeFilters, activeStatusTab]);

  const summary = useMemo(() => {
    const waitingReview = tasks.filter((item) => item.status === "待复核" || item.status === "复核中").length;
    const waitingHandover = tasks.filter((item) => item.status === "待交接").length;
    const exception = tasks.filter((item) => item.status === "异常").length;
    return { waitingReview, waitingHandover, exception };
  }, [tasks]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const pageRows = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  function handleQuery() {
    setActiveFilters(draftFilters);
    setPage(1);
    const hasRows = tasks.some((row) => {
      if (activeStatusTab !== "全部" && row.status !== activeStatusTab) return false;
      if (draftFilters.id && !row.id.toLowerCase().includes(draftFilters.id.toLowerCase())) return false;
      if (draftFilters.outboundOrderId && !row.outboundOrderId.toLowerCase().includes(draftFilters.outboundOrderId.toLowerCase())) return false;
      if (draftFilters.warehouse !== "全部" && row.warehouse !== draftFilters.warehouse) return false;
      return true;
    });
    onScenarioChange(hasRows ? "normal" : "no-result");
  }

  function handleReset() {
    setDraftFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    setShowMoreFilters(false);
    setPage(1);
    onScenarioChange(tasks.length ? "normal" : "empty");
  }

  function openReview(task: ShippingExecutionRow) {
    const items = shippingLineItemsMap[task.id] ?? [];
    setActiveTask(task);
    setLineItems(items.map((item) => ({ ...item })));
    setModalOpen(true);
  }

  function fillRemaining() {
    setLineItems((current) =>
      current.map((item) => ({ ...item, currentCheckQty: Math.max(0, item.pickedQty - item.checkedQty) })),
    );
  }

  function updateQty(sku: string, value: string) {
    const qty = Math.max(0, Number(value) || 0);
    setLineItems((current) => current.map((item) => (item.sku === sku ? { ...item, currentCheckQty: qty } : item)));
  }

  function confirmReview() {
    if (!activeTask) return;
    onConfirmReview(activeTask.id, lineItems);
    setModalOpen(false);
  }

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="复核发运页" items={demoTabs} value={scenario} onChange={onScenarioChange} />
      <PageHeader
        title="复核发运"
        description="承接拣货完成后的出库复核、装箱确认、承运商交接与发运状态更新。"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">待复核</div>
          <div className="mt-1 text-section-title font-section-title text-warning">{summary.waitingReview}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">待交接</div>
          <div className="mt-1 text-section-title font-section-title text-link">{summary.waitingHandover}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">异常</div>
          <div className="mt-1 text-section-title font-section-title text-danger">{summary.exception}</div>
        </div>
      </div>

      <Card>
        <div className="query-section-grid">
          {visibleKeys.has("id") ? (
            <div>
              <div className="field-label">复核单号</div>
              <Input value={draftFilters.id} placeholder="请输入" onChange={(event) => setDraftFilters((value) => ({ ...value, id: event.target.value }))} />
            </div>
          ) : null}
          {visibleKeys.has("outboundOrderId") ? (
            <div>
              <div className="field-label">出库通知单号</div>
              <Input value={draftFilters.outboundOrderId} placeholder="请输入" onChange={(event) => setDraftFilters((value) => ({ ...value, outboundOrderId: event.target.value }))} />
            </div>
          ) : null}
          {visibleKeys.has("warehouse") ? (
            <div>
              <div className="field-label">仓库</div>
              <Select value={draftFilters.warehouse} options={warehouseOptions} onValueChange={(value) => setDraftFilters((item) => ({ ...item, warehouse: value }))} />
            </div>
          ) : null}
        </div>
        <div className="query-section-actions">
          {hasCollapsedFields ? (
            <button type="button" className="inline-flex items-center gap-1 text-small text-link transition hover:text-link-hover" onClick={() => setShowMoreFilters((value) => !value)}>
              <ChevronDown aria-hidden="true" strokeWidth={1.8} className={`h-4 w-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
              {showMoreFilters ? "收起" : "展开"}
            </button>
          ) : null}
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          <Button variant="primary" onClick={handleQuery}>查询</Button>
        </div>
      </Card>

      {scenario === "no-auth" ? <ExceptionState variant="403" description="当前用户没有复核发运权限。" primaryAction={<Button variant="primary">联系管理员</Button>} /> : null}
      {scenario === "loading" ? <Card title="加载中"><div className="h-24 animate-pulse rounded-sm bg-bg-subtle" /></Card> : null}
      {scenario === "empty" ? <ExceptionState variant="404" title="空数据" description="当前没有复核发运任务。" /> : null}
      {scenario === "no-result" ? <ExceptionState variant="404" title="查询无结果" description="没有符合条件的复核发运任务。" primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>} /> : null}

      {scenario === "normal" && filteredTasks.length ? (
        <ListPageMainCard>
          <div className="px-4 pt-3">
            <Tabs items={[...statusTabs]} value={activeStatusTab} onChange={(value) => { setActiveStatusTab(value); setPage(1); }} />
          </div>
          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 150, minWidth: 150 }}>复核单号</th>
                  <th style={{ width: 150, minWidth: 150 }}>出库通知单</th>
                  <th style={{ width: 150, minWidth: 150 }}>客户</th>
                  <th style={{ width: 120, minWidth: 120 }}>仓库</th>
                  <th style={{ width: 90, minWidth: 90 }}>状态</th>
                  <th style={{ width: 80, minWidth: 80 }}>优先级</th>
                  <th style={{ width: 100, minWidth: 100 }}>包裹数</th>
                  <th style={{ width: 100, minWidth: 100 }}>已复核</th>
                  <th style={{ width: 120, minWidth: 120 }}>承运商</th>
                  <th style={{ width: 130, minWidth: 130 }}>发运月台</th>
                  <th style={{ width: 200, minWidth: 200 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="tabular-nums text-link">{row.id}</td>
                    <td className="tabular-nums">{row.outboundOrderId}</td>
                    <td>{row.customer}</td>
                    <td>{row.warehouse}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td>{priorityBadge(row.priority)}</td>
                    <td className="tabular-nums">{row.packageCount}</td>
                    <td className="tabular-nums">{row.checkedQty}/{row.totalQty}</td>
                    <td>{row.carrier}</td>
                    <td>{row.dock}</td>
                    <td>
                      <div className="flex items-center gap-actions">
                        {row.status === "待复核" || row.status === "复核中" ? (
                          <Button size="sm" variant="primary" onClick={() => openReview(row)}>
                            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            复核
                          </Button>
                        ) : null}
                        {row.status === "待交接" ? (
                          <Button size="sm" variant="primary" onClick={() => onShip(row.id)}>
                            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                            发运
                          </Button>
                        ) : null}
                        {row.status === "异常" ? <Button size="sm" variant="secondary" onClick={() => openReview(row)}>处理</Button> : null}
                        {row.status === "已发运" ? <Button size="sm" disabled>已发运</Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>
          <Pagination currentPage={page} totalPages={totalPages} totalCount={filteredTasks.length} pageSize={pageSize} pageSizeOptions={[10, 20, 50]} showTopBorder onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
        </ListPageMainCard>
      ) : null}

      <Modal open={modalOpen} title={activeTask ? `复核确认 - ${activeTask.id}` : "复核确认"} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-sm border border-border p-3 text-small text-text-secondary">
            <span>复核商品与包裹号，确认无误后流转为待交接。</span>
            <Button size="sm" variant="secondary" onClick={fillRemaining}>填充待复核量</Button>
          </div>
          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th>商品编码</th>
                  <th>商品名称</th>
                  <th>条码</th>
                  <th>包裹号</th>
                  <th>已拣</th>
                  <th>已复核</th>
                  <th>本次复核</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.sku}>
                    <td className="tabular-nums">{item.sku}</td>
                    <td>{item.name}</td>
                    <td className="tabular-nums">{item.barcode}</td>
                    <td>{item.packageNo}</td>
                    <td className="tabular-nums">{item.pickedQty}</td>
                    <td className="tabular-nums">{item.checkedQty}</td>
                    <td>
                      <Input className="w-20" type="number" min={0} value={item.currentCheckQty || ""} onChange={(event) => updateQty(item.sku, event.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={confirmReview}>确认复核</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
