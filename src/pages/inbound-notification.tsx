import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { Banner } from "../components/ui/banner";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import {
  type ColumnSettingsField,
  ColumnSettingsModal,
  getDensityClassName,
  usePersistedColumnSettings,
} from "../components/ui/column-settings";
import { DemoToolbar } from "../components/ui/demo-toolbar";
import { DescriptionList } from "../components/ui/description-list";
import { ExceptionState } from "../components/ui/exception-state";
import { HorizontalScrollArea } from "../components/ui/horizontal-scroll-area";
import { IconActionButton } from "../components/ui/icon-action-button";
import { ImportLoadingState, ImportSelectStage } from "../components/ui/import-dialog-section";
import { Input } from "../components/ui/input";
import { ImportResultPanel } from "../components/ui/import-result-panel";
import { ListPageMainCard, ListPageToolbar } from "../components/ui/list-page-layout";
import { Modal } from "../components/ui/modal";
import { Pagination } from "../components/ui/pagination";
import { PageHeader } from "../components/ui/page-header";
import { getVisibleQuerySectionItems, hasCollapsedQuerySectionItems } from "../components/ui/query-section";
import { RadioGroup } from "../components/ui/radio-group";
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
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Timeline } from "../components/ui/timeline";
import {
  inboundNotifications,
  inboundLineItems,
  inboundRelatedDocuments,
  inboundOperationLogs,
  inboundApprovalLogs,
  type InboundNotificationRow,
} from "../data/inbound-notification";

export type InboundListScenario = "normal" | "loading" | "empty" | "no-result" | "no-auth" | "push-warning";
export type InboundDetailScenario = "normal" | "closed" | "partial" | "no-auth";
export type InboundDetailTab = "items" | "related" | "logs" | "approvals";
export type InboundNotice = {
  tone: "success" | "warning" | "error";
  title: string;
  description: string;
} | null;

type FieldOption = {
  label: string;
  value: string;
};

const inboundListTabs = [
  { label: "正常", value: "normal" },
  { label: "加载中", value: "loading" },
  { label: "空数据", value: "empty" },
  { label: "查询无结果", value: "no-result" },
  { label: "无权限", value: "no-auth" },
  { label: "推送异常", value: "push-warning" },
] as const;

const inboundDetailTabs = [
  { label: "正常", value: "normal" },
  { label: "已取消", value: "closed" },
  { label: "部分入库", value: "partial" },
  { label: "无权限", value: "no-auth" },
] as const;

const statusOptions: FieldOption[] = [
  { label: "全部", value: "全部" },
  { label: "待收货", value: "待收货" },
  { label: "部分入库", value: "部分入库" },
  { label: "已入库", value: "已入库" },
  { label: "已取消", value: "已取消" },
];

const typeOptions: FieldOption[] = [
  { label: "全部", value: "全部" },
  { label: "普通采购", value: "普通采购" },
  { label: "门店直送", value: "门店直送" },
  { label: "常温采购", value: "常温采购" },
  { label: "寄售采购", value: "寄售采购" },
];

const warehouseOptions: FieldOption[] = [
  { label: "全部", value: "全部" },
  { label: "上海生鲜仓", value: "上海生鲜仓" },
  { label: "北京中转仓", value: "北京中转仓" },
  { label: "广州常温仓", value: "广州常温仓" },
  { label: "武汉常温仓", value: "武汉常温仓" },
  { label: "杭州冷链仓", value: "杭州冷链仓" },
  { label: "成都冷链仓", value: "成都冷链仓" },
  { label: "深圳设备仓", value: "深圳设备仓" },
];

const organizationOptions: FieldOption[] = [
  { label: "全部", value: "全部" },
  { label: "华东采购中心", value: "华东采购中心" },
  { label: "全国采购中心", value: "全国采购中心" },
  { label: "华南采购中心", value: "华南采购中心" },
  { label: "华中采购中心", value: "华中采购中心" },
  { label: "西南采购中心", value: "西南采购中心" },
];

type InboundListFilters = {
  id: string;
  poId: string;
  supplier: string;
  status: string;
  type: string;
  warehouse: string;
  organization: string;
};

const defaultListFilters: InboundListFilters = {
  id: "",
  poId: "",
  supplier: "",
  status: "全部",
  type: "全部",
  warehouse: "全部",
  organization: "全部",
};

type InboundQueryField = {
  key: string;
  label: string;
  value: string;
  kind?: "input" | "select";
  options?: FieldOption[];
  placeholder?: string;
  onChange: (value: string) => void;
};

function FormField({
  label,
  value,
  onChange,
  kind = "input",
  options = [],
  placeholder,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  kind?: "input" | "select" | "textarea";
  options?: FieldOption[];
  placeholder?: string;
  readOnly?: boolean;
}) {
  const resolvedPlaceholder = kind === "select" ? "请选择" : "请输入";

  return (
    <div>
      <div className="field-label">{label}</div>
      {readOnly ? (
        <div className="display-field">{value || "-"}</div>
      ) : kind === "select" ? (
        <Select className="bg-white" value={value} options={options} placeholder={resolvedPlaceholder} onValueChange={onChange} />
      ) : kind === "textarea" ? (
        <Textarea value={value} placeholder={resolvedPlaceholder} onChange={(event) => onChange?.(event.target.value)} />
      ) : (
        <Input value={value} placeholder={resolvedPlaceholder} onChange={(event) => onChange?.(event.target.value)} />
      )}
    </div>
  );
}

function StatusNotice({
  notice,
  action,
}: {
  notice: InboundNotice;
  action?: ReactNode;
}) {
  if (!notice) {
    return null;
  }

  return <Banner tone={notice.tone} title={notice.title} description={notice.description} action={action} />;
}

function statusBadge(status: string) {
  if (status === "已入库") {
    return <Badge tone="success">{status}</Badge>;
  }
  if (status === "部分入库") {
    return <Badge tone="processing">{status}</Badge>;
  }
  if (status === "待收货") {
    return <Badge tone="pending">{status}</Badge>;
  }
  if (status === "已取消") {
    return <Badge tone="closed">{status}</Badge>;
  }
  return <Badge tone="draft">{status}</Badge>;
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return <DescriptionList items={items.map(([label, value]) => ({ label, value }))} />;
}

export function InboundNotificationListPage({
  records,
  scenario,
  onScenarioChange,
  onOpenCreate,
  onOpenDetail,
  onOpenImport,
  onOpenExport,
  notice,
  onClearNotice,
}: {
  records: InboundNotificationRow[];
  scenario: InboundListScenario;
  onScenarioChange: (value: InboundListScenario) => void;
  onOpenCreate: () => void;
  onOpenDetail: (id: string) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  notice: InboundNotice;
  onClearNotice: () => void;
}) {
  const [draftFilters, setDraftFilters] = useState<InboundListFilters>(defaultListFilters);
  const [activeFilters, setActiveFilters] = useState<InboundListFilters>(defaultListFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [sortState, setSortState] = useState<TableSortState<string>>(null);

  const inboundStatusTabs = [
    { label: "全部", value: "全部" },
    { label: "待收货", value: "待收货" },
    { label: "部分入库", value: "部分入库" },
    { label: "已入库", value: "已入库" },
    { label: "已取消", value: "已取消" },
  ] as const;
  const [activeStatusTab, setActiveStatusTab] = useState<string>("全部");

  const inboundColumns = useMemo(
    () =>
      [
        { id: "select", label: "选择", group: "系统字段", required: true, defaultFixed: true, width: 56 },
        { id: "id", label: "通知单号", group: "基础信息", required: true, defaultFixed: true, width: 160 },
        { id: "poId", label: "采购单号", group: "基础信息", defaultFixed: true, width: 160 },
        { id: "supplier", label: "供应商", group: "基础信息", defaultFixed: true, width: 220 },
        { id: "warehouse", label: "仓库", group: "基础信息", width: 150 },
        { id: "status", label: "状态", group: "状态信息", width: 110 },
        { id: "checkinStatus", label: "签到状态", group: "状态信息", width: 110 },
        { id: "eta", label: "预计到货日", group: "日期信息", width: 130, sortType: "datetime" as TableSortType, getSortValue: (row: InboundNotificationRow) => row.eta },
        { id: "totalQty", label: "通知数量", group: "数量信息", width: 110, align: "right" as const },
        { id: "receivedQty", label: "已收数量", group: "数量信息", width: 110, align: "right" as const },
        { id: "organization", label: "采购组织", group: "组织信息", width: 150 },
        { id: "type", label: "业务类型", group: "组织信息", width: 120 },
        { id: "owner", label: "创建人", group: "制单信息", width: 100 },
        { id: "createdAt", label: "创建时间", group: "制单信息", width: 168, sortType: "datetime" as TableSortType, getSortValue: (row: InboundNotificationRow) => row.createdAt },
        { id: "remark", label: "备注", group: "扩展字段", defaultVisible: false, width: 200 },
        { id: "actions", label: "操作", group: "系统字段", required: true, width: 120 },
      ] satisfies Array<ColumnSettingsField & { width: number; align?: "left" | "right"; sortType?: TableSortType; getSortValue?: (row: InboundNotificationRow) => unknown }>,
    [],
  );

  const {
    state: inboundColumnState,
    defaultState: inboundDefaultColumnState,
    applyState: applyInboundColumnState,
  } = usePersistedColumnSettings({
    storageKey: "column-settings:demo-user:inbound-notification-list",
    fields: inboundColumns,
    defaultDensity: "medium",
  });
  const { beginResize, widths: columnWidths } = useTableColumnResize({
    state: inboundColumnState,
    applyState: applyInboundColumnState,
  });

  const visibleColumns = useMemo(() => {
    return inboundColumnState.order
      .filter((id) => inboundColumnState.visible.includes(id))
      .map((id) => inboundColumns.find((column) => column.id === id))
      .filter((column): column is (typeof inboundColumns)[number] => Boolean(column));
  }, [inboundColumnState.order, inboundColumnState.visible, inboundColumns]);

  const fixedLeftMap = useMemo(() => {
    const fixedSet = new Set(inboundColumnState.fixed);
    const leftMap = new Map<string, number>();
    let left = 0;

    visibleColumns.forEach((column) => {
      if (!fixedSet.has(column.id)) {
        return;
      }

      leftMap.set(column.id, left);
      left += columnWidths[column.id] ?? column.width;
    });

    return leftMap;
  }, [columnWidths, inboundColumnState.fixed, visibleColumns]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => records.some((item) => item.id === id)));
  }, [records]);

  const queryFieldDefinitions: InboundQueryField[] = [
    {
      key: "id",
      label: "通知单号",
      value: draftFilters.id,
      placeholder: "请输入通知单号",
      onChange: (value: string) => setDraftFilters((current) => ({ ...current, id: value })),
    },
    {
      key: "poId",
      label: "采购单号",
      value: draftFilters.poId,
      placeholder: "请输入采购单号",
      onChange: (value: string) => setDraftFilters((current) => ({ ...current, poId: value })),
    },
    {
      key: "supplier",
      label: "供应商",
      value: draftFilters.supplier,
      placeholder: "请输入供应商",
      onChange: (value: string) => setDraftFilters((current) => ({ ...current, supplier: value })),
    },
    {
      key: "status",
      label: "状态",
      kind: "select" as const,
      value: draftFilters.status,
      options: statusOptions,
      onChange: (value: string) => setDraftFilters((current) => ({ ...current, status: value })),
    },
    {
      key: "type",
      label: "业务类型",
      kind: "select" as const,
      value: draftFilters.type,
      options: typeOptions,
      onChange: (value: string) => setDraftFilters((current) => ({ ...current, type: value })),
    },
    {
      key: "warehouse",
      label: "仓库",
      kind: "select" as const,
      value: draftFilters.warehouse,
      options: warehouseOptions,
      onChange: (value: string) => setDraftFilters((current) => ({ ...current, warehouse: value })),
    },
    {
      key: "organization",
      label: "采购组织",
      kind: "select" as const,
      value: draftFilters.organization,
      options: organizationOptions,
      onChange: (value: string) => setDraftFilters((current) => ({ ...current, organization: value })),
    },
  ];
  const visibleQueryFields = getVisibleQuerySectionItems(queryFieldDefinitions, showMoreFilters);
  const hasCollapsedQueryFields = hasCollapsedQuerySectionItems(queryFieldDefinitions);
  const sortConfigs = useMemo(
    () =>
      inboundColumns.reduce<Partial<Record<string, TableSortConfig<InboundNotificationRow>>>>((configs, column) => {
        if (!column.sortType || !column.getSortValue) {
          return configs;
        }

        configs[column.id] = {
          type: column.sortType,
          getValue: column.getSortValue,
        };
        return configs;
      }, {}),
    [inboundColumns],
  );

  const filteredRows = useMemo(() => {
    return records.filter((row) => {
      const matchesStatusTab = activeStatusTab === "全部" || row.status === activeStatusTab;
      const matchesId = !activeFilters.id || row.id.toLowerCase().includes(activeFilters.id.toLowerCase());
      const matchesPoId = !activeFilters.poId || row.poId.toLowerCase().includes(activeFilters.poId.toLowerCase());
      const matchesSupplier = !activeFilters.supplier || row.supplier.toLowerCase().includes(activeFilters.supplier.toLowerCase());
      const matchesStatus = activeFilters.status === "全部" || row.status === activeFilters.status;
      const matchesType = activeFilters.type === "全部" || row.type === activeFilters.type;
      const matchesWarehouse = activeFilters.warehouse === "全部" || row.warehouse === activeFilters.warehouse;
      const matchesOrg = activeFilters.organization === "全部" || row.organization === activeFilters.organization;

      return (
        matchesStatusTab &&
        matchesId &&
        matchesPoId &&
        matchesSupplier &&
        matchesStatus &&
        matchesType &&
        matchesWarehouse &&
        matchesOrg
      );
    });
  }, [activeFilters, records, activeStatusTab]);

  const sortedRows = useMemo(() => sortTableRows(filteredRows, sortState, sortConfigs), [filteredRows, sortConfigs, sortState]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const allCurrentPageSelected = pageRows.length > 0 && pageRows.every((row) => selectedIds.includes(row.id));

  function handleQuery() {
    setActiveFilters(draftFilters);
    setPage(1);

    const nextRows = records.filter((row) => {
      const matchesStatusTab = activeStatusTab === "全部" || row.status === activeStatusTab;
      const matchesId = !draftFilters.id || row.id.toLowerCase().includes(draftFilters.id.toLowerCase());
      const matchesPoId = !draftFilters.poId || row.poId.toLowerCase().includes(draftFilters.poId.toLowerCase());
      const matchesSupplier = !draftFilters.supplier || row.supplier.toLowerCase().includes(draftFilters.supplier.toLowerCase());
      const matchesStatus = draftFilters.status === "全部" || row.status === draftFilters.status;
      const matchesType = draftFilters.type === "全部" || row.type === draftFilters.type;
      const matchesWarehouse = draftFilters.warehouse === "全部" || row.warehouse === draftFilters.warehouse;
      const matchesOrg = draftFilters.organization === "全部" || row.organization === draftFilters.organization;

      return (
        matchesStatusTab &&
        matchesId &&
        matchesPoId &&
        matchesSupplier &&
        matchesStatus &&
        matchesType &&
        matchesWarehouse &&
        matchesOrg
      );
    });

    onScenarioChange(nextRows.length > 0 ? "normal" : "no-result");
  }

  function handleReset() {
    setDraftFilters(defaultListFilters);
    setActiveFilters(defaultListFilters);
    setShowMoreFilters(false);
    setPage(1);
    onScenarioChange(records.length > 0 ? "normal" : "empty");
  }

  function toggleRowSelection(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleCurrentPageSelection() {
    const currentPageIds = pageRows.map((row) => row.id);
    if (allCurrentPageSelected) {
      setSelectedIds((current) => current.filter((id) => !currentPageIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...currentPageIds])));
  }

  const showTable = scenario === "normal" || scenario === "push-warning";

  function getInboundColumnCell(row: InboundNotificationRow, columnId: string) {
    if (columnId === "select") {
      return (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleRowSelection(row.id)}
        />
      );
    }

    if (columnId === "id") {
      return (
        <button className="text-link hover:text-link-hover" type="button" onClick={() => onOpenDetail(row.id)}>
          {row.id}
        </button>
      );
    }

    if (columnId === "poId") {
      return (
        <button className="text-link hover:text-link-hover" type="button">
          {row.poId}
        </button>
      );
    }

    if (columnId === "supplier") {
      return (
        <div className="max-w-[220px] truncate" title={row.supplier}>
          {row.supplier}
        </div>
      );
    }

    if (columnId === "warehouse") {
      return row.warehouse;
    }

    if (columnId === "status") {
      return statusBadge(row.status);
    }

    if (columnId === "checkinStatus") {
      return row.checkinTime ? (
        <div className="flex flex-col gap-0.5">
          <Badge tone="success">已签到</Badge>
          <span className="text-mini text-text-muted tabular-nums">{row.checkinTime}</span>
        </div>
      ) : (
        <Badge tone="draft">未签到</Badge>
      );
    }

    if (columnId === "eta") {
      return row.eta;
    }

    if (columnId === "totalQty") {
      return <span className="tabular-nums">{row.totalQty}</span>;
    }

    if (columnId === "receivedQty") {
      return <span className="tabular-nums text-text-secondary">{row.receivedQty}</span>;
    }

    if (columnId === "organization") {
      return row.organization;
    }

    if (columnId === "type") {
      return row.type;
    }

    if (columnId === "owner") {
      return row.owner;
    }

    if (columnId === "createdAt") {
      return row.createdAt;
    }

    if (columnId === "remark") {
      return (
        <div className="max-w-[200px] truncate" title={row.remark}>
          {row.remark || "-"}
        </div>
      );
    }

    if (columnId === "actions") {
      return (
        <div className="flex items-center gap-actions">
          <button className="text-link" type="button" onClick={() => onOpenDetail(row.id)}>
            详情
          </button>
          <button className="text-link" type="button">
            收货
          </button>
        </div>
      );
    }

    return "-";
  }

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="列表页" items={inboundListTabs} value={scenario} onChange={onScenarioChange} />

      <PageHeader
        title="入库通知单"
        description="管理采购订单下推生成的入库通知，跟踪到货、收货进度和入库状态。"
        actions={
          <>
            <Button variant="primary" onClick={onOpenCreate}>
              新增入库通知单
            </Button>
            <Button onClick={onOpenImport}>导入</Button>
            <Button onClick={onOpenExport}>导出</Button>
          </>
        }
      />

      <StatusNotice
        notice={notice}
        action={
          notice ? (
            <Button size="sm" onClick={onClearNotice}>
              我知道了
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="query-section-grid">
          {visibleQueryFields.map((field) => (
            <FormField
              key={field.key}
              label={field.label}
              kind={field.kind}
              value={field.value}
              options={field.options}
              placeholder={field.placeholder}
              onChange={field.onChange}
            />
          ))}
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
          <Button variant="secondary" onClick={handleReset}>
            重置
          </Button>
          <Button variant="primary" onClick={handleQuery}>
            查询
          </Button>
        </div>
      </Card>

      {scenario === "no-auth" ? (
        <ExceptionState
          variant="403"
          description="当前用户没有入库通知单访问权限，需开通入库管理菜单及组织数据范围后方可进入。"
          primaryAction={<Button variant="primary">联系管理员</Button>}
          secondaryAction={<Button>返回首页</Button>}
        />
      ) : null}

      {scenario === "loading" ? (
        <Card title="加载中">
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-sm bg-bg-subtle" />
            ))}
          </div>
        </Card>
      ) : null}

      {scenario === "empty" ? (
        <ExceptionState
          variant="404"
          title="空数据"
          description="当前组织下还没有入库通知单，请从采购订单下推或手动创建。"
          primaryAction={<Button variant="primary" onClick={onOpenCreate}>新增入库通知单</Button>}
        />
      ) : null}

      {scenario === "no-result" ? (
        <ExceptionState
          variant="404"
          title="查询无结果"
          description="没有符合当前筛选条件的入库通知单，请调整条件后重试。"
          primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>}
          secondaryAction={<Button onClick={handleQuery}>重新查询</Button>}
        />
      ) : null}

      {showTable ? (
        <>
          {scenario === "push-warning" ? (
            <StatusNotice
              notice={{
                tone: "warning",
                title: "存在下游同步异常",
                description: "当前有1条入库通知单收货同步失败，应支持查看失败原因并进行重试。",
              }}
              action={<Button size="sm">查看异常记录</Button>}
            />
          ) : null}

          <ListPageMainCard>
            <div className="px-4 pt-3">
              <Tabs
                items={inboundStatusTabs}
                value={activeStatusTab}
                onChange={(value) => {
                  setActiveStatusTab(value);
                  setSelectedIds([]);
                  setPage(1);
                }}
              />
            </div>
            <ListPageToolbar>
              <div className="list-toolbar-group">
                <label className="flex items-center gap-control">
                  <input type="checkbox" checked={allCurrentPageSelected} onChange={toggleCurrentPageSelection} />
                  全选
                </label>
                <span>已选中{selectedIds.length}条</span>
                <Button size="sm" disabled={selectedIds.length === 0} onClick={onOpenExport}>
                  批量导出
                </Button>
              </div>
              <div className="list-toolbar-group">
                <IconActionButton label="列设置" onClick={() => setColumnSettingsOpen(true)}>
                  <Settings2 aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
                </IconActionButton>
              </div>
            </ListPageToolbar>

            <HorizontalScrollArea viewportClassName={getDensityClassName(inboundColumnState.density)}>
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
                  {pageRows.map((row) => {
                    return (
                      <tr key={row.id}>
                        {visibleColumns.map((column, index) => {
                          const left = fixedLeftMap.get(column.id);
                          const isFixed = left !== undefined;
                          const width = columnWidths[column.id] ?? column.width;

                          return (
                            <td
                              key={column.id}
                              className={`${column.align === "right" ? "text-right" : ""} ${isFixed ? "table-fixed-cell is-body" : ""}`}
                              style={{
                                width,
                                minWidth: width,
                                left,
                              }}
                            >
                              {getInboundColumnCell(row, column.id)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </HorizontalScrollArea>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={sortedRows.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </ListPageMainCard>
        </>
      ) : null}
      <ColumnSettingsModal
        open={columnSettingsOpen}
        title="入库通知单列表列设置"
        fields={inboundColumns}
        state={inboundColumnState}
        defaultState={inboundDefaultColumnState}
        onClose={() => setColumnSettingsOpen(false)}
        onApply={applyInboundColumnState}
      />
    </div>
  );
}

export function InboundNotificationDetailPage({
  record,
  scenario,
  activeTab,
  onScenarioChange,
  onTabChange,
  onReceive,
}: {
  record: InboundNotificationRow;
  scenario: InboundDetailScenario;
  activeTab: InboundDetailTab;
  onScenarioChange: (value: InboundDetailScenario) => void;
  onTabChange: (value: InboundDetailTab) => void;
  onReceive: (id: string) => void;
}) {
  const [notice, setNotice] = useState<InboundNotice>(null);

  useEffect(() => {
    setNotice(null);
  }, [record.id]);

  if (scenario === "no-auth") {
    return (
      <div className="space-y-page-block">
        <DemoToolbar label="详情页" items={inboundDetailTabs} value={scenario} onChange={onScenarioChange} />
        <PageHeader title="入库通知单详情" description="详情页必须覆盖无权限和已取消状态。" />
        <ExceptionState
          variant="403"
          description="当前用户可以看入库通知单列表，但没有入库通知单详情访问权限。"
          primaryAction={<Button variant="primary">联系管理员</Button>}
          secondaryAction={<Button>返回列表</Button>}
        />
      </div>
    );
  }

  const closed = scenario === "closed" || record.status === "已取消";
  const partial = scenario === "partial" || record.status === "部分入库";
  const finished = record.status === "已入库";

  function handleReceive() {
    if (finished) {
      setNotice({
        tone: "warning",
        title: "无需重复收货",
        description: "当前入库通知单已全部入库，无需再次收货。",
      });
      return;
    }

    if (closed) {
      setNotice({
        tone: "error",
        title: "操作被拦截",
        description: "已取消的入库通知单不允许收货，请先确认单据状态。",
      });
      return;
    }

    onReceive(record.id);
    setNotice({
      tone: "success",
      title: "收货完成",
      description: "入库收货已执行，通知单状态已更新为已入库。",
    });
  }

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="详情页" items={inboundDetailTabs} value={scenario} onChange={onScenarioChange} />
      <PageHeader title="入库通知单详情" description="详情页展示入库通知单的收货状态、商品明细、关联单据和操作日志。" />

      <section className="detail-hero">
        <div className="detail-hero-main">
          <div className="detail-hero-title-row">
            <h2 className="page-title">{record.id}</h2>
            {statusBadge(closed ? "已取消" : record.status)}
            <Badge tone="draft">{record.organization}</Badge>
          </div>
          <div className="detail-hero-meta">
            <span>采购单号：{record.poId}</span>
            <span>供应商：{record.supplier}</span>
            <span>创建人：{record.owner}</span>
            <span>创建时间：{record.createdAt}</span>
          </div>
          {record.checkinTime ? (
            <div className="mt-2 flex items-center gap-3 rounded-sm bg-success-subtle px-3 py-1.5 text-small text-success">
              <span>✅ {record.checkinTime} · {record.checkinDriver ?? "司机"}已签到</span>
              {record.checkinPhone ? <span>电话：{record.checkinPhone}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="detail-hero-actions">
          <Button variant="primary" onClick={handleReceive} disabled={closed || finished}>
            确认收货
          </Button>
          <Button disabled={closed || finished}>取消</Button>
        </div>
      </section>

      <StatusNotice notice={notice} />

      {partial ? (
        <StatusNotice
          notice={{
            tone: "warning",
            title: "部分入库",
            description: "当前通知单存在未收齐的明细行，请跟进剩余到货计划并及时完成收货。",
          }}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="基本信息">
          <InfoGrid
            items={[
              ["通知单号", record.id],
              ["采购单号", record.poId],
              ["业务类型", record.type],
              ["供应商", record.supplier],
              ["仓库", record.warehouse],
              ["采购组织", record.organization],
              ["状态", record.status],
              ["预计到货日", record.eta],
              ...(record.checkinTime
                ? [
                    ["签到时间", record.checkinTime],
                    ["签到司机", record.checkinDriver ?? "-"],
                    ["签到电话", record.checkinPhone ?? "-"],
                  ] as const
                : []),
            ]}
          />
        </Card>
        <Card title="制单与数量信息">
          <InfoGrid
            items={[
              ["创建人", record.owner],
              ["创建时间", record.createdAt],
              ["通知数量", record.totalQty],
              ["已收数量", record.receivedQty],
              ["备注", record.remark || "-"],
            ]}
          />
        </Card>
      </div>

      <Card title="Tab区">
        <Tabs
          items={[
            { label: "商品明细", value: "items" },
            { label: "关联单据", value: "related" },
            { label: "操作日志", value: "logs" },
            { label: "审批记录", value: "approvals" },
          ]}
          value={activeTab}
          onChange={onTabChange}
        />

        <div className="mt-4">
          {activeTab === "items" ? <LineItemsTable /> : null}
          {activeTab === "related" ? <RelatedDocumentsTable /> : null}
          {activeTab === "logs" ? (
            <Timeline
              items={[
                ...(record.checkinTime
                  ? [
                      {
                        id: `${record.checkinTime}-driver-checkin`,
                        time: record.checkinTime,
                        title: `${record.checkinDriver ?? "司机"} · 司机签到`,
                        description: `司机已到仓签到，签到电话：${record.checkinPhone ?? "-"}`,
                        tone: "success" as const,
                        meta: "签到完成",
                      },
                    ]
                  : []),
                ...inboundOperationLogs.map((item) => ({
                  id: `${item.time}-${item.action}`,
                  time: item.time,
                  title: `${item.actor} · ${item.action}`,
                  description: item.remark ?? `处理结果：${item.result}`,
                  tone:
                    item.result === "成功"
                      ? ("success" as const)
                      : item.result.includes("失败")
                        ? ("error" as const)
                        : ("default" as const),
                  meta: `处理结果：${item.result}`,
                })),
              ]}
            />
          ) : null}
          {activeTab === "approvals" ? <ApprovalTable /> : null}
        </div>
      </Card>
    </div>
  );
}

function LineItemsTable() {
  return (
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
            <th>含税单价</th>
            <th>税率</th>
            <th>价税合计</th>
          </tr>
        </thead>
        <tbody>
          {inboundLineItems.map((item) => (
            <tr key={item.sku}>
              <td>{item.sku}</td>
              <td>{item.name}</td>
              <td>{item.spec}</td>
              <td>{item.unit}</td>
              <td className="tabular-nums">{item.notifyQty}</td>
              <td className="tabular-nums">{item.receivedQty}</td>
              <td className="tabular-nums">{item.price}</td>
              <td>{item.taxRate}</td>
              <td className="tabular-nums">{item.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </HorizontalScrollArea>
  );
}

function RelatedDocumentsTable() {
  return (
    <HorizontalScrollArea>
      <table>
        <thead>
          <tr>
            <th>关系类型</th>
            <th>单据编号</th>
            <th>单据类型</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {inboundRelatedDocuments.map((item) => (
            <tr key={item.id}>
              <td>{item.relation}</td>
              <td>{item.id}</td>
              <td>{item.type}</td>
              <td>{renderDocStatus(item.status)}</td>
              <td>{item.createdAt}</td>
              <td>
                <button className="text-link" type="button">
                  查看详情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </HorizontalScrollArea>
  );
}

function ApprovalTable() {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>审批节点</th>
            <th>审批人</th>
            <th>审批意见</th>
            <th>审批时间</th>
          </tr>
        </thead>
        <tbody>
          {inboundApprovalLogs.map((item) => (
            <tr key={`${item.node}-${item.time}`}>
              <td>{item.node}</td>
              <td>{item.actor}</td>
              <td>{item.opinion}</td>
              <td>{item.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderDocStatus(status: string) {
  if (status === "已审核" || status === "已审批" || status.includes("完成")) {
    return <Badge tone="success">{status}</Badge>;
  }
  if (status.includes("执行") || status.includes("收货") || status.includes("入库")) {
    return <Badge tone="processing">{status}</Badge>;
  }
  if (status.includes("关闭") || status.includes("取消")) {
    return <Badge tone="closed">{status}</Badge>;
  }
  return <Badge tone="draft">{status}</Badge>;
}

export function InboundNotificationImportModal({
  open,
  stage,
  mode,
  onModeChange,
  onClose,
  onStart,
  onReset,
  onFinish,
}: {
  open: boolean;
  stage: "select" | "loading" | "success" | "partial" | "file-error";
  mode: Exclude<typeof stage, "select" | "loading">;
  onModeChange: (value: Exclude<typeof stage, "select" | "loading">) => void;
  onClose: () => void;
  onStart: () => void;
  onReset: () => void;
  onFinish: (result: Exclude<typeof stage, "select" | "loading">) => void;
}) {
  return (
    <Modal open={open} title="导入入库通知单" onClose={onClose}>
      {stage === "select" ? (
        <ImportSelectStage
          intro={'建议先下载模板，并按「通知数量为整数、预计到货日格式YYYY-MM-DD、供应商与仓库已在系统维护」的规则填写。'}
          templateName="入库通知单导入模板.xlsx"
          templateDescription="包含通知单头信息、商品明细和字段填写说明。"
          modeItems={[
            { label: "全部成功", value: "success" },
            { label: "部分失败", value: "partial" },
            { label: "文件失败", value: "file-error" },
          ]}
          modeValue={mode}
          onModeChange={(value) => onModeChange(value as Exclude<typeof stage, "select" | "loading">)}
          onClose={onClose}
          onStart={onStart}
        />
      ) : null}

      {stage === "loading" ? (
        <ImportLoadingState
          title="正在导入入库通知单数据，请稍候…"
          description="系统会校验通知单号唯一性、供应商映射和仓库权限。"
        />
      ) : null}

      {stage === "success" ? (
        <ImportResultPanel
          tone="success"
          title="导入成功"
          description="全部12条入库通知单已成功导入。"
          metrics={[
            { value: "12", label: "导入总数" },
            { value: "12", label: "成功写入", tone: "success" },
            { value: "0", label: "失败跳过", tone: "error" },
          ]}
          detailColumns={[]}
          detailRows={[]}
          onReset={onReset}
          onClose={() => onFinish("success")}
        />
      ) : null}

      {stage === "partial" ? (
        <ImportResultPanel
          tone="warning"
          title="导入完成（部分失败）"
          description="共12条，成功10条，2条因校验错误被跳过。"
          metrics={[
            { value: "12", label: "导入总数" },
            { value: "10", label: "成功写入", tone: "success" },
            { value: "2", label: "失败跳过", tone: "error" },
          ]}
          detailColumns={[
            { key: "rowNo", label: "行号" },
            { key: "field", label: "字段" },
            { key: "value", label: "填写值" },
            { key: "reason", label: "错误原因" },
          ]}
          detailRows={[
            { id: "3-warehouse", rowNo: "3", field: "仓库", value: "南京冷链仓", reason: "当前用户无该仓库权限" },
            { id: "8-supplier", rowNo: "8", field: "供应商", value: "空白", reason: "供应商不能为空" },
          ]}
          detailAction={<Button size="sm">下载失败数据</Button>}
          onReset={onReset}
          onClose={() => onFinish("partial")}
        />
      ) : null}

      {stage === "file-error" ? (
        <ImportResultPanel
          tone="error"
          title="导入失败"
          description="文件格式错误或模板版本不匹配，请重新下载官方模板后再试。"
          metrics={[
            { value: "0", label: "导入总数" },
            { value: "0", label: "成功写入", tone: "success" },
            { value: "0", label: "失败跳过", tone: "error" },
          ]}
          detailColumns={[]}
          detailRows={[]}
          onReset={onReset}
          onClose={() => onFinish("file-error")}
        />
      ) : null}
    </Modal>
  );
}

export function InboundNotificationExportModal({
  open,
  exportRange,
  exportFormat,
  onRangeChange,
  onFormatChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  exportRange: string;
  exportFormat: string;
  onRangeChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const exportFields = [
    "通知单号",
    "采购单号",
    "供应商",
    "仓库",
    "状态",
    "预计到货日",
    "通知数量",
    "已收数量",
    "采购组织",
    "业务类型",
    "创建人",
    "创建时间",
  ];

  return (
    <Modal open={open} title="导出入库通知单" onClose={onClose}>
      <div className="space-y-5">
        <section>
          <div className="mb-3 text-small text-text-muted">导出范围</div>
          <RadioGroup
            value={exportRange}
            options={[
              { label: "全部数据（当前共8条）", value: "all" },
              { label: "当前筛选结果（5条）", value: "filtered" },
              { label: "仅选中数据（2条）", value: "selected" },
            ]}
            onValueChange={onRangeChange}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between text-small text-text-muted">
            <span>导出字段</span>
            <span>已选{exportFields.length}/{exportFields.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {exportFields.map((field) => (
              <Checkbox
                key={field}
                defaultChecked
                label={field}
                variant="inline"
                containerClassName="rounded-sm border border-border bg-white px-3 py-2 text-small text-text-secondary"
              />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 text-small text-text-muted">文件格式</div>
          <RadioGroup
            value={exportFormat}
            options={[
              { label: "Excel (.xlsx)", value: "xlsx" },
              { label: "CSV (.csv)", value: "csv" },
            ]}
            direction="horizontal"
            variant="card"
            onValueChange={onFormatChange}
          />
        </section>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-small text-text-muted">将导出2条记录，共{exportFields.length}个字段。</span>
          <div className="flex gap-2">
            <Button onClick={onClose}>取消</Button>
            <Button variant="primary" onClick={onConfirm}>
              确认导出
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
