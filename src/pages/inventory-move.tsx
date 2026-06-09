import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ChevronDown, ClipboardPlus, Settings2 } from "lucide-react";
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
import { inventoryMoveRecords, type InventoryMoveRecord, type InventoryMoveStatus } from "../data/inventory-move";

type InventoryMoveFilters = {
  owner: string;
  warehouse: string;
  itemCode: string;
  barcode: string;
  itemName: string;
  categoryLarge: string;
  categoryMedium: string;
  categorySmall: string;
  status: string;
  moveNo: string;
};

type InventoryMoveColumnId =
  | "moveNo"
  | "owner"
  | "sourceWarehouse"
  | "sourceLocation"
  | "targetWarehouse"
  | "targetLocation"
  | "itemCode"
  | "barcodes"
  | "itemName"
  | "categoryLarge"
  | "categoryMedium"
  | "categorySmall"
  | "moveQty"
  | "availableQty"
  | "status"
  | "operator"
  | "createdAt";

type InventoryMoveScenario = "normal" | "loading" | "no-result" | "no-auth";

type InventoryMoveFilterKey =
  | "moveNo"
  | "owner"
  | "warehouse"
  | "itemCode"
  | "barcode"
  | "itemName"
  | "categoryLarge"
  | "categoryMedium"
  | "categorySmall"
  | "status";

const defaultFilters: InventoryMoveFilters = {
  owner: "全部",
  warehouse: "全部",
  itemCode: "",
  barcode: "",
  itemName: "",
  categoryLarge: "全部",
  categoryMedium: "全部",
  categorySmall: "全部",
  status: "全部",
  moveNo: "",
};

const pageSizeOptions = [20, 50, 100];

const inventoryMoveTabs = [
  { label: "正常", value: "normal" },
  { label: "加载中", value: "loading" },
  { label: "查询无结果", value: "no-result" },
  { label: "无权限", value: "no-auth" },
] as const;

function buildOptions(values: string[]) {
  return [{ label: "全部", value: "全部" }, ...values.map((value) => ({ label: value, value }))];
}

function numberText(value: number) {
  return value.toLocaleString("zh-CN");
}

function includesText(source: string, target: string) {
  if (!target.trim()) {
    return true;
  }
  return source.toLowerCase().includes(target.trim().toLowerCase());
}

function statusToneClass(status: InventoryMoveStatus) {
  if (status === "已完成") {
    return "success";
  }
  if (status === "执行中") {
    return "processing";
  }
  if (status === "待执行") {
    return "pending";
  }
  if (status === "已取消") {
    return "closed";
  }
  return "draft";
}

export function InventoryMovePage({
  onCreateExportTask,
  onShowAlert,
}: {
  onCreateExportTask: (payload: { recordCount: number }) => void;
  onShowAlert?: (input: FloatingAlertInput) => void;
}) {
  const [draftFilters, setDraftFilters] = useState<InventoryMoveFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<InventoryMoveFilters>(defaultFilters);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [scenario, setScenario] = useState<InventoryMoveScenario>("normal");
  const [sortState, setSortState] = useState<TableSortState<InventoryMoveColumnId>>({
    columnId: "createdAt",
    direction: "desc",
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    moveNo: "",
    owner: "",
    sourceWarehouse: "",
    sourceLocation: "",
    targetWarehouse: "",
    targetLocation: "",
    itemCode: "",
    itemName: "",
    moveQty: "",
  });

  const inventoryMoveColumns = useMemo(
    () =>
      [
        { id: "moveNo", label: "移动单号", group: "基础信息", required: true, defaultFixed: true, width: 180 },
        { id: "owner", label: "货主", group: "基础信息", required: true, defaultFixed: true, width: 220 },
        { id: "sourceWarehouse", label: "源仓库", group: "位置信息", width: 200 },
        { id: "sourceLocation", label: "源库位", group: "位置信息", width: 100 },
        { id: "targetWarehouse", label: "目标仓库", group: "位置信息", width: 200 },
        { id: "targetLocation", label: "目标库位", group: "位置信息", width: 100 },
        { id: "itemCode", label: "商品编码", group: "商品信息", width: 140 },
        { id: "barcodes", label: "商品条码", group: "商品信息", width: 180 },
        { id: "itemName", label: "商品名称", group: "商品信息", width: 180 },
        { id: "categoryLarge", label: "商品大类", group: "品类信息", width: 150 },
        { id: "categoryMedium", label: "商品中类", group: "品类信息", width: 150 },
        { id: "categorySmall", label: "商品小类", group: "品类信息", width: 150 },
        { id: "moveQty", label: "移动数量", group: "数量信息", width: 108, align: "right" as const, sortType: "number" as TableSortType, getSortValue: (row: InventoryMoveRecord) => row.moveQty },
        { id: "availableQty", label: "可移动数量", group: "数量信息", width: 120, align: "right" as const, sortType: "number" as TableSortType, getSortValue: (row: InventoryMoveRecord) => row.availableQty },
        { id: "status", label: "状态", group: "状态信息", width: 90 },
        { id: "operator", label: "操作人", group: "状态信息", width: 100 },
        { id: "createdAt", label: "创建时间", group: "状态信息", width: 168, sortType: "datetime" as TableSortType, getSortValue: (row: InventoryMoveRecord) => row.createdAt },
      ] satisfies Array<ColumnSettingsField & { id: InventoryMoveColumnId; width: number; align?: "left" | "right"; sortType?: TableSortType; getSortValue?: (row: InventoryMoveRecord) => unknown }>,
    [],
  );

  const {
    state: inventoryMoveColumnState,
    defaultState: inventoryMoveDefaultColumnState,
    applyState: applyInventoryMoveColumnState,
  } = usePersistedColumnSettings({
    storageKey: "column-settings:demo-user:inventory-move",
    fields: inventoryMoveColumns,
    defaultDensity: "medium",
  });
  const { beginResize, widths: columnWidths } = useTableColumnResize({
    state: inventoryMoveColumnState,
    applyState: applyInventoryMoveColumnState,
  });

  const visibleColumns = useMemo(() => {
    return inventoryMoveColumnState.order
      .filter((id) => inventoryMoveColumnState.visible.includes(id))
      .map((id) => inventoryMoveColumns.find((column) => column.id === id))
      .filter((column): column is (typeof inventoryMoveColumns)[number] => Boolean(column));
  }, [inventoryMoveColumnState.order, inventoryMoveColumnState.visible, inventoryMoveColumns]);

  const fixedLeftMap = useMemo(() => {
    const fixedSet = new Set(inventoryMoveColumnState.fixed);
    const leftMap = new Map<string, number>();
    let left = 0;
    visibleColumns.forEach((column) => {
      if (!fixedSet.has(column.id)) return;
      leftMap.set(column.id, left);
      left += columnWidths[column.id] ?? column.width;
    });
    return leftMap;
  }, [columnWidths, inventoryMoveColumnState.fixed, visibleColumns]);

  const ownerOptions = useMemo(
    () => buildOptions(Array.from(new Set(inventoryMoveRecords.map((item) => item.owner)))),
    [],
  );
  const warehouseOptions = useMemo(
    () => buildOptions(Array.from(new Set(inventoryMoveRecords.flatMap((item) => [item.sourceWarehouse, item.targetWarehouse])))),
    [],
  );
  const largeCategoryOptions = useMemo(
    () => buildOptions(Array.from(new Set(inventoryMoveRecords.map((item) => item.categoryLarge)))),
    [],
  );
  const mediumCategoryOptions = useMemo(
    () => buildOptions(Array.from(new Set(inventoryMoveRecords.map((item) => item.categoryMedium)))),
    [],
  );
  const smallCategoryOptions = useMemo(
    () => buildOptions(Array.from(new Set(inventoryMoveRecords.map((item) => item.categorySmall)))),
    [],
  );
  const statusOptions = buildOptions(["草稿", "待执行", "执行中", "已完成", "已取消"]);

  const queryFieldDefinitions: Array<{ key: InventoryMoveFilterKey; queryColumns?: 1 | 2 }> = [
    { key: "owner" },
    { key: "warehouse" },
    { key: "itemCode" },
    { key: "barcode" },
    { key: "itemName" },
    { key: "categoryLarge" },
    { key: "categoryMedium" },
    { key: "categorySmall" },
    { key: "status" },
  ];
  const visibleQueryFieldKeys = getVisibleQuerySectionItems(queryFieldDefinitions, showMoreFilters).map((field) => field.key);
  const visibleQueryFieldKeySet = new Set<InventoryMoveFilterKey>(visibleQueryFieldKeys);
  const hasCollapsedQueryFields = hasCollapsedQuerySectionItems(queryFieldDefinitions);

  const sortConfigs = useMemo(
    () =>
      inventoryMoveColumns.reduce<Partial<Record<InventoryMoveColumnId, TableSortConfig<InventoryMoveRecord>>>>((configs, column) => {
        if (!column.sortType || !column.getSortValue) return configs;
        configs[column.id] = { type: column.sortType, getValue: column.getSortValue };
        return configs;
      }, {}),
    [inventoryMoveColumns],
  );

  const filteredRows = useMemo(() => {
    return inventoryMoveRecords.filter((row) => {
      if (appliedFilters.owner !== "全部" && row.owner !== appliedFilters.owner) return false;
      if (appliedFilters.warehouse !== "全部" && row.sourceWarehouse !== appliedFilters.warehouse && row.targetWarehouse !== appliedFilters.warehouse) return false;
      if (appliedFilters.categoryLarge !== "全部" && row.categoryLarge !== appliedFilters.categoryLarge) return false;
      if (appliedFilters.categoryMedium !== "全部" && row.categoryMedium !== appliedFilters.categoryMedium) return false;
      if (appliedFilters.categorySmall !== "全部" && row.categorySmall !== appliedFilters.categorySmall) return false;
      if (appliedFilters.status !== "全部" && row.status !== appliedFilters.status) return false;
      return (
        includesText(row.moveNo, appliedFilters.moveNo) &&
        includesText(row.itemCode, appliedFilters.itemCode) &&
        includesText(row.barcodes, appliedFilters.barcode) &&
        includesText(row.itemName, appliedFilters.itemName)
      );
    });
  }, [appliedFilters]);

  const sortedRows = useMemo(() => sortTableRows(filteredRows, sortState, sortConfigs), [filteredRows, sortConfigs, sortState]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pagedRows = sortedRows.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.moveQty += row.moveQty;
        acc.countByStatus[row.status] = (acc.countByStatus[row.status] || 0) + 1;
        return acc;
      },
      { moveQty: 0, countByStatus: {} as Record<string, number> },
    );
  }, [filteredRows]);

  function handleQuery() {
    setAppliedFilters(draftFilters);
    setPage(1);
    const nextRows = inventoryMoveRecords.filter((row) => {
      if (draftFilters.owner !== "全部" && row.owner !== draftFilters.owner) return false;
      if (draftFilters.warehouse !== "全部" && row.sourceWarehouse !== draftFilters.warehouse && row.targetWarehouse !== draftFilters.warehouse) return false;
      if (draftFilters.categoryLarge !== "全部" && row.categoryLarge !== draftFilters.categoryLarge) return false;
      if (draftFilters.categoryMedium !== "全部" && row.categoryMedium !== draftFilters.categoryMedium) return false;
      if (draftFilters.categorySmall !== "全部" && row.categorySmall !== draftFilters.categorySmall) return false;
      if (draftFilters.status !== "全部" && row.status !== draftFilters.status) return false;
      return (
        includesText(row.moveNo, draftFilters.moveNo) &&
        includesText(row.itemCode, draftFilters.itemCode) &&
        includesText(row.barcodes, draftFilters.barcode) &&
        includesText(row.itemName, draftFilters.itemName)
      );
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

  function handleExport() {
    onCreateExportTask({
      recordCount: filteredRows.length,
    });
  }

  function updateFilter<K extends keyof InventoryMoveFilters>(key: K, value: InventoryMoveFilters[K]) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function handleCreate() {
    setCreateModalOpen(true);
  }

  function handleSaveCreate() {
    const qty = parseInt(createForm.moveQty, 10);
    if (!createForm.owner || !createForm.sourceWarehouse || !createForm.targetWarehouse || !createForm.itemCode || !createForm.itemName || isNaN(qty) || qty <= 0) {
      onShowAlert?.({
        tone: "error",
        title: "表单校验失败",
        description: "请填写完整且正确的移动信息。",
      });
      return;
    }
    onShowAlert?.({
      tone: "success",
      title: "创建成功",
      description: `已创建库存移动单：${createForm.sourceWarehouse} → ${createForm.targetWarehouse}`,
    });
    setCreateModalOpen(false);
    setCreateForm({
      moveNo: "",
      owner: "",
      sourceWarehouse: "",
      sourceLocation: "",
      targetWarehouse: "",
      targetLocation: "",
      itemCode: "",
      itemName: "",
      moveQty: "",
    });
  }

  function renderMoveCell(row: InventoryMoveRecord, columnId: InventoryMoveColumnId) {
    if (columnId === "moveNo") {
      return <span className="tabular-nums text-link">{row.moveNo}</span>;
    }
    if (columnId === "owner") {
      return (
        <div className="max-w-[220px] truncate" title={row.owner}>
          {row.owner}
        </div>
      );
    }
    if (columnId === "sourceWarehouse") {
      return (
        <div className="max-w-[200px] truncate" title={row.sourceWarehouse}>
          {row.sourceWarehouse}
        </div>
      );
    }
    if (columnId === "sourceLocation") {
      return <span className="tabular-nums">{row.sourceLocation}</span>;
    }
    if (columnId === "targetWarehouse") {
      return (
        <div className="max-w-[200px] truncate" title={row.targetWarehouse}>
          {row.targetWarehouse}
        </div>
      );
    }
    if (columnId === "targetLocation") {
      return <span className="tabular-nums">{row.targetLocation}</span>;
    }
    if (columnId === "itemCode") {
      return <span className="tabular-nums text-text-primary">{row.itemCode}</span>;
    }
    if (columnId === "barcodes") {
      return (
        <div className="max-w-[180px] truncate" title={row.barcodes}>
          {row.barcodes}
        </div>
      );
    }
    if (columnId === "itemName") {
      return row.itemName;
    }
    if (columnId === "categoryLarge") {
      return row.categoryLarge;
    }
    if (columnId === "categoryMedium") {
      return row.categoryMedium;
    }
    if (columnId === "categorySmall") {
      return row.categorySmall;
    }
    if (columnId === "moveQty") {
      return <span className="tabular-nums">{numberText(row.moveQty)}</span>;
    }
    if (columnId === "availableQty") {
      return <span className="tabular-nums text-success">{numberText(row.availableQty)}</span>;
    }
    if (columnId === "status") {
      return <span className="status-badge tone-{statusToneClass(row.status)}">{row.status}</span>;
    }
    if (columnId === "operator") {
      return row.operator;
    }
    return <span className="tabular-nums text-text-secondary">{row.createdAt}</span>;
  }

  return (
    <div className="space-y-page-block">
      <FloatingAlert notice={undefined} />
      <DemoToolbar label="列表页" items={inventoryMoveTabs} value={scenario} onChange={setScenario} />
      <PageHeader
        title="库存移动"
        description="管理仓库内或跨仓库的库存移动单，支持按货主、仓库、商品和状态组合查询，查看移动数量、源/目标位置和执行状态。"
        actions={
          <Button variant="primary" disabled={filteredRows.length === 0} onClick={handleExport}>
            导出
          </Button>
        }
      />

      <Card>
        <div className="query-section-grid">
          {visibleQueryFieldKeySet.has("owner") ? (
            <div>
              <div className="field-label">货主</div>
              <Select value={draftFilters.owner} onValueChange={(value) => updateFilter("owner", value)} options={ownerOptions} />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("warehouse") ? (
            <div>
              <div className="field-label">仓库</div>
              <Select value={draftFilters.warehouse} onValueChange={(value) => updateFilter("warehouse", value)} options={warehouseOptions} />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("itemCode") ? (
            <div>
              <div className="field-label">商品编码</div>
              <Input value={draftFilters.itemCode} onChange={(event) => updateFilter("itemCode", event.target.value)} placeholder="请输入" />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("barcode") ? (
            <div>
              <div className="field-label">商品条码</div>
              <Input value={draftFilters.barcode} onChange={(event) => updateFilter("barcode", event.target.value)} placeholder="请输入" />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("itemName") ? (
            <div>
              <div className="field-label">商品名称</div>
              <Input value={draftFilters.itemName} onChange={(event) => updateFilter("itemName", event.target.value)} placeholder="请输入" />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("categoryLarge") ? (
            <div>
              <div className="field-label">商品大类</div>
              <Select value={draftFilters.categoryLarge} onValueChange={(value) => updateFilter("categoryLarge", value)} options={largeCategoryOptions} />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("categoryMedium") ? (
            <div>
              <div className="field-label">商品中类</div>
              <Select value={draftFilters.categoryMedium} onValueChange={(value) => updateFilter("categoryMedium", value)} options={mediumCategoryOptions} />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("categorySmall") ? (
            <div>
              <div className="field-label">商品小类</div>
              <Select value={draftFilters.categorySmall} onValueChange={(value) => updateFilter("categorySmall", value)} options={smallCategoryOptions} />
            </div>
          ) : null}
          {visibleQueryFieldKeySet.has("status") ? (
            <div>
              <div className="field-label">状态</div>
              <Select value={draftFilters.status} onValueChange={(value) => updateFilter("status", value)} options={statusOptions} />
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

      {scenario === "no-auth" ? (
        <ExceptionState
          variant="403"
          description="当前用户无库存移动查看权限。请联系管理员开通库存移动菜单和数据范围权限。"
          primaryAction={<Button variant="primary">联系管理员</Button>}
          secondaryAction={<Button>返回首页</Button>}
        />
      ) : null}

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
          description="当前筛选条件下没有命中库存移动记录，请调整货主、仓库或商品条件后重试。"
          primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>}
          secondaryAction={<Button onClick={handleQuery}>重新查询</Button>}
        />
      ) : null}

      {scenario === "normal" && filteredRows.length > 0 ? (
        <ListPageMainCard>
          <div className="border-b border-border bg-bg-subtle px-4 py-3">
            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">总移动单数</div>
                <div className="mt-2 text-section-title font-section-title text-text-primary">{numberText(summary.countByStatus?.["已完成"] || filteredRows.length)}</div>
              </div>
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">待执行</div>
                <div className="mt-2 text-section-title font-section-title text-warning">{numberText(summary.countByStatus?.["待执行"] || 0)}</div>
              </div>
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">执行中</div>
                <div className="mt-2 text-section-title font-section-title text-processing">{numberText(summary.countByStatus?.["执行中"] || 0)}</div>
              </div>
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">已完成</div>
                <div className="mt-2 text-section-title font-section-title text-success">{numberText(summary.countByStatus?.["已完成"] || 0)}</div>
              </div>
              <div className="rounded-sm border border-border bg-white px-3 py-3">
                <div className="text-small text-text-muted">总移动数量</div>
                <div className="mt-2 text-section-title font-section-title text-text-primary">{numberText(summary.moveQty)}</div>
              </div>
            </div>
          </div>
          <ListPageToolbar>
            <Button variant="primary" onClick={handleCreate}>
              <ClipboardPlus aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              新建移动单
            </Button>
            <div className="list-toolbar-spacer" />
            <div className="list-toolbar-group">
              <IconActionButton label="列设置" onClick={() => setColumnSettingsOpen(true)}>
                <Settings2 aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              </IconActionButton>
            </div>
          </ListPageToolbar>
          <HorizontalScrollArea viewportClassName={getDensityClassName(inventoryMoveColumnState.density)}>
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
                          {renderMoveCell(row, column.id)}
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
        title="库存移动列设置"
        fields={inventoryMoveColumns}
        state={inventoryMoveColumnState}
        defaultState={inventoryMoveDefaultColumnState}
        onClose={() => setColumnSettingsOpen(false)}
        onApply={applyInventoryMoveColumnState}
      />

      <Modal open={createModalOpen} title="新建库存移动单" onClose={() => setCreateModalOpen(false)}>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="field-label">货主</div>
              <Select
                options={ownerOptions}
                onValueChange={(value) => setCreateForm((f) => ({ ...f, owner: value }))}
                placeholder="请选择货主"
              />
            </div>
            <div>
              <div className="field-label">商品编码</div>
              <Input value={createForm.itemCode} onChange={(e) => setCreateForm((f) => ({ ...f, itemCode: e.target.value }))} placeholder="请输入" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="field-label">商品名称</div>
              <Input value={createForm.itemName} onChange={(e) => setCreateForm((f) => ({ ...f, itemName: e.target.value }))} placeholder="请输入" />
            </div>
            <div>
              <div className="field-label">移动数量</div>
              <Input value={createForm.moveQty} onChange={(e) => setCreateForm((f) => ({ ...f, moveQty: e.target.value }))} placeholder="请输入数量" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="field-label">源仓库</div>
              <Select
                options={warehouseOptions}
                onValueChange={(value) => setCreateForm((f) => ({ ...f, sourceWarehouse: value }))}
                placeholder="请选择源仓库"
              />
            </div>
            <div>
              <div className="field-label">源库位</div>
              <Input value={createForm.sourceLocation} onChange={(e) => setCreateForm((f) => ({ ...f, sourceLocation: e.target.value }))} placeholder="请输入库位" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="field-label">目标仓库</div>
              <Select
                options={warehouseOptions}
                onValueChange={(value) => setCreateForm((f) => ({ ...f, targetWarehouse: value }))}
                placeholder="请选择目标仓库"
              />
            </div>
            <div>
              <div className="field-label">目标库位</div>
              <Input value={createForm.targetLocation} onChange={(e) => setCreateForm((f) => ({ ...f, targetLocation: e.target.value }))} placeholder="请输入库位" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleSaveCreate}>
              确认创建
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
