import type { ReactNode } from "react";
import { useMemo, useState } from "react";
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
  type TableSortConfig,
  type TableSortState,
  type TableSortType,
  TableHeaderCell,
  getNextTableSortState,
  sortTableRows,
  useTableColumnResize,
} from "../components/ui/table-interactions";
import { Textarea } from "../components/ui/textarea";
import { Tabs } from "../components/ui/tabs";
import { Timeline } from "../components/ui/timeline";
import {
  warehouseExportFields,
  warehouseImportFailures,
  type WarehouseAddress,
  type WarehouseApprovalLog,
  type WarehouseChangeLog,
  type WarehouseOperationLog,
  type WarehouseRecord,
  type WarehouseStatus,
  type WarehouseType,
} from "../data/warehouse-master";

export type WarehouseListScenario = "normal" | "loading" | "empty" | "no-result" | "no-auth";
export type WarehouseEditScenario = "normal" | "duplicate" | "submit-failed" | "conflict" | "read-only";
export type WarehouseDetailScenario = "normal" | "stopped" | "no-auth";
export type WarehouseImportStage = "select" | "loading" | "success" | "partial" | "file-error";
export type WarehouseDetailTab = "contact" | "logs" | "changes" | "approvals";
export type WarehouseNotice = {
  tone: "success" | "warning" | "error";
  title: string;
  description: string;
} | null;

export type WarehouseFormData = {
  code: string;
  name: string;
  type: WarehouseType;
  status: WarehouseStatus;
  area: string;
  temperatureRange: string;
  manager: string;
  operatingHours: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: WarehouseAddress;
  note: string;
};

type FieldOption = { label: string; value: string };

const warehouseListTabs = [
  { label: "正常", value: "normal" },
  { label: "加载中", value: "loading" },
  { label: "空数据", value: "empty" },
  { label: "查询无结果", value: "no-result" },
  { label: "无权限", value: "no-auth" },
] as const;

const warehouseEditTabs = [
  { label: "正常", value: "normal" },
  { label: "名称重复", value: "duplicate" },
  { label: "提交失败", value: "submit-failed" },
  { label: "并发冲突", value: "conflict" },
  { label: "只读", value: "read-only" },
] as const;

const warehouseDetailTabsScenarios = [
  { label: "正常", value: "normal" },
  { label: "已停用", value: "stopped" },
  { label: "无权限", value: "no-auth" },
] as const;

const warehouseTypeOptions: FieldOption[] = [
  { label: "常温仓", value: "常温仓" },
  { label: "冷藏仓", value: "冷藏仓" },
  { label: "冷冻仓", value: "冷冻仓" },
  { label: "恒温仓", value: "恒温仓" },
];

const warehouseStatusOptions: FieldOption[] = [
  { label: "启用", value: "启用" },
  { label: "停用", value: "停用" },
];

const provinceOptions: FieldOption[] = [
  { label: "上海市", value: "上海市" },
  { label: "北京市", value: "北京市" },
  { label: "广东省", value: "广东省" },
  { label: "浙江省", value: "浙江省" },
  { label: "江苏省", value: "江苏省" },
  { label: "湖北省", value: "湖北省" },
];

function createEmptyAddress(): WarehouseAddress {
  return {
    province: "",
    city: "",
    district: "",
    detail: "",
    contact: "",
    phone: "",
    email: "",
  };
}

export function createWarehouseDraft(record?: WarehouseRecord): WarehouseFormData {
  if (record) {
    return {
      code: record.code,
      name: record.name,
      type: record.type,
      status: record.status,
      area: String(record.area),
      temperatureRange: record.temperatureRange,
      manager: record.manager,
      operatingHours: record.operatingHours,
      contactName: record.contactName,
      contactPhone: record.contactPhone,
      contactEmail: record.contactEmail,
      address: { ...record.address },
      note: record.note,
    };
  }
  return {
    code: "",
    name: "",
    type: "常温仓",
    status: "启用",
    area: "",
    temperatureRange: "",
    manager: "",
    operatingHours: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: createEmptyAddress(),
    note: "",
  };
}

function StatusNotice({ notice, action }: { notice: WarehouseNotice; action?: ReactNode }) {
  if (!notice) return null;
  return <Banner tone={notice.tone} title={notice.title} description={notice.description} action={action} />;
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return <DescriptionList items={items.map(([label, value]) => ({ label, value }))} />;
}

function statusBadge(status: WarehouseStatus) {
  if (status === "启用") return <Badge tone="success">{status}</Badge>;
  return <Badge tone="closed">{status}</Badge>;
}

function typeBadge(type: WarehouseType) {
  if (type === "冷藏仓" || type === "冷冻仓") return <Badge tone="processing">{type}</Badge>;
  if (type === "恒温仓") return <Badge tone="pending">{type}</Badge>;
  return <Badge tone="draft">{type}</Badge>;
}

function FormField({
  label,
  value,
  onChange,
  kind = "input",
  options = [],
  placeholder,
  queryColumns,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  kind?: "input" | "select" | "textarea";
  options?: FieldOption[];
  placeholder?: string;
  queryColumns?: 1 | 2;
  readOnly?: boolean;
}) {
  const resolvedPlaceholder = kind === "select" ? "请选择" : "请输入";

  return (
    <div className={queryColumns === 2 ? "xl:col-span-2" : undefined}>
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

function AddressFields({
  address,
  readOnly,
  onChange,
}: {
  address: WarehouseAddress;
  readOnly: boolean;
  onChange: (field: keyof WarehouseAddress, value: string) => void;
}) {
  return (
    <Card title="地址信息">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FormField label="省份" value={address.province} kind="select" options={provinceOptions} readOnly={readOnly} onChange={(value) => onChange("province", value)} />
        <FormField label="城市" value={address.city} readOnly={readOnly} onChange={(value) => onChange("city", value)} />
        <FormField label="区/县" value={address.district} readOnly={readOnly} onChange={(value) => onChange("district", value)} />
        <div className="xl:col-span-2">
          <FormField label="详细地址" value={address.detail} readOnly={readOnly} onChange={(value) => onChange("detail", value)} />
        </div>
        <FormField label="联系人" value={address.contact} readOnly={readOnly} onChange={(value) => onChange("contact", value)} />
        <FormField label="联系电话" value={address.phone} readOnly={readOnly} onChange={(value) => onChange("phone", value)} />
        <FormField label="邮箱" value={address.email} readOnly={readOnly} onChange={(value) => onChange("email", value)} />
      </div>
    </Card>
  );
}

function editScenarioNotice(scenario: WarehouseEditScenario): WarehouseNotice {
  if (scenario === "duplicate") {
    return { tone: "error", title: "保存失败", description: "仓库编码或名称已存在，禁止重复创建。" };
  }
  if (scenario === "submit-failed") {
    return { tone: "error", title: "提交失败", description: "必填项不完整，当前不允许提交审核。" };
  }
  if (scenario === "conflict") {
    return { tone: "warning", title: "并发冲突", description: "记录已被其他用户更新，请刷新后确认最新数据再继续编辑。" };
  }
  return null;
}

/* ============================================================
   LIST PAGE
   ============================================================ */

type WarehouseListFilters = {
  code: string;
  name: string;
  type: string;
  status: string;
};

const defaultListFilters: WarehouseListFilters = {
  code: "",
  name: "",
  type: "全部",
  status: "全部",
};

export function WarehouseListPage({
  records,
  scenario,
  onScenarioChange,
  onOpenCreate,
  onOpenEdit,
  onOpenDetail,
  onOpenImport,
  onOpenExport,
  notice,
  onClearNotice,
}: {
  records: WarehouseRecord[];
  scenario: WarehouseListScenario;
  onScenarioChange: (value: WarehouseListScenario) => void;
  onOpenCreate: () => void;
  onOpenEdit: (code: string) => void;
  onOpenDetail: (code: string) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  notice: WarehouseNotice;
  onClearNotice: () => void;
}) {
  const [draftFilters, setDraftFilters] = useState<WarehouseListFilters>(defaultListFilters);
  const [activeFilters, setActiveFilters] = useState<WarehouseListFilters>(defaultListFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(records.slice(0, 2).map((item) => item.code));
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [sortState, setSortState] = useState<TableSortState<string>>(null);

  const warehouseColumns = useMemo(
    () =>
      [
        { id: "select", label: "选择", group: "系统字段", required: true, defaultFixed: true, width: 56 },
        { id: "code", label: "仓库编码", group: "基本资料", required: true, defaultFixed: true, width: 156 },
        { id: "name", label: "仓库名称", group: "基本资料", defaultFixed: true, width: 180 },
        { id: "type", label: "仓库类型", group: "基本资料", width: 100 },
        { id: "status", label: "状态", group: "基本资料", width: 80 },
        { id: "area", label: "面积(m²)", group: "运营信息", width: 110, sortType: "numeric", defaultVisible: false },
        { id: "temperatureRange", label: "温度范围", group: "运营信息", width: 110 },
        { id: "manager", label: "负责人", group: "运营信息", width: 100 },
        { id: "operatingHours", label: "运营时间", group: "运营信息", width: 110 },
        { id: "contactName", label: "联系人", group: "联系人", width: 100 },
        { id: "contactPhone", label: "联系电话", group: "联系人", width: 130 },
        { id: "address", label: "所在地区", group: "地址", width: 200 },
        { id: "createdAt", label: "创建时间", group: "制单信息", width: 168, sortType: "datetime", getSortValue: (row: WarehouseRecord) => row.createdAt },
        { id: "createdBy", label: "创建人", group: "制单信息", width: 100 },
        { id: "note", label: "备注", group: "其他", defaultVisible: false, width: 200 },
      ] as ColumnSettingsField<WarehouseRecord>[],
    [],
  );

  const {
    state: warehouseColumnState,
    defaultState: warehouseDefaultColumnState,
    applyState: applyWarehouseColumnState,
  } = usePersistedColumnSettings({ storageKey: "warehouse", fields: warehouseColumns });

  const visibleColumns = useMemo(() => {
    return warehouseColumnState.order
      .filter((id) => warehouseColumnState.visible.includes(id))
      .map((id) => warehouseColumns.find((column) => column.id === id))
      .filter((column): column is ColumnSettingsField<WarehouseRecord> => Boolean(column));
  }, [warehouseColumnState.order, warehouseColumnState.visible, warehouseColumns]);

  const sortConfigs = useMemo(() => {
    return warehouseColumns.reduce<Partial<Record<string, TableSortConfig<WarehouseRecord>>>>((configs, column) => {
      if (!("sortType" in column) || !("getSortValue" in column)) {
        return configs;
      }
      const col = column as ColumnSettingsField<WarehouseRecord> & { sortType: TableSortType; getSortValue: (row: WarehouseRecord) => unknown };
      configs[col.id] = { type: col.sortType, getValue: col.getSortValue };
      return configs;
    }, {});
  }, [warehouseColumns]);

  const queryFieldDefs = [
    { key: "code", label: "仓库编码" },
    { key: "name", label: "仓库名称" },
    { key: "type", label: "仓库类型", queryColumns: 1 as const },
    { key: "status", label: "仓库状态", queryColumns: 1 as const },
  ];
  const visibleQueryFields = getVisibleQuerySectionItems(queryFieldDefs, showMoreFilters);
  const visibleQueryFieldKeys = new Set(visibleQueryFields.map((f) => f.key));
  const hasCollapsedQueryFields = hasCollapsedQuerySectionItems(queryFieldDefs);

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      if (activeFilters.code && !row.code.toLowerCase().includes(activeFilters.code.toLowerCase())) return false;
      if (activeFilters.name && !row.name.toLowerCase().includes(activeFilters.name.toLowerCase())) return false;
      if (activeFilters.type !== "全部" && row.type !== activeFilters.type) return false;
      if (activeFilters.status !== "全部" && row.status !== activeFilters.status) return false;
      return true;
    });
  }, [records, activeFilters]);

  const sortedRecords = useMemo(() => sortTableRows(filteredRecords, sortState, sortConfigs), [filteredRecords, sortState, sortConfigs]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const pageRows = sortedRecords.slice((page - 1) * pageSize, page * pageSize);
  const showTable = scenario === "normal";
  const allSelected = pageRows.every((row) => selectedCodes.includes(row.code));
  const someSelected = pageRows.some((row) => selectedCodes.includes(row.code));

  function handleQuery() {
    setActiveFilters(draftFilters);
    setPage(1);
    const nextRows = records.filter((row) => {
      if (draftFilters.code && !row.code.toLowerCase().includes(draftFilters.code.toLowerCase())) return false;
      if (draftFilters.name && !row.name.toLowerCase().includes(draftFilters.name.toLowerCase())) return false;
      if (draftFilters.type !== "全部" && row.type !== draftFilters.type) return false;
      if (draftFilters.status !== "全部" && row.status !== draftFilters.status) return false;
      return true;
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

  function toggleSelect(code: string) {
    setSelectedCodes((current) => (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]));
  }

  function toggleSelectAll() {
    setSelectedCodes((current) => (allSelected ? current.filter((c) => !pageRows.some((r) => r.code === c)) : [...new Set([...current, ...pageRows.map((r) => r.code)])]));
  }

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="列表页" items={warehouseListTabs} value={scenario} onChange={onScenarioChange} />

      <PageHeader
        title="仓库主数据"
        description="维护仓库基本信息，包括仓库类型、温度控制、联系信息等。"
        actions={
          <>
            <Button onClick={onOpenCreate}>新增</Button>
            <Button variant="secondary" onClick={onOpenImport}>导入</Button>
            <Button variant="secondary" onClick={onOpenExport}>导出</Button>
          </>
        }
      />

      <StatusNotice notice={notice} action={notice ? <Button variant="secondary" size="sm" onClick={onClearNotice}>知道了</Button> : undefined} />

      <Card>
        <div className="query-section-grid">
          {visibleQueryFieldKeys.has("code") ? (
            <div>
              <div className="field-label">仓库编码</div>
              <Input value={draftFilters.code} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, code: e.target.value }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("name") ? (
            <div>
              <div className="field-label">仓库名称</div>
              <Input value={draftFilters.name} placeholder="请输入" onChange={(e) => setDraftFilters((f) => ({ ...f, name: e.target.value }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("type") ? (
            <div>
              <div className="field-label">仓库类型</div>
              <Select value={draftFilters.type} options={[{ label: "全部", value: "全部" }, ...warehouseTypeOptions]} placeholder="请选择" onValueChange={(v) => setDraftFilters((f) => ({ ...f, type: v }))} />
            </div>
          ) : null}
          {visibleQueryFieldKeys.has("status") ? (
            <div>
              <div className="field-label">仓库状态</div>
              <Select value={draftFilters.status} options={[{ label: "全部", value: "全部" }, ...warehouseStatusOptions]} placeholder="请选择" onValueChange={(v) => setDraftFilters((f) => ({ ...f, status: v }))} />
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
        <ExceptionState variant="403" description="当前用户没有仓库主数据管理权限，需开通主数据菜单及仓库数据范围权限。" primaryAction={<Button variant="primary">联系管理员</Button>} secondaryAction={<Button>返回首页</Button>} />
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
        <ExceptionState variant="404" title="空数据" description="当前没有仓库主数据记录，请新建仓库。" primaryAction={<Button variant="primary" onClick={onOpenCreate}>新建仓库</Button>} />
      ) : null}

      {scenario === "no-result" ? (
        <ExceptionState variant="404" title="查询无结果" description="没有符合当前筛选条件的仓库，请调整条件后重试。" primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>} secondaryAction={<Button onClick={handleQuery}>重新查询</Button>} />
      ) : null}

      {showTable && sortedRecords.length > 0 ? (
        <ListPageMainCard>
          <ListPageToolbar className="flex items-center justify-between">
            <div className="list-toolbar-group">
              <Checkbox
                variant="plain"
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                onChange={toggleSelectAll}
              />
              <span className="text-small text-text-secondary">
                {selectedCodes.length > 0 ? `已选 ${selectedCodes.length} 项` : "全选"}
              </span>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-small text-text-secondary transition hover:text-text-primary"
              onClick={() => setColumnSettingsOpen(true)}
            >
              <Settings2 aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              列设置
            </button>
          </ListPageToolbar>
          <HorizontalScrollArea>
            <table className={getDensityClassName(warehouseColumnState.density)}>
              <thead>
                <tr>
                  {visibleColumns.map((col) => (
                    <TableHeaderCell
                      key={col.id}
                      column={col}
                      sortState={sortState}
                      onSortChange={(next) => setSortState(next)}
                      minWidth={48}
                    />
                  ))}
                  <th style={{ width: 180, minWidth: 180 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.code}>
                    {visibleColumns.map((col) => (
                      <td key={col.id} className={col.defaultFixed ? "table-fixed-cell" : undefined}>
                        {col.id === "select" ? (
                          <Checkbox variant="plain" checked={selectedCodes.includes(row.code)} onChange={() => toggleSelect(row.code)} />
                        ) : col.id === "code" ? (
                          <span className="text-link cursor-pointer" onClick={() => onOpenDetail(row.code)}>{row.code}</span>
                        ) : col.id === "name" ? (
                          row.name
                        ) : col.id === "type" ? (
                          typeBadge(row.type)
                        ) : col.id === "status" ? (
                          statusBadge(row.status)
                        ) : col.id === "area" ? (
                          <span className="tabular-nums">{row.area.toLocaleString()}</span>
                        ) : col.id === "temperatureRange" ? (
                          row.temperatureRange
                        ) : col.id === "manager" ? (
                          row.manager
                        ) : col.id === "operatingHours" ? (
                          row.operatingHours
                        ) : col.id === "contactName" ? (
                          row.contactName
                        ) : col.id === "contactPhone" ? (
                          row.contactPhone
                        ) : col.id === "address" ? (
                          `${row.address.province} ${row.address.city} ${row.address.district}`
                        ) : col.id === "createdAt" ? (
                          row.createdAt
                        ) : col.id === "createdBy" ? (
                          row.createdBy
                        ) : col.id === "note" ? (
                          <div className="max-w-[200px] truncate" title={row.note}>{row.note || "-"}</div>
                        ) : null}
                      </td>
                    ))}
                    <td>
                      <div className="flex items-center gap-actions">
                        <Button size="sm" variant="secondary" onClick={() => onOpenDetail(row.code)}>查看</Button>
                        <Button size="sm" variant="secondary" onClick={() => onOpenEdit(row.code)}>编辑</Button>
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
            totalCount={sortedRecords.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            showTopBorder
            onPageChange={setPage}
            onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          />
        </ListPageMainCard>
      ) : null}

      <ColumnSettingsModal
        open={columnSettingsOpen}
        title="列设置"
        fields={warehouseColumns}
        state={warehouseColumnState}
        defaultState={warehouseDefaultColumnState}
        onClose={() => setColumnSettingsOpen(false)}
        onApply={applyWarehouseColumnState}
      />
    </div>
  );
}

/* ============================================================
   EDIT / CREATE PAGE
   ============================================================ */

export function WarehouseEditPage({
  mode,
  scenario,
  record,
  existingRecords,
  onScenarioChange,
  onBackToList,
  onSaveDraft,
  onSubmit,
  onOpenDetail,
}: {
  mode: "create" | "edit";
  scenario: WarehouseEditScenario;
  record?: WarehouseRecord;
  existingRecords: WarehouseRecord[];
  onScenarioChange: (value: WarehouseEditScenario) => void;
  onBackToList: () => void;
  onSaveDraft: (draft: WarehouseFormData) => string;
  onSubmit: (draft: WarehouseFormData) => string;
  onOpenDetail: (code: string) => void;
}) {
  const [form, setForm] = useState<WarehouseFormData>(createWarehouseDraft(record));

  function updateField(field: keyof WarehouseFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateAddressField(field: keyof WarehouseAddress, value: string) {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
  }

  function validate(mode: "save" | "submit"): boolean {
    if (mode === "submit") {
      if (!form.name || !form.code) {
        onScenarioChange("submit-failed");
        return false;
      }
    }
    if (existingRecords.some((r) => r.code !== record?.code && (r.code === form.code || r.name === form.name))) {
      onScenarioChange("duplicate");
      return false;
    }
    return true;
  }

  function handleSave() {
    if (!validate("save")) return;
    onSaveDraft(form);
  }

  function handleSubmit() {
    if (!validate("submit")) return;
    onSubmit(form);
  }

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="编辑页" items={warehouseEditTabs} value={scenario} onChange={onScenarioChange} />

      <PageHeader
        title={mode === "create" ? "新建仓库" : "编辑仓库"}
        description={mode === "create" ? "新增仓库主数据，填写仓库基本信息。" : `正在编辑：${record?.name ?? ""}`}
        actions={
          <>
            <Button variant="secondary" onClick={onBackToList}>返回列表</Button>
            {mode === "edit" && record ? (
              <Button variant="secondary" onClick={() => onOpenDetail(record.code)}>查看详情</Button>
            ) : null}
            <Button variant="secondary" onClick={handleSave}>保存草稿</Button>
            <Button variant="primary" onClick={handleSubmit}>提交审核</Button>
          </>
        }
      />

      <StatusNotice notice={editScenarioNotice(scenario)} />

      <Card title="基本信息">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="仓库编码" value={form.code} onChange={(v) => updateField("code", v)} readOnly={mode === "edit"} />
          <FormField label="仓库名称" value={form.name} onChange={(v) => updateField("name", v)} />
          <FormField label="仓库类型" value={form.type} kind="select" options={warehouseTypeOptions} onChange={(v) => updateField("type", v)} />
          <FormField label="温度范围" value={form.temperatureRange} onChange={(v) => updateField("temperatureRange", v)} placeholder="如 2~8°C" />
          <FormField label="仓库面积(m²)" value={form.area} onChange={(v) => updateField("area", v)} placeholder="请输入数字" />
          <FormField label="负责人" value={form.manager} onChange={(v) => updateField("manager", v)} />
          <FormField label="运营时间" value={form.operatingHours} onChange={(v) => updateField("operatingHours", v)} placeholder="如 06:00-22:00" />
          <FormField label="状态" value={form.status} kind="select" options={warehouseStatusOptions} onChange={(v) => updateField("status", v)} />
        </div>
      </Card>

      <Card title="联系信息">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="联系人" value={form.contactName} onChange={(v) => updateField("contactName", v)} />
          <FormField label="联系电话" value={form.contactPhone} onChange={(v) => updateField("contactPhone", v)} />
          <FormField label="联系邮箱" value={form.contactEmail} onChange={(v) => updateField("contactEmail", v)} />
        </div>
      </Card>

      <AddressFields address={form.address} readOnly={false} onChange={updateAddressField} />

      <Card title="备注">
        <FormField label="备注" value={form.note} kind="textarea" queryColumns={2} onChange={(v) => updateField("note", v)} />
      </Card>
    </div>
  );
}

/* ============================================================
   DETAIL PAGE
   ============================================================ */

const detailTabOptions = [
  { label: "联系信息", value: "contact" },
  { label: "操作日志", value: "logs" },
  { label: "变更日志", value: "changes" },
  { label: "审批日志", value: "approvals" },
] as const;

export function WarehouseDetailPage({
  record,
  scenario,
  activeTab,
  onScenarioChange,
  onTabChange,
  onOpenEdit,
  onApprove,
  onRetryPush,
}: {
  record: WarehouseRecord;
  scenario: WarehouseDetailScenario;
  activeTab: WarehouseDetailTab;
  onScenarioChange: (value: WarehouseDetailScenario) => void;
  onTabChange: (value: WarehouseDetailTab) => void;
  onOpenEdit: (code: string) => void;
  onApprove: (code: string) => void;
  onRetryPush: (code: string) => void;
}) {
  function detailScenarioNotice(): WarehouseNotice {
    if (scenario === "stopped") {
      return { tone: "warning", title: "仓库已停用", description: "该仓库当前处于停用状态，无法进行出入库作业。" };
    }
    return null;
  }

  const metaItems: Array<[string, string]> = [
    ["仓库类型", record.type],
    ["仓库状态", record.status],
    ["温度范围", record.temperatureRange],
    ["仓库面积", `${record.area.toLocaleString()} m²`],
    ["负责人", record.manager],
    ["运营时间", record.operatingHours],
    ["创建人", record.createdBy],
    ["创建时间", record.createdAt],
    ["最后更新", record.updatedBy ? `${record.updatedBy} / ${record.updatedAt}` : "-"],
    ["审核人", record.reviewedBy || "-"],
    ["审核时间", record.reviewedAt || "-"],
  ];

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="详情页" items={warehouseDetailTabsScenarios} value={scenario} onChange={onScenarioChange} />

      <PageHeader
        title={record.name}
        description={`编码：${record.code}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => onOpenEdit(record.code)}>编辑</Button>
            {scenario === "normal" ? <Button variant="primary" onClick={() => onApprove(record.code)}>审核</Button> : null}
          </>
        }
      />

      <StatusNotice notice={detailScenarioNotice()} />

      <section className="detail-hero">
        <div className="detail-hero-title-row">
          <span className="page-section-title">{record.code}</span>
          {typeBadge(record.type)}
          {statusBadge(record.status)}
        </div>
        <div className="detail-hero-meta">
          <InfoGrid items={metaItems} />
        </div>
      </section>

      <Card title={record.name}>
        <InfoGrid items={[
          ["仓库编码", record.code],
          ["仓库名称", record.name],
          ["仓库类型", record.type],
          ["温度范围", record.temperatureRange],
          ["仓库面积", `${record.area.toLocaleString()} m²`],
          ["负责人", record.manager],
          ["运营时间", record.operatingHours],
          ["状态", record.status],
          ["备注", record.note || "-"],
        ]} />
      </Card>

      <Tabs items={detailTabOptions} value={activeTab} onChange={(v) => onTabChange(v)} />

      {activeTab === "contact" ? (
        <Card title="联系信息">
          <InfoGrid items={[
            ["联系人", record.contactName],
            ["联系电话", record.contactPhone],
            ["联系邮箱", record.contactEmail || "-"],
            ["省份", record.address.province],
            ["城市", record.address.city],
            ["区/县", record.address.district],
            ["详细地址", record.address.detail],
            ["地址联系人", record.address.contact],
            ["地址电话", record.address.phone],
          ]} />
        </Card>
      ) : null}

      {activeTab === "logs" ? (
        <Card title="操作日志">
          {record.operationLogs.length > 0 ? (
            <Timeline
              items={record.operationLogs.map((log) => ({
                title: `${log.action} - ${log.result}`,
                description: `${log.actor} · ${log.time}${log.remark ? ` · ${log.remark}` : ""}`,
              }))}
            />
          ) : (
            <div className="py-8 text-center text-small text-text-muted">暂无操作日志</div>
          )}
        </Card>
      ) : null}

      {activeTab === "changes" ? (
        <Card title="变更日志">
          {record.changeLogs.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作人</th>
                  <th>变更字段</th>
                  <th>变更前</th>
                  <th>变更后</th>
                </tr>
              </thead>
              <tbody>
                {record.changeLogs.map((log, i) => (
                  <tr key={i}>
                    <td>{log.time}</td>
                    <td>{log.actor}</td>
                    <td>{log.field}</td>
                    <td>{log.before}</td>
                    <td>{log.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-small text-text-muted">暂无变更日志</div>
          )}
        </Card>
      ) : null}

      {activeTab === "approvals" ? (
        <Card title="审批日志">
          {record.approvalLogs.length > 0 ? (
            <Timeline
              items={record.approvalLogs.map((log) => ({
                title: `${log.node} - ${log.result}`,
                description: `${log.actor} · ${log.opinion} · ${log.time}`,
              }))}
            />
          ) : (
            <div className="py-8 text-center text-small text-text-muted">暂无审批日志</div>
          )}
        </Card>
      ) : null}
    </div>
  );
}

/* ============================================================
   IMPORT MODAL
   ============================================================ */

export function WarehouseImportModal({
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
  stage: WarehouseImportStage;
  mode: Exclude<WarehouseImportStage, "select" | "loading">;
  onModeChange: (mode: Exclude<WarehouseImportStage, "select" | "loading">) => void;
  onClose: () => void;
  onStart: () => void;
  onReset: () => void;
  onFinish: (result: "success" | "partial" | "file-error") => void;
}) {
  return (
    <Modal open={open} title="导入仓库主数据" onClose={onClose}>
      {stage === "select" ? (
        <ImportSelectStage
          intro="下载模板并填写仓库数据，支持一次性导入多个仓库。"
          templateName="仓库主数据导入模板.xlsx"
          templateDescription="仓库编码、仓库名称、仓库类型为必填项。"
          modeItems={[
            { label: "全部成功", value: "success" },
            { label: "部分失败", value: "partial" },
            { label: "文件失败", value: "file-error" },
          ]}
          modeValue={mode}
          onModeChange={onModeChange}
          onClose={onClose}
          onStart={onStart}
        />
      ) : stage === "loading" ? (
        <ImportLoadingState title="正在导入仓库数据" description="正在解析与校验仓库数据，请稍候。" />
      ) : stage === "success" ? (
        <ImportResultPanel
          tone="success"
          title="导入完成"
          description="成功导入 3 条仓库主数据。"
          onClose={() => onFinish("success")}
        />
      ) : stage === "partial" ? (
        <ImportResultPanel
          tone="warning"
          title="部分导入成功"
          description="成功导入 2 条，3 条导入失败。"
          failures={warehouseImportFailures}
          onClose={() => onFinish("partial")}
        />
      ) : (
        <ImportResultPanel
          tone="error"
          title="文件解析失败"
          description="文件格式错误，请检查后重新上传。"
          onClose={() => onFinish("file-error")}
        />
      )}
    </Modal>
  );
}

/* ============================================================
   EXPORT MODAL
   ============================================================ */

export function WarehouseExportModal({
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
  return (
    <Modal open={open} title="导出仓库主数据" onClose={onClose}>
      <div className="space-y-5">
        <section>
          <div className="mb-3 text-small text-text-muted">导出范围</div>
          <RadioGroup
            value={exportRange}
            options={[
              { label: "全部数据（当前共4条）", value: "all" },
              { label: "当前筛选结果", value: "filtered" },
              { label: "仅选中数据", value: "selected" },
            ]}
            onValueChange={onRangeChange}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between text-small text-text-muted">
            <span>导出字段</span>
            <span>已选{warehouseExportFields.length}/{warehouseExportFields.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {warehouseExportFields.map((field) => (
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
          <span className="text-small text-text-muted">将导出记录，共{warehouseExportFields.length}个字段。</span>
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
