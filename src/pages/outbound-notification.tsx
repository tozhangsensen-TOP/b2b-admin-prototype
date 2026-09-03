import { useMemo, useState } from "react";
import { ChevronDown, Merge, Send } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
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
import { groupByTemperatureZone, outboundLineItemsMap } from "../data/outbound-notification";
import type { OutboundNotificationRow, OutboundNoticeStatus, OutboundOrderSplitState, TemperatureZone } from "../data/outbound-notification";

export type OutboundListScenario = "normal" | "loading" | "empty" | "no-result" | "no-auth";

const listTabs = [
  { label: "正常", value: "normal" },
  { label: "加载中", value: "loading" },
  { label: "空数据", value: "empty" },
  { label: "查询无结果", value: "no-result" },
  { label: "无权限", value: "no-auth" },
] as const;

const statusTabs = [
  { label: "全部", value: "全部" },
  { label: "待下发", value: "待下发" },
  { label: "已下发", value: "已下发" },
  { label: "部分出库", value: "部分出库" },
  { label: "已出库", value: "已出库" },
] as const;

const warehouseOptions = [
  { label: "全部", value: "全部" },
  { label: "上海生鲜仓", value: "上海生鲜仓" },
  { label: "北京中转仓", value: "北京中转仓" },
  { label: "广州常温仓", value: "广州常温仓" },
  { label: "武汉常温仓", value: "武汉常温仓" },
  { label: "杭州冷链仓", value: "杭州冷链仓" },
];

const orderTypeOptions = [
  { label: "全部", value: "全部" },
  { label: "销售出库", value: "销售出库" },
  { label: "调拨出库", value: "调拨出库" },
];

function orderTypeBadge(orderType: OutboundNotificationRow["orderType"]) {
  if (orderType === "调拨出库") return <Badge tone="processing">{orderType}</Badge>;
  return <Badge tone="draft">{orderType}</Badge>;
}

function zoneBadgeTone(zone: TemperatureZone) {
  if (zone === "冷藏") return "processing" as const;
  if (zone === "冷冻") return "pending" as const;
  return "draft" as const;
}

function statusBadge(status: OutboundNoticeStatus) {
  if (status === "已出库") return <Badge tone="success">{status}</Badge>;
  if (status === "部分出库") return <Badge tone="processing">{status}</Badge>;
  if (status === "已下发") return <Badge tone="pending">{status}</Badge>;
  if (status === "待下发") return <Badge tone="draft">{status}</Badge>;
  return <Badge tone="closed">{status}</Badge>;
}

function pickingBadge(status: OutboundNotificationRow["pickingStatus"]) {
  if (status === "已完成") return <Badge tone="success">{status}</Badge>;
  if (status === "拣货中") return <Badge tone="processing">{status}</Badge>;
  if (status === "已生成") return <Badge tone="pending">{status}</Badge>;
  return <Badge tone="draft">{status}</Badge>;
}

function priorityBadge(priority: "高" | "中" | "低") {
  if (priority === "高") return <Badge tone="error">{priority}</Badge>;
  if (priority === "中") return <Badge tone="pending">{priority}</Badge>;
  return <Badge tone="draft">{priority}</Badge>;
}

type OutboundFilters = {
  id: string;
  customer: string;
  warehouse: string;
  orderType: string;
};

const defaultFilters: OutboundFilters = {
  id: "",
  customer: "",
  warehouse: "全部",
  orderType: "全部",
};

export function OutboundNotificationListPage({
  records,
  scenario,
  onScenarioChange,
  splitOrders,
  onDispatchPicking,
  onMergeUnifiedPicking,
  onOpenPicking,
  onOpenTransferPicking,
}: {
  records: OutboundNotificationRow[];
  scenario: OutboundListScenario;
  onScenarioChange: (value: OutboundListScenario) => void;
  splitOrders: Record<string, OutboundOrderSplitState>;
  onDispatchPicking: (id: string) => void;
  onMergeUnifiedPicking: (ids: string[]) => void;
  onOpenPicking: (outboundOrderId?: string) => void;
  onOpenTransferPicking: () => void;
}) {
  const [draftFilters, setDraftFilters] = useState<OutboundFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<OutboundFilters>(defaultFilters);
  const [activeStatusTab, setActiveStatusTab] = useState("全部");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  /* 可勾选合并统单的范围：调拨类型 + 未合并（待下发可直接合并，无需先下发） */
  const isMergeable = (row: OutboundNotificationRow) =>
    row.orderType === "调拨出库"
    && (row.status === "待下发" || row.status === "已下发" || row.status === "部分出库")
    && !splitOrders[row.id]?.merged;

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => (checked ? [...new Set([...current, id])] : current.filter((item) => item !== id)));
  }

  /* 分拣区需求预估：按每托 60 件、单托占地 1.2㎡、另加 40% 通道/操作系数估算 */
  const mergePreview = useMemo(() => {
    const lines = selectedIds.flatMap((id) => outboundLineItemsMap[id] ?? []);
    const zoneRows = groupByTemperatureZone(lines).map((group) => {
      const qty = group.lines.reduce((sum, line) => sum + line.orderQty, 0);
      const pallets = Math.ceil(qty / 60);
      return { zone: group.zone, orderCount: group.lines.length, qty, pallets };
    });
    const totalQty = zoneRows.reduce((sum, row) => sum + row.qty, 0);
    const totalPallets = zoneRows.reduce((sum, row) => sum + row.pallets, 0);
    const totalArea = Math.ceil(totalPallets * 1.2 * 1.4 * 10) / 10;
    return { zoneRows, totalQty, totalPallets, totalArea };
  }, [selectedIds]);

  const queryFieldDefinitions = [
    { key: "id", label: "出库通知单号" },
    { key: "customer", label: "客户" },
    { key: "warehouse", label: "仓库" },
    { key: "orderType", label: "单据类型" },
  ];
  const visibleQueryFields = getVisibleQuerySectionItems(queryFieldDefinitions, showMoreFilters);
  const visibleQueryFieldKeys = new Set(visibleQueryFields.map((f) => f.key));
  const hasCollapsedQueryFields = hasCollapsedQuerySectionItems(queryFieldDefinitions);

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const matchesStatus = activeStatusTab === "全部" || row.status === activeStatusTab;
      if (!matchesStatus) return false;
      if (activeFilters.id && !row.id.toLowerCase().includes(activeFilters.id.toLowerCase())) return false;
      if (activeFilters.customer && !row.customer.toLowerCase().includes(activeFilters.customer.toLowerCase())) return false;
      if (activeFilters.warehouse !== "全部" && row.warehouse !== activeFilters.warehouse) return false;
      if (activeFilters.orderType !== "全部" && row.orderType !== activeFilters.orderType) return false;
      return true;
    });
  }, [records, activeFilters, activeStatusTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRows = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const summary = useMemo(() => {
    const waitDispatch = records.filter((item) => item.status === "待下发").length;
    const picking = records.filter((item) => item.pickingStatus === "已生成" || item.pickingStatus === "拣货中").length;
    const shipped = records.filter((item) => item.status === "已出库").length;
    return { waitDispatch, picking, shipped };
  }, [records]);

  function handleQuery() {
    setActiveFilters(draftFilters);
    setPage(1);
    const nextRows = records.filter((row) => {
      const matchesStatus = activeStatusTab === "全部" || row.status === activeStatusTab;
      if (!matchesStatus) return false;
      if (draftFilters.id && !row.id.toLowerCase().includes(draftFilters.id.toLowerCase())) return false;
      if (draftFilters.customer && !row.customer.toLowerCase().includes(draftFilters.customer.toLowerCase())) return false;
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
    onScenarioChange(records.length ? "normal" : "empty");
  }

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="列表页" items={listTabs} value={scenario} onChange={onScenarioChange} />
      <PageHeader
        title="出库通知单"
        description="承接销售/调拨出库需求，按商品温层拆分出库订单后生成拣货执行任务，调拨类型可合并统单拣货。"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">待下发</div>
          <div className="mt-1 text-section-title font-section-title text-warning">{summary.waitDispatch}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">拣货执行中</div>
          <div className="mt-1 text-section-title font-section-title text-link">{summary.picking}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">已出库</div>
          <div className="mt-1 text-section-title font-section-title text-success">{summary.shipped}</div>
        </div>
      </div>

      <Card>
        <div className="query-section-grid">
          {visibleQueryFieldKeys.has("id") ? (
            <div>
              <div className="field-label">出库通知单号</div>
              <Input value={draftFilters.id} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, id: e.target.value }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("customer") ? (
            <div>
              <div className="field-label">客户</div>
              <Input value={draftFilters.customer} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, customer: e.target.value }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("warehouse") ? (
            <div>
              <div className="field-label">仓库</div>
              <Select value={draftFilters.warehouse} options={warehouseOptions} onValueChange={(v) => setDraftFilters((f) => ({ ...f, warehouse: v }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("orderType") ? (
            <div>
              <div className="field-label">单据类型</div>
              <Select value={draftFilters.orderType} options={orderTypeOptions} onValueChange={(v) => setDraftFilters((f) => ({ ...f, orderType: v }))} />
            </div>
          ) : null}
        </div>
        <div className="query-section-actions">
          {hasCollapsedQueryFields ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-small text-link transition hover:text-link-hover"
              onClick={() => setShowMoreFilters((value) => !value)}
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
        <ExceptionState variant="403" description="当前用户没有出库通知单权限，需开通出库管理菜单和仓库数据范围。" primaryAction={<Button variant="primary">联系管理员</Button>} />
      ) : null}
      {scenario === "loading" ? (
        <Card title="加载中">
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-sm bg-bg-subtle" />)}
          </div>
        </Card>
      ) : null}
      {scenario === "empty" ? <ExceptionState variant="404" title="空数据" description="当前没有出库通知单。" /> : null}
      {scenario === "no-result" ? (
        <ExceptionState variant="404" title="查询无结果" description="没有符合当前筛选条件的出库通知单。" primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>} />
      ) : null}

      {scenario === "normal" && filteredRecords.length > 0 ? (
        <ListPageMainCard>
          <div className="px-4 pt-3">
            <Tabs items={[...statusTabs]} value={activeStatusTab} onChange={(value) => { setActiveStatusTab(value); setPage(1); }} />
          </div>
          {selectedIds.length > 0 ? (
            <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-sm border border-primary bg-primary-subtle px-3 py-2">
              <span className="text-small text-text-primary">
                已勾选 <span className="font-body-strong">{selectedIds.length}</span> 张调拨通知单，可合并为统单拣货任务
              </span>
              <div className="flex items-center gap-actions">
                <Button size="sm" variant="secondary" onClick={() => setSelectedIds([])}>取消勾选</Button>
                <Button size="sm" variant="primary" onClick={() => setMergeDialogOpen(true)}>
                  <Merge className="h-3.5 w-3.5" aria-hidden="true" />
                  合并统单拣货
                </Button>
              </div>
            </div>
          ) : null}
          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44, minWidth: 44 }}>
                    {(() => {
                      const pageMergeableIds = pageRows.filter(isMergeable).map((row) => row.id);
                      const allChecked = pageMergeableIds.length > 0 && pageMergeableIds.every((id) => selectedIds.includes(id));
                      return (
                        <Checkbox
                          aria-label="全选本页可合并调拨单"
                          checked={allChecked}
                          disabled={pageMergeableIds.length === 0}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSelectedIds((current) => {
                              const others = current.filter((id) => !pageMergeableIds.includes(id));
                              return checked ? [...new Set([...others, ...pageMergeableIds])] : others;
                            });
                          }}
                        />
                      );
                    })()}
                  </th>
                  <th style={{ width: 150, minWidth: 150 }}>出库通知单号</th>
                  <th style={{ width: 96, minWidth: 96 }}>单据类型</th>
                  <th style={{ width: 150, minWidth: 150 }}>客户</th>
                  <th style={{ width: 130, minWidth: 130 }}>仓库</th>
                  <th style={{ width: 90, minWidth: 90 }}>单据状态</th>
                  <th style={{ width: 100, minWidth: 100 }}>拣货状态</th>
                  <th style={{ width: 170, minWidth: 170 }}>出库订单</th>
                  <th style={{ width: 80, minWidth: 80 }}>优先级</th>
                  <th style={{ width: 100, minWidth: 100 }}>通知数量</th>
                  <th style={{ width: 100, minWidth: 100 }}>已拣数量</th>
                  <th style={{ width: 110, minWidth: 110 }}>计划发货</th>
                  <th style={{ width: 110, minWidth: 110 }}>承运商</th>
                  <th style={{ width: 180, minWidth: 180 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Checkbox
                        aria-label={`选择 ${row.id}`}
                        checked={selectedIds.includes(row.id)}
                        disabled={!isMergeable(row)}
                        onChange={(event) => toggleSelected(row.id, event.target.checked)}
                      />
                    </td>
                    <td className="tabular-nums text-link">{row.id}</td>
                    <td>{orderTypeBadge(row.orderType)}</td>
                    <td>{row.customer}</td>
                    <td>{row.warehouse}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td>{pickingBadge(row.pickingStatus)}</td>
                    <td>
                      {(() => {
                        const split = splitOrders[row.id];
                        if (split?.merged) {
                          return <Badge tone="processing">统单拣货</Badge>;
                        }
                        if (split && split.orders.length > 0) {
                          return (
                            <span className="flex flex-wrap items-center gap-1">
                              {split.orders.map((order) => (
                                <Badge key={order.orderId} tone={zoneBadgeTone(order.zone)}>{order.zone}</Badge>
                              ))}
                            </span>
                          );
                        }
                        return <span className="text-small text-text-muted">{row.status === "待下发" ? "—" : "整单 1 张"}</span>;
                      })()}
                    </td>
                    <td>{priorityBadge(row.priority)}</td>
                    <td className="tabular-nums">{row.totalQty.toLocaleString()}</td>
                    <td className="tabular-nums">{row.pickedQty.toLocaleString()}</td>
                    <td>{row.shipDate}</td>
                    <td>{row.carrier}</td>
                    <td>
                      <div className="flex items-center gap-actions">
                        {row.status === "待下发" ? (
                          <Button size="sm" variant="primary" onClick={() => onDispatchPicking(row.id)}>
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                            下发拣货
                          </Button>
                        ) : splitOrders[row.id]?.merged ? (
                          <Button size="sm" variant="secondary" onClick={onOpenTransferPicking}>查看调拨拣货</Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => onOpenPicking(row.id)}>查看拣货</Button>
                        )}
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
            totalCount={filteredRecords.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            showTopBorder
            onPageChange={setPage}
            onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
          />
        </ListPageMainCard>
      ) : null}

      <Modal
        open={mergeDialogOpen && selectedIds.length > 0}
        title="合并统单拣货确认"
        onClose={() => setMergeDialogOpen(false)}
      >
        <div className="flex flex-col gap-section">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body text-text-secondary">已选调拨通知单：</span>
            {selectedIds.map((id) => (
              <Badge key={id} tone="processing">{id}</Badge>
            ))}
          </div>

          <div className="rounded-sm border border-primary bg-primary-subtle px-3 py-3">
            <div className="text-body text-text-primary">
              合并后预计需要分拣区预留
              <span className="mx-1 text-body-strong text-primary">{mergePreview.totalPallets} 托</span>
              /
              <span className="mx-1 text-body-strong text-primary">{mergePreview.totalQty.toLocaleString()} 件</span>
              的作业面积，建议预留
              <span className="mx-1 text-body-strong text-primary">{mergePreview.totalArea} ㎡</span>
              。
            </div>
          </div>

          <div className="overflow-hidden rounded-sm border border-border">
            <table className="w-full text-body">
              <thead>
                <tr className="bg-bg-hover text-left text-text-secondary">
                  <th className="px-3 py-2 font-normal">温层</th>
                  <th className="px-3 py-2 font-normal">出库订单</th>
                  <th className="px-3 py-2 font-normal">件数</th>
                  <th className="px-3 py-2 font-normal">预计托数</th>
                </tr>
              </thead>
              <tbody>
                {mergePreview.zoneRows.map((row) => (
                  <tr key={row.zone} className="border-t border-border">
                    <td className="px-3 py-2"><Badge tone={zoneBadgeTone(row.zone)}>{row.zone}</Badge></td>
                    <td className="px-3 py-2 tabular-nums">{row.orderCount} 张</td>
                    <td className="px-3 py-2 tabular-nums">{row.qty.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{row.pallets} 托</td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-bg-hover font-body-strong">
                  <td className="px-3 py-2">合计</td>
                  <td className="px-3 py-2 tabular-nums">{mergePreview.zoneRows.reduce((sum, row) => sum + row.orderCount, 0)} 张</td>
                  <td className="px-3 py-2 tabular-nums">{mergePreview.totalQty.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{mergePreview.totalPallets} 托</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-small text-text-muted">
            计算规则：按每托 60 件估算托数；单托占地 1.2㎡（1.0m×1.2m），另加 40% 通道及操作系数得出建议预留面积。未下发状态的调拨单将直接并入统单任务，无需先下发拣货；合并后统单任务在调拨拣货PDA执行。
          </p>

          <div className="flex items-center justify-end gap-actions border-t border-border pt-section-tight">
            <Button variant="secondary" onClick={() => setMergeDialogOpen(false)}>取消</Button>
            <Button
              variant="primary"
              onClick={() => {
                setMergeDialogOpen(false);
                onMergeUnifiedPicking(selectedIds);
                setSelectedIds([]);
              }}
            >
              <Merge className="h-3.5 w-3.5" aria-hidden="true" />
              确认合并
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
