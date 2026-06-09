import { useMemo, useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { DemoToolbar } from "../components/ui/demo-toolbar";
import { ExceptionState } from "../components/ui/exception-state";
import { HorizontalScrollArea } from "../components/ui/horizontal-scroll-area";
import { Input } from "../components/ui/input";
import { ListPageMainCard } from "../components/ui/list-page-layout";
import { Pagination } from "../components/ui/pagination";
import { PageHeader } from "../components/ui/page-header";
import { getVisibleQuerySectionItems, hasCollapsedQuerySectionItems } from "../components/ui/query-section";
import { Select } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";
import type { OutboundNotificationRow, OutboundNoticeStatus } from "../data/outbound-notification";

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
};

const defaultFilters: OutboundFilters = {
  id: "",
  customer: "",
  warehouse: "全部",
};

export function OutboundNotificationListPage({
  records,
  scenario,
  onScenarioChange,
  onDispatchPicking,
  onOpenPicking,
}: {
  records: OutboundNotificationRow[];
  scenario: OutboundListScenario;
  onScenarioChange: (value: OutboundListScenario) => void;
  onDispatchPicking: (id: string) => void;
  onOpenPicking: (outboundOrderId?: string) => void;
}) {
  const [draftFilters, setDraftFilters] = useState<OutboundFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<OutboundFilters>(defaultFilters);
  const [activeStatusTab, setActiveStatusTab] = useState("全部");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const queryFieldDefinitions = [
    { key: "id", label: "出库通知单号" },
    { key: "customer", label: "客户" },
    { key: "warehouse", label: "仓库" },
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
        description="承接销售/调拨出库需求，完成库存分配后下发生成拣货执行任务。"
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
          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 150, minWidth: 150 }}>出库通知单号</th>
                  <th style={{ width: 150, minWidth: 150 }}>客户</th>
                  <th style={{ width: 130, minWidth: 130 }}>仓库</th>
                  <th style={{ width: 90, minWidth: 90 }}>单据状态</th>
                  <th style={{ width: 100, minWidth: 100 }}>拣货状态</th>
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
                    <td className="tabular-nums text-link">{row.id}</td>
                    <td>{row.customer}</td>
                    <td>{row.warehouse}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td>{pickingBadge(row.pickingStatus)}</td>
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
    </div>
  );
}
