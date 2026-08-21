import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Clock, PlayCircle, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  type ColumnSettingsField,
  ColumnSettingsModal,
  getDensityClassName,
  usePersistedColumnSettings,
} from "../components/ui/column-settings";
import { ExceptionState } from "../components/ui/exception-state";
import { FloatingAlert, type FloatingAlertInput } from "../components/ui/floating-alert";
import { HorizontalScrollArea } from "../components/ui/horizontal-scroll-area";
import { IconActionButton } from "../components/ui/icon-action-button";
import { Input } from "../components/ui/input";
import { ListPageMainCard, ListPageToolbar } from "../components/ui/list-page-layout";
import { Modal } from "../components/ui/modal";
import { Pagination } from "../components/ui/pagination";
import { PageHeader } from "../components/ui/page-header";
import { getVisibleQuerySectionItems, hasCollapsedQuerySectionItems } from "../components/ui/query-section";
import { Select } from "../components/ui/select";
import {
  getNextTableSortState,
  sortTableRows,
  TableHeaderCell,
  type TableSortConfig,
  type TableSortState,
  type TableSortType,
  useTableColumnResize,
} from "../components/ui/table-interactions";
import { 
  transferSuggestionRecords, 
  type TransferSuggestion, 
  type TransferSuggestionStatus,
  mockSkuList
} from "../data/outsourced-transfer-suggestions";

type TransferSuggestionFilters = {
  status: string;
  dateStart: string;
  dateEnd: string;
  suggestionNo: string;
};

type TransferSuggestionColumnId =
  | "suggestionNo"
  | "createTime"
  | "status"
  | "itemCount"
  | "totalQty"
  | "createType"
  | "actions";

type TransferSuggestionScenario = "normal" | "loading" | "no-result";

type TransferSuggestionFilterKey =
  | "status"
  | "dateStart"
  | "dateEnd"
  | "suggestionNo";

const defaultFilters: TransferSuggestionFilters = {
  status: "全部",
  dateStart: "",
  dateEnd: "",
  suggestionNo: "",
};

const pageSizeOptions = [20, 50, 100];

const suggestionTabs = [
  { label: "待确认", value: "待确认" },
  { label: "已确认", value: "已确认" },
  { label: "全部", value: "全部" },
] as const;

function buildOptions(values: string[]) {
  return [{ label: "全部", value: "全部" }, ...values.map((value) => ({ label: value, value }))];
}

function numberText(value: number) {
  return value.toLocaleString("zh-CN");
}

function statusToneClass(status: TransferSuggestionStatus) {
  if (status === "已确认") {
    return "success";
  }
  if (status === "待确认") {
    return "warning";
  }
  if (status === "已取消") {
    return "closed";
  }
  return "draft";
}

function createTypeLabel(createType: string) {
  return createType === "auto" ? "自动生成" : "手动创建";
}

export function OutsourcedTransferSuggestionsPage({
  onViewDetail,
  onShowAlert,
  onOpenConfig,
}: {
  onViewDetail?: (suggestion: TransferSuggestion) => void;
  onShowAlert?: (input: FloatingAlertInput) => void;
  onOpenConfig?: () => void;
}) {
  const [draftFilters, setDraftFilters] = useState<TransferSuggestionFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<TransferSuggestionFilters>(defaultFilters);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [scenario, setScenario] = useState<TransferSuggestionScenario>("normal");
  const [activeTab, setActiveTab] = useState<string>("全部");
  const [sortState, setSortState] = useState<TableSortState<TransferSuggestionColumnId>>({
    columnId: "createTime",
    direction: "desc",
  });

  const suggestionColumns = useMemo(
    () =>
      [
        { id: "suggestionNo", label: "建议单号", group: "基础信息", required: true, defaultFixed: true, width: 180 },
        { id: "createTime", label: "生成时间", group: "基础信息", width: 180, sortType: "datetime" as TableSortType, getSortValue: (row: TransferSuggestion) => row.createTime },
        { id: "status", label: "状态", group: "状态信息", width: 100 },
        { id: "itemCount", label: "商品数", group: "数量信息", width: 100, align: "right" as const, sortType: "number" as TableSortType, getSortValue: (row: TransferSuggestion) => row.itemCount },
        { id: "totalQty", label: "总数量", group: "数量信息", width: 120, align: "right" as const, sortType: "number" as TableSortType, getSortValue: (row: TransferSuggestion) => row.totalQty },
        { id: "createType", label: "生成方式", group: "基础信息", width: 100 },
        { id: "actions", label: "操作", group: "操作", width: 150 },
      ] satisfies Array<ColumnSettingsField & { id: TransferSuggestionColumnId; width: number; align?: "left" | "right"; sortType?: TableSortType; getSortValue?: (row: TransferSuggestion) => unknown }>,
    [],
  );

  const {
    state: suggestionColumnState,
    defaultState: suggestionDefaultColumnState,
    applyState: applySuggestionColumnState,
  } = usePersistedColumnSettings({
    storageKey: "column-settings:demo-user:outsourced-transfer-suggestions",
    fields: suggestionColumns,
    defaultDensity: "medium",
  });
  const { beginResize, widths: columnWidths } = useTableColumnResize({
    state: suggestionColumnState,
    applyState: applySuggestionColumnState,
  });

  const visibleColumns = useMemo(() => {
    return suggestionColumnState.order
      .filter((id) => suggestionColumnState.visible.includes(id))
      .map((id) => suggestionColumns.find((column) => column.id === id))
      .filter((column): column is (typeof suggestionColumns)[number] => Boolean(column));
  }, [suggestionColumnState.order, suggestionColumnState.visible, suggestionColumns]);

  const fixedLeftMap = useMemo(() => {
    const fixedSet = new Set(suggestionColumnState.fixed);
    const leftMap = new Map<string, number>();
    let left = 0;
    visibleColumns.forEach((column) => {
      if (!fixedSet.has(column.id)) return;
      leftMap.set(column.id, left);
      left += columnWidths[column.id] ?? column.width;
    });
    return leftMap;
  }, [columnWidths, suggestionColumnState.fixed, visibleColumns]);

  const statusOptions = buildOptions(["待确认", "已确认", "已取消"]);

  const queryFieldDefinitions: Array<{ key: TransferSuggestionFilterKey; queryColumns?: 1 | 2 }> = [
    { key: "status" },
    { key: "suggestionNo" },
    { key: "dateStart" },
    { key: "dateEnd" },
  ];
  const visibleQueryFieldKeys = getVisibleQuerySectionItems(queryFieldDefinitions, showMoreFilters).map((field) => field.key);
  const visibleQueryFieldKeySet = new Set<TransferSuggestionFilterKey>(visibleQueryFieldKeys);
  const hasCollapsedQueryFields = hasCollapsedQuerySectionItems(queryFieldDefinitions);

  const sortConfigs = useMemo(
    () =>
      suggestionColumns.reduce<Partial<Record<TransferSuggestionColumnId, TableSortConfig<TransferSuggestion>>>>((configs, column) => {
        if (!column.sortType || !column.getSortValue) return configs;
        configs[column.id] = { type: column.sortType, getValue: column.getSortValue };
        return configs;
      }, {}),
    [suggestionColumns],
  );

  const filteredRows = useMemo(() => {
    return transferSuggestionRecords.filter((row) => {
      if (activeTab !== "全部" && row.status !== activeTab) return false;
      if (appliedFilters.status !== "全部" && row.status !== appliedFilters.status) return false;
      return true;
    });
  }, [appliedFilters, activeTab]);

  const sortedRows = useMemo(() => sortTableRows(filteredRows, sortState, sortConfigs), [filteredRows, sortConfigs, sortState]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pagedRows = sortedRows.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.totalQty += row.totalQty;
        acc.itemCount += row.itemCount;
        acc.countByStatus[row.status] = (acc.countByStatus[row.status] || 0) + 1;
        return acc;
      },
      { totalQty: 0, itemCount: 0, countByStatus: {} as Record<string, number> },
    );
  }, [filteredRows]);

  function handleQuery() {
    setAppliedFilters(draftFilters);
    setPage(1);
    const nextRows = transferSuggestionRecords.filter((row) => {
      if (draftFilters.status !== "全部" && row.status !== draftFilters.status) return false;
      return true;
    });
    setScenario(nextRows.length > 0 ? "normal" : "no-result");
  }

  function handleReset() {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setShowMoreFilters(false);
    setPage(1);
    setScenario("normal");
  }

  function updateFilter<K extends keyof TransferSuggestionFilters>(key: K, value: TransferSuggestionFilters[K]) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function handleExecuteNow() {
    onShowAlert?.({
      tone: "success",
      title: "执行成功",
      description: "已触发外租库转拨建议生成任务，稍后请刷新页面查看结果。",
    });
  }

  function handleViewDetail(row: TransferSuggestion) {
    onViewDetail?.(row);
  }

  function renderSuggestionCell(row: TransferSuggestion, columnId: TransferSuggestionColumnId) {
    if (columnId === "suggestionNo") {
      return (
        <button
          type="button"
          className="text-link hover:underline"
          onClick={() => handleViewDetail(row)}
        >
          {row.suggestionNo}
        </button>
      );
    }
    if (columnId === "createTime") {
      return <span className="tabular-nums">{row.createTime}</span>;
    }
    if (columnId === "status") {
      return <span className={`status-badge tone-${statusToneClass(row.status)}`}>{row.status}</span>;
    }
    if (columnId === "itemCount") {
      const abnormalCount = row.items.filter(
        (item) => item.demandType === "销量异常" || item.demandType === "批次效期",
      ).length;
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="tabular-nums">{numberText(row.itemCount)}</span>
          {abnormalCount > 0 ? (
            <span
              className="inline-flex h-4 items-center rounded-sm border px-1 text-mini font-medium"
              style={{ color: "var(--danger)", background: "var(--tag-error-bg)", borderColor: "var(--tag-error-border)" }}
              title={`含销量异常 / 批次效期商品 ${abnormalCount} 项，需在详情页重点确认`}
            >
              {abnormalCount}
            </span>
          ) : null}
        </span>
      );
    }
    if (columnId === "totalQty") {
      return <span className="tabular-nums text-text-primary font-medium">{numberText(row.totalQty)}</span>;
    }
    if (columnId === "createType") {
      return <span className="text-text-secondary">{createTypeLabel(row.createType)}</span>;
    }
    if (columnId === "actions") {
      return (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleViewDetail(row)}>
            {row.status === "待确认" ? "查看/编辑" : "查看"}
          </Button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-page-block">
      <FloatingAlert notice={null} />
      <PageHeader
        title="外租库转拨建议"
        description="系统每日自动生成外租库至本库的转拨建议，优先满足未来发运需求，剩余库存自动补库。支持人工调整数量、新增或删除商品后提交。"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleReset}>
              <RotateCcw aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              重置
            </Button>
            <Button variant="secondary" onClick={onOpenConfig}>
              <Clock aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              定时生成配置
            </Button>
            <Button variant="primary" onClick={handleExecuteNow}>
              <PlayCircle aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              立即执行
            </Button>
          </div>
        }
      />

      <Card className="px-4 py-2">
        <div className="flex items-center gap-4">
          {suggestionTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`px-3 py-2 text-medium font-medium transition-colors ${
                activeTab === tab.value ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-primary"
              }`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="query-section-grid">
          {visibleQueryFieldKeySet.has("status") ? (
            <div>
              <div className="field-label">状态</div>
              <Select value={draftFilters.status} onValueChange={(value) => updateFilter("status", value)} options={statusOptions} />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("suggestionNo") ? (
            <div>
              <div className="field-label">建议单号</div>
              <Input value={draftFilters.suggestionNo} onChange={(event) => updateFilter("suggestionNo", event.target.value)} placeholder="请输入" />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("dateStart") ? (
            <div>
              <div className="field-label">开始日期</div>
              <Input value={draftFilters.dateStart} onChange={(event) => updateFilter("dateStart", event.target.value)} placeholder="YYYY-MM-DD" />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("dateEnd") ? (
            <div>
              <div className="field-label">结束日期</div>
              <Input value={draftFilters.dateEnd} onChange={(event) => updateFilter("dateEnd", event.target.value)} placeholder="YYYY-MM-DD" />
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
              <ChevronDown
                aria-hidden="true"
                strokeWidth={1.8}
                className={`h-4 w-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`}
              />
              {showMoreFilters ? "收起" : "展开"}
            </button>
          ) : null}
          <Button onClick={handleReset}>重置</Button>
          <Button variant="primary" onClick={handleQuery}>
            查询
          </Button>
        </div>
      </Card>

      {scenario === "loading" ? (
        <Card title="加载中">
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-sm bg-bg-subtle" />
            ))}
          </div>
        </Card>
      ) : null}

      {scenario === "no-result" ? (
        <ExceptionState
          variant="404"
          title="查询无结果"
          description="当前筛选条件下没有命中转拨建议记录，请调整状态或日期条件后重试。"
          primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>}
          secondaryAction={<Button onClick={handleQuery}>重新查询</Button>}
        />
      ) : null}

      {scenario === "normal" && filteredRows.length > 0 ? (
        <ListPageMainCard>
          <div className="border-b border-border bg-bg-subtle px-4 py-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">总建议数</div>
                <div className="mt-2 text-section-title font-section-title text-text-primary">{numberText(filteredRows.length)}</div>
              </div>
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">待确认</div>
                <div className="mt-2 text-section-title font-section-title text-warning">{numberText(summary.countByStatus?.["待确认"] || 0)}</div>
              </div>
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">已确认</div>
                <div className="mt-2 text-section-title font-section-title text-success">{numberText(summary.countByStatus?.["已确认"] || 0)}</div>
              </div>
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">总商品数</div>
                <div className="mt-2 text-section-title font-section-title text-text-primary">{numberText(summary.itemCount)}</div>
              </div>
            </div>
          </div>
          <ListPageToolbar>
            <div className="list-toolbar-spacer" />
            <div className="list-toolbar-group">
              <IconActionButton label="列设置" onClick={() => setColumnSettingsOpen(true)}>
                <Settings2 aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              </IconActionButton>
            </div>
          </ListPageToolbar>
          <HorizontalScrollArea viewportClassName={getDensityClassName(suggestionColumnState.density)}>
            <table>
              <thead>
                <tr>
                  {visibleColumns.map((column, index) => {
                    const left = fixedLeftMap.get(column.id);
                    const isFixed = left !== undefined;
                    const width = columnWidths[column.id] ?? column.width;
                    return (
                      <TableHeaderCell
                        key={column.id}
                        label={column.label}
                        width={width}
                        left={left}
                        isFixed={isFixed}
                        align={column.align}
                        sortable={Boolean(column.sortType && column.getSortValue)}
                        showDivider={index < visibleColumns.length - 1}
                        sortDirection={sortState?.columnId === column.id ? sortState.direction : undefined}
                        onToggleSort={() => {
                          setSortState((current) => getNextTableSortState(current, column.id));
                          setPage(1);
                        }}
                        onResizeStart={index < visibleColumns.length - 1 ? (event) => beginResize(event, column.id, width) : undefined}
                      />
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id}>
                    {visibleColumns.map((column, index) => {
                      const left = fixedLeftMap.get(column.id);
                      const isFixed = left !== undefined;
                      const width = columnWidths[column.id] ?? column.width;
                      return (
                        <td
                          key={column.id}
                          className={`${column.align === "right" ? "text-right" : ""} ${isFixed ? "table-fixed-cell is-body" : ""}`}
                          style={{ width, minWidth: width, left }}
                        >
                          {renderSuggestionCell(row, column.id)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>
          <Pagination
            currentPage={normalizedPage}
            totalPages={totalPages}
            totalCount={sortedRows.length}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            showTopBorder
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </ListPageMainCard>
      ) : null}

      <ColumnSettingsModal
        open={columnSettingsOpen}
        title="转拨建议列设置"
        fields={suggestionColumns}
        state={suggestionColumnState}
        defaultState={suggestionDefaultColumnState}
        onClose={() => setColumnSettingsOpen(false)}
        onApply={applySuggestionColumnState}
      />
    </div>
  );
}
