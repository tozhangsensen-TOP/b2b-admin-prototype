import { useMemo, useState } from "react";
import { ClipboardCheck, ClipboardList, RotateCcw } from "lucide-react";
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
import { Select } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";
import { stocktakingLineItemsMap, type StocktakingLineItem, type StocktakingStatus, type StocktakingTaskRow } from "../data/stocktaking-task";

export type StocktakingScenario = "normal" | "loading" | "empty" | "no-result" | "no-auth";

const demoTabs = [
  { label: "正常", value: "normal" },
  { label: "加载中", value: "loading" },
  { label: "空数据", value: "empty" },
  { label: "查询无结果", value: "no-result" },
  { label: "无权限", value: "no-auth" },
] as const;

const statusTabs = [
  { label: "全部", value: "全部" },
  { label: "待盘点", value: "待盘点" },
  { label: "盘点中", value: "盘点中" },
  { label: "待复盘", value: "待复盘" },
  { label: "已完成", value: "已完成" },
] as const;

const warehouseOptions = [
  { label: "全部", value: "全部" },
  { label: "上海生鲜仓", value: "上海生鲜仓" },
  { label: "北京中转仓", value: "北京中转仓" },
  { label: "广州常温仓", value: "广州常温仓" },
  { label: "武汉常温仓", value: "武汉常温仓" },
];

function statusBadge(status: StocktakingStatus) {
  if (status === "已完成") return <Badge tone="success">{status}</Badge>;
  if (status === "待复盘") return <Badge tone="processing">{status}</Badge>;
  if (status === "盘点中") return <Badge tone="pending">{status}</Badge>;
  if (status === "待盘点") return <Badge tone="draft">{status}</Badge>;
  return <Badge tone="closed">{status}</Badge>;
}

function diffBadge(value: number) {
  if (value === 0) return <Badge tone="success">无差异</Badge>;
  if (Math.abs(value) >= 10) return <Badge tone="error">{value}</Badge>;
  return <Badge tone="pending">{value}</Badge>;
}

export function StocktakingTaskPage({
  tasks,
  scenario,
  onScenarioChange,
  onStartCount,
  onSubmitCount,
  onFinishRecount,
}: {
  tasks: StocktakingTaskRow[];
  scenario: StocktakingScenario;
  onScenarioChange: (value: StocktakingScenario) => void;
  onStartCount: (id: string) => void;
  onSubmitCount: (id: string, items: StocktakingLineItem[]) => void;
  onFinishRecount: (id: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [warehouse, setWarehouse] = useState("全部");
  const [activeStatusTab, setActiveStatusTab] = useState("全部");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<StocktakingTaskRow | null>(null);
  const [lineItems, setLineItems] = useState<StocktakingLineItem[]>([]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((row) => {
      if (activeStatusTab !== "全部" && row.status !== activeStatusTab) return false;
      if (keyword && !`${row.id}${row.planName}`.toLowerCase().includes(keyword.toLowerCase())) return false;
      if (warehouse !== "全部" && row.warehouse !== warehouse) return false;
      return true;
    });
  }, [tasks, activeStatusTab, keyword, warehouse]);

  const summary = useMemo(() => {
    const processing = tasks.filter((item) => item.status === "盘点中").length;
    const recount = tasks.filter((item) => item.status === "待复盘").length;
    const diffSku = tasks.filter((item) => item.differenceQty !== 0).length;
    return { processing, recount, diffSku };
  }, [tasks]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const pageRows = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  function handleQuery() {
    setPage(1);
    onScenarioChange(filteredTasks.length ? "normal" : "no-result");
  }

  function handleReset() {
    setKeyword("");
    setWarehouse("全部");
    setPage(1);
    onScenarioChange(tasks.length ? "normal" : "empty");
  }

  function openCount(task: StocktakingTaskRow) {
    setActiveTask(task);
    setLineItems((stocktakingLineItemsMap[task.id] ?? []).map((item) => ({ ...item })));
    setModalOpen(true);
  }

  function startCount(task: StocktakingTaskRow) {
    onStartCount(task.id);
    openCount({ ...task, status: "盘点中" });
  }

  function updateCountQty(sku: string, value: string) {
    const qty = Math.max(0, Number(value) || 0);
    setLineItems((current) => current.map((item) => (item.sku === sku ? { ...item, firstCountQty: qty } : item)));
  }

  function fillBookQty() {
    setLineItems((current) => current.map((item) => ({ ...item, firstCountQty: item.bookQty, reason: "无差异" })));
  }

  function submitCount() {
    if (!activeTask) return;
    onSubmitCount(activeTask.id, lineItems);
    setModalOpen(false);
  }

  return (
    <div className="space-y-page-block">
      <DemoToolbar label="盘点页" items={demoTabs} value={scenario} onChange={onScenarioChange} />
      <PageHeader
        title="库存盘点"
        description="管理全盘、动碰盘与循环盘点任务，记录账实差异并驱动复盘和后续库存调整。"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">盘点中</div>
          <div className="mt-1 text-section-title font-section-title text-link">{summary.processing}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">待复盘</div>
          <div className="mt-1 text-section-title font-section-title text-warning">{summary.recount}</div>
        </div>
        <div className="rounded-sm border border-border bg-white px-4 py-3">
          <div className="text-small text-text-muted">有差异任务</div>
          <div className="mt-1 text-section-title font-section-title text-danger">{summary.diffSku}</div>
        </div>
      </div>

      <Card>
        <div className="query-section-grid">
          <div>
            <div className="field-label">盘点任务</div>
            <Input value={keyword} placeholder="任务号/计划名称" onChange={(event) => setKeyword(event.target.value)} />
          </div>
          <div>
            <div className="field-label">仓库</div>
            <Select value={warehouse} options={warehouseOptions} onValueChange={setWarehouse} />
          </div>
        </div>
        <div className="query-section-actions">
          <Button variant="secondary" onClick={handleReset}>重置</Button>
          <Button variant="primary" onClick={handleQuery}>查询</Button>
        </div>
      </Card>

      {scenario === "no-auth" ? <ExceptionState variant="403" description="当前用户没有库存盘点权限。" primaryAction={<Button variant="primary">联系管理员</Button>} /> : null}
      {scenario === "loading" ? <Card title="加载中"><div className="h-24 animate-pulse rounded-sm bg-bg-subtle" /></Card> : null}
      {scenario === "empty" ? <ExceptionState variant="404" title="空数据" description="当前没有盘点任务。" /> : null}
      {scenario === "no-result" ? <ExceptionState variant="404" title="查询无结果" description="没有符合条件的盘点任务。" primaryAction={<Button variant="primary" onClick={handleReset}>重置条件</Button>} /> : null}

      {scenario === "normal" && filteredTasks.length ? (
        <ListPageMainCard>
          <div className="px-4 pt-3">
            <Tabs items={[...statusTabs]} value={activeStatusTab} onChange={(value) => { setActiveStatusTab(value); setPage(1); }} />
          </div>
          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 150, minWidth: 150 }}>盘点任务号</th>
                  <th style={{ width: 180, minWidth: 180 }}>计划名称</th>
                  <th style={{ width: 120, minWidth: 120 }}>仓库</th>
                  <th style={{ width: 100, minWidth: 100 }}>库区</th>
                  <th style={{ width: 90, minWidth: 90 }}>类型</th>
                  <th style={{ width: 90, minWidth: 90 }}>状态</th>
                  <th style={{ width: 90, minWidth: 90 }}>SKU数</th>
                  <th style={{ width: 110, minWidth: 110 }}>账面数量</th>
                  <th style={{ width: 110, minWidth: 110 }}>实盘数量</th>
                  <th style={{ width: 90, minWidth: 90 }}>差异</th>
                  <th style={{ width: 100, minWidth: 100 }}>负责人</th>
                  <th style={{ width: 190, minWidth: 190 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="tabular-nums text-link">{row.id}</td>
                    <td>{row.planName}</td>
                    <td>{row.warehouse}</td>
                    <td>{row.zone}</td>
                    <td>{row.type}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td className="tabular-nums">{row.skuCount}</td>
                    <td className="tabular-nums">{row.bookQty.toLocaleString()}</td>
                    <td className="tabular-nums">{row.countedQty.toLocaleString()}</td>
                    <td>{diffBadge(row.differenceQty)}</td>
                    <td>{row.owner}</td>
                    <td>
                      <div className="flex items-center gap-actions">
                        {row.status === "待盘点" ? (
                          <Button size="sm" variant="primary" onClick={() => startCount(row)}>
                            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                            开始盘点
                          </Button>
                        ) : null}
                        {row.status === "盘点中" ? (
                          <Button size="sm" variant="primary" onClick={() => openCount(row)}>
                            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            录入
                          </Button>
                        ) : null}
                        {row.status === "待复盘" ? (
                          <Button size="sm" variant="primary" onClick={() => onFinishRecount(row.id)}>
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            完成复盘
                          </Button>
                        ) : null}
                        {row.status === "已完成" ? <Button size="sm" disabled>已完成</Button> : null}
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

      <Modal open={modalOpen} title={activeTask ? `盘点录入 - ${activeTask.id}` : "盘点录入"} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-sm border border-border p-3 text-small text-text-secondary">
            <span>录入实盘数量，提交后系统按差异阈值判断是否进入复盘。</span>
            <Button size="sm" variant="secondary" onClick={fillBookQty}>按账面填充</Button>
          </div>
          <HorizontalScrollArea>
            <table>
              <thead>
                <tr>
                  <th>商品编码</th>
                  <th>商品名称</th>
                  <th>库位</th>
                  <th>批次</th>
                  <th>账面数</th>
                  <th>实盘数</th>
                  <th>差异</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={`${item.sku}-${item.location}`}>
                    <td className="tabular-nums">{item.sku}</td>
                    <td>{item.name}</td>
                    <td>{item.location}</td>
                    <td>{item.lotNo}</td>
                    <td className="tabular-nums">{item.bookQty}</td>
                    <td>
                      <Input className="w-20" type="number" min={0} value={item.firstCountQty || ""} onChange={(event) => updateCountQty(item.sku, event.target.value)} />
                    </td>
                    <td className="tabular-nums">{item.firstCountQty - item.bookQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={submitCount}>提交盘点</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
