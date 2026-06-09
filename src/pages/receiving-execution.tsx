import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  receivingTasks,
  receivingLineItemsMap,
  type ReceivingTaskRow,
  type ReceivingStatus,
  type ReceivingLineItem,
} from "../data/receiving-execution";

export type ReceivingScenario = "normal" | "loading" | "empty" | "no-result" | "no-auth";

const receivingListTabs = [
  { label: "正常", value: "normal" },
  { label: "加载中", value: "loading" },
  { label: "空数据", value: "empty" },
  { label: "查询无结果", value: "no-result" },
  { label: "无权限", value: "no-auth" },
] as const;

const statusTabs = [
  { label: "全部", value: "全部" },
  { label: "待收货", value: "待收货" },
  { label: "收货中", value: "收货中" },
  { label: "部分收货", value: "部分收货" },
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

function statusBadge(status: ReceivingStatus) {
  if (status === "已完成") return <Badge tone="success">{status}</Badge>;
  if (status === "部分收货") return <Badge tone="processing">{status}</Badge>;
  if (status === "收货中") return <Badge tone="pending">{status}</Badge>;
  if (status === "待收货") return <Badge tone="draft">{status}</Badge>;
  return <Badge tone="closed">{status}</Badge>;
}

type ReceivingFilters = {
  id: string;
  inboundNoticeId: string;
  supplier: string;
  warehouse: string;
};

const defaultFilters: ReceivingFilters = {
  id: "",
  inboundNoticeId: "",
  supplier: "",
  warehouse: "全部",
};

export function ReceivingExecutionPage({
  tasks,
  scenario,
  onScenarioChange,
  onStartReceive,
  onConfirmReceive,
}: {
  tasks: ReceivingTaskRow[];
  scenario: ReceivingScenario;
  onScenarioChange: (value: ReceivingScenario) => void;
  onStartReceive: (id: string) => void;
  onConfirmReceive: (id: string, items: ReceivingLineItem[]) => void;
}) {
  const [draftFilters, setDraftFilters] = useState<ReceivingFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<ReceivingFilters>(defaultFilters);
  const [activeStatusTab, setActiveStatusTab] = useState<string>("全部");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [activeReceiveTask, setActiveReceiveTask] = useState<ReceivingTaskRow | null>(null);
  const [receiveItems, setReceiveItems] = useState<ReceivingLineItem[]>([]);
  const [receiveNote, setReceiveNote] = useState("");

  const queryFieldDefinitions = [
    { key: "id", label: "收货单号" },
    { key: "inboundNoticeId", label: "入库通知单号" },
    { key: "supplier", label: "供应商" },
    { key: "warehouse", label: "仓库" },
  ];
  const visibleQueryFields = getVisibleQuerySectionItems(queryFieldDefinitions, showMoreFilters);
  const visibleQueryFieldKeys = new Set(visibleQueryFields.map((f) => f.key));
  const hasCollapsedQueryFields = hasCollapsedQuerySectionItems(queryFieldDefinitions);

  const filteredTasks = useMemo(() => {
    return tasks.filter((row) => {
      const matchesStatusTab = activeStatusTab === "全部" || row.status === activeStatusTab;
      if (!matchesStatusTab) return false;
      if (activeFilters.id && !row.id.toLowerCase().includes(activeFilters.id.toLowerCase())) return false;
      if (activeFilters.inboundNoticeId && !row.inboundNoticeId.toLowerCase().includes(activeFilters.inboundNoticeId.toLowerCase())) return false;
      if (activeFilters.supplier && !row.supplier.toLowerCase().includes(activeFilters.supplier.toLowerCase())) return false;
      if (activeFilters.warehouse !== "全部" && row.warehouse !== activeFilters.warehouse) return false;
      return true;
    });
  }, [tasks, activeStatusTab, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const pageRows = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  function handleQuery() {
    setActiveFilters(draftFilters);
    setPage(1);
    const nextRows = tasks.filter((row) => {
      const matchesStatusTab = activeStatusTab === "全部" || row.status === activeStatusTab;
      if (!matchesStatusTab) return false;
      if (draftFilters.id && !row.id.toLowerCase().includes(draftFilters.id.toLowerCase())) return false;
      if (draftFilters.inboundNoticeId && !row.inboundNoticeId.toLowerCase().includes(draftFilters.inboundNoticeId.toLowerCase())) return false;
      if (draftFilters.supplier && !row.supplier.toLowerCase().includes(draftFilters.supplier.toLowerCase())) return false;
      if (draftFilters.warehouse !== "全部" && row.warehouse !== draftFilters.warehouse) return false;
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

  function openReceive(task: ReceivingTaskRow) {
    const lineItems = receivingLineItemsMap[task.id] ?? [];
    setActiveReceiveTask(task);
    setReceiveItems(lineItems.map((item) => ({ ...item })));
    setReceiveNote("");
    setReceiveModalOpen(true);
  }

  function updateReceiveItemQty(sku: string, value: string) {
    const qty = Math.max(0, Number(value) || 0);
    setReceiveItems((current) =>
      current.map((item) => (item.sku === sku ? { ...item, currentReceiveQty: qty } : item)),
    );
  }

  function startReceive(task: ReceivingTaskRow) {
    onStartReceive(task.id);
  }

  function confirmReceive() {
    if (!activeReceiveTask) return;
    const itemsToReceive = receiveItems.filter((item) => item.currentReceiveQty > 0);
    onConfirmReceive(activeReceiveTask.id, itemsToReceive);
    setReceiveModalOpen(false);
    setActiveReceiveTask(null);
  }

  const showTable = scenario === "normal";
  const summaryCards = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "待收货").length;
    const inProgress = tasks.filter((t) => t.status === "收货中" || t.status === "部分收货").length;
    const done = tasks.filter((t) => t.status === "已完成").length;
    return { pending, inProgress, done };
  }, [tasks]);

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="列表页" items={receivingListTabs} value={scenario} onChange={onScenarioChange} />

      <PageHeader
        title="收货执行"
        description="对采购入库通知执行扫码收货、数量核对和确认入库操作。"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">待收货</div>
          <div className="mt-1 text-section-title font-section-title text-warning">{summaryCards.pending}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">执行中</div>
          <div className="mt-1 text-section-title font-section-title text-link">{summaryCards.inProgress}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">已完成</div>
          <div className="mt-1 text-section-title font-section-title text-success">{summaryCards.done}</div>
        </div>
      </div>

      <Card>
        <div className="query-section-grid">
          {visibleQueryFieldKeys.has("id") ? (
            <div>
              <div className="field-label">收货单号</div>
              <Input value={draftFilters.id} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, id: e.target.value }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("inboundNoticeId") ? (
            <div>
              <div className="field-label">入库通知单号</div>
              <Input value={draftFilters.inboundNoticeId} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, inboundNoticeId: e.target.value }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("supplier") ? (
            <div>
              <div className="field-label">供应商</div>
              <Input value={draftFilters.supplier} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, supplier: e.target.value }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("warehouse") ? (
            <div>
              <div className="field-label">仓库</div>
              <Select value={draftFilters.warehouse} options={warehouseOptions} placeholder="请选择" onValueChange={(v) => setDraftFilters((f) => ({ ...f, warehouse: v }))} />
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

      {scenario === "no-auth" ? (
        <ExceptionState variant="403" description="当前用户没有收货执行权限，需开通仓内执行菜单及仓库数据范围权限。" primaryAction={<Button variant="primary">联系管理员</Button>} secondaryAction={<Button>返回首页</Button>} />
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
        <ExceptionState variant="404" title="空数据" description="当前没有收货执行任务，请先生成入库通知单后下推收货。" />
      ) : null}

      {scenario === "no-result" ? (
        <ExceptionState variant="404" title="查询无结果" description="没有符合当前筛选条件的收货任务，请调整条件后重试。" primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>} secondaryAction={<Button onClick={handleQuery}>重新查询</Button>} />
      ) : null}

      {showTable && filteredTasks.length > 0 ? (
        <ListPageMainCard>
          <div className="px-4 pt-3">
            <Tabs items={statusTabs} value={activeStatusTab} onChange={(v) => { setActiveStatusTab(v); setPage(1); }} />
          </div>
          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 150, minWidth: 150 }}>收货单号</th>
                  <th style={{ width: 150, minWidth: 150 }}>入库通知单号</th>
                  <th style={{ width: 200, minWidth: 200 }}>供应商</th>
                  <th style={{ width: 130, minWidth: 130 }}>仓库</th>
                  <th style={{ width: 100, minWidth: 100 }}>状态</th>
                  <th style={{ width: 110, minWidth: 110 }}>通知数量</th>
                  <th style={{ width: 110, minWidth: 110 }}>已收数量</th>
                  <th style={{ width: 120, minWidth: 120 }}>承运商</th>
                  <th style={{ width: 130, minWidth: 130 }}>月台</th>
                  <th style={{ width: 180, minWidth: 180 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="tabular-nums text-link">{row.id}</td>
                    <td className="tabular-nums">{row.inboundNoticeId}</td>
                    <td><div className="max-w-[200px] truncate" title={row.supplier}>{row.supplier}</div></td>
                    <td>{row.warehouse}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td className="tabular-nums">{row.totalQty.toLocaleString()}</td>
                    <td className="tabular-nums">{row.receivedQty.toLocaleString()}</td>
                    <td>{row.carrier}</td>
                    <td>{row.dock}</td>
                    <td>
                      <div className="flex items-center gap-actions">
                        {row.status === "待收货" ? (
                          <Button size="sm" variant="primary" onClick={() => startReceive(row)}>开始收货</Button>
                        ) : row.status === "收货中" || row.status === "部分收货" ? (
                          <Button size="sm" variant="primary" onClick={() => openReceive(row)}>确认收货</Button>
                        ) : (
                          <Button size="sm" disabled>已完成</Button>
                        )}
                        {row.status !== "已完成" && row.status !== "待收货" ? (
                          <Button size="sm" variant="secondary" onClick={() => openReceive(row)}>查看</Button>
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

      <Modal open={receiveModalOpen} title={activeReceiveTask ? `确认收货 - ${activeReceiveTask.id}` : "确认收货"} onClose={() => setReceiveModalOpen(false)}>
        <div className="space-y-4">
          {activeReceiveTask ? (
            <div className="rounded-sm border border-border bg-bg-subtle p-3 text-small text-text-secondary">
              <div className="flex items-center justify-between">
                <span>供应商：{activeReceiveTask.supplier}</span>
                <span>仓库：{activeReceiveTask.warehouse}</span>
                <span>月台：{activeReceiveTask.dock}</span>
              </div>
            </div>
          ) : null}

          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th>商品编码</th>
                  <th>商品名称</th>
                  <th>规格</th>
                  <th>单位</th>
                  <th>通知数量</th>
                  <th>已收数量</th>
                  <th>本次收货</th>
                </tr>
              </thead>
              <tbody>
                {receiveItems.map((item) => (
                  <tr key={item.sku}>
                    <td className="tabular-nums">{item.sku}</td>
                    <td>{item.name}</td>
                    <td>{item.spec}</td>
                    <td>{item.unit}</td>
                    <td className="tabular-nums">{item.notifyQty.toLocaleString()}</td>
                    <td className="tabular-nums">{item.receivedQty.toLocaleString()}</td>
                    <td>
                      <Input
                        type="number"
                        min={0}
                        max={item.notifyQty - item.receivedQty}
                        value={item.currentReceiveQty || ""}
                        placeholder="请输入"
                        className="w-24"
                        onChange={(e) => updateReceiveItemQty(item.sku, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>

          <div>
            <div className="field-label">收货备注</div>
            <textarea
              className="field-control min-h-[64px] py-2"
              value={receiveNote}
              placeholder="可选，记录验收异常或备注说明"
              onChange={(e) => setReceiveNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={() => setReceiveModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={confirmReceive}>确认收货</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
