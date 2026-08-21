import type { CSSProperties } from "react";
import { useState, useMemo } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { FloatingAlert, type FloatingAlertInput } from "../components/ui/floating-alert";
import { HorizontalScrollArea } from "../components/ui/horizontal-scroll-area";
import { Input } from "../components/ui/input";
import { ListPageMainCard } from "../components/ui/list-page-layout";
import { Modal } from "../components/ui/modal";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { TableHeaderCell } from "../components/ui/table-interactions";
import {
  type DemandType,
  type Priority,
  computeDemandType,
  computePriority,
  type TransferSuggestion,
  type TransferSuggestionItem,
  mockSkuList,
} from "../data/outsourced-transfer-suggestions";

type SkuOption = { label: string; value: string };

const skuOptions: SkuOption[] = mockSkuList.map(sku => ({
  label: `${sku.skuCode} ${sku.skuName}`,
  value: sku.skuCode,
}));

function createTypeLabel(createType: string) {
  return createType === "auto" ? "自动生成" : "手动创建";
}

function numberText(value: number) {
  return value.toLocaleString("zh-CN");
}

function demandTypeStyle(type: DemandType): CSSProperties {
  if (type === "发运需求") return { color: "var(--info)", background: "var(--info-subtle)", borderColor: "#93c5fd" };
  if (type === "销量异常") return { color: "var(--danger)", background: "var(--tag-error-bg)", borderColor: "var(--tag-error-border)" };
  if (type === "批次效期") return { color: "#7c3aed", background: "#f5f3ff", borderColor: "#c4b5fd" };
  return { color: "var(--warning)", background: "var(--warning-subtle)", borderColor: "var(--tag-pending-border)" };
}

function priorityStyle(priority: Priority): CSSProperties {
  if (priority === "高") return { color: "var(--danger)", background: "var(--tag-error-bg)", borderColor: "var(--tag-error-border)" };
  if (priority === "中") return { color: "var(--warning)", background: "var(--warning-subtle)", borderColor: "var(--tag-pending-border)" };
  return { color: "var(--text-secondary)", background: "var(--bg-subtle)", borderColor: "var(--border-default)" };
}

export function OutsourcedTransferSuggestionDetailPage({
  suggestion,
  onBack,
  onShowAlert,
  onOpenConfig,
}: {
  suggestion: TransferSuggestion;
  onBack: () => void;
  onShowAlert?: (input: FloatingAlertInput) => void;
  onOpenConfig?: () => void;
}) {
  const [items, setItems] = useState<TransferSuggestionItem[]>([...suggestion.items]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ skuCode: "", qty: "" });
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  // 销量异常商品的人工确认记录（按 SKU 编码，避免行删除后索引漂移）
  const [confirmedSkus, setConfirmedSkus] = useState<Set<string>>(new Set());

  // 展示用默认值（正式配置在「外租库转拨配置」独立页面）
  const scheduleEnabled = true;
  const scheduleFreq: string = "daily";
  const scheduleWeeklyDays: number[] = [1, 2, 3, 4, 5];
  const scheduleMonthlyDay = 1;
  const scheduleTime = "08:00";
  const scheduleLabel = (() => {
    if (!scheduleEnabled) return "已停用";
    if (scheduleFreq === "daily") return `每日 ${scheduleTime}`;
    if (scheduleFreq === "weekly") {
      const map = ["一", "二", "三", "四", "五", "六", "日"];
      const label = scheduleWeeklyDays.map((d) => map[d - 1]).join("/");
      return `每周 ${label} ${scheduleTime}`;
    }
    return `每月 ${scheduleMonthlyDay} 号 ${scheduleTime}`;
  })();

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.itemCount += 1;
        acc.suggestQty += item.suggestQty;
        acc.actualQty += item.actualQty;
        acc.estimatedPallets += item.estimatedPallets;
        acc.volumeCbm += item.volumeCbm;
        return acc;
      },
      { itemCount: 0, suggestQty: 0, actualQty: 0, estimatedPallets: 0, volumeCbm: 0 }
    );
  }, [items]);

  const selectedSummary = useMemo(() => {
    if (selectedItems.size === 0) return { actualQty: 0, estimatedPallets: 0, volumeCbm: 0 };
    return Array.from(selectedItems).reduce(
      (acc, i) => {
        acc.actualQty += items[i].actualQty;
        acc.estimatedPallets += items[i].estimatedPallets;
        acc.volumeCbm += items[i].volumeCbm;
        return acc;
      },
      { actualQty: 0, estimatedPallets: 0, volumeCbm: 0 }
    );
  }, [items, selectedItems]);

  function updateActualQty(index: number, qty: number) {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], actualQty: qty };
      return newItems;
    });
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }

  function toggleSelect(index: number) {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((_, i) => i)));
    }
  }

  function toggleConfirm(skuCode: string) {
    setConfirmedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(skuCode)) {
        next.delete(skuCode);
      } else {
        next.add(skuCode);
      }
      return next;
    });
  }

  const unconfirmedAbnormalItems = items.filter((item) => item.demandType === "销量异常" && !confirmedSkus.has(item.skuCode));

  function handleBatchDelete() {
    setItems(prev => prev.filter((_, i) => !selectedItems.has(i)));
    setSelectedItems(new Set());
    onShowAlert?.({
      tone: "success",
      title: "删除成功",
      description: `已删除 ${selectedItems.size} 个商品`,
    });
  }

  function handleDispatch() {
    const count = selectedItems.size;
    onShowAlert?.({
      tone: "success",
      title: "下发成功",
      description: `已将 ${count} 条明细行下发为短驳任务，涉及数量 ${selectedSummary.actualQty}`,
    });
    setSelectedItems(new Set());
  }

  function handleAddItem() {
    setAddModalOpen(true);
  }

  function handleConfirmAdd() {
    const sku = mockSkuList.find(s => s.skuCode === addForm.skuCode);
    if (!sku) {
      onShowAlert?.({ tone: "error", title: "选择商品", description: "请选择要添加的商品" });
      return;
    }
    const qty = parseInt(addForm.qty, 10);
    if (!qty || qty <= 0) {
      onShowAlert?.({ tone: "error", title: "数量错误", description: "请输入有效数量" });
      return;
    }
    const newItem: TransferSuggestionItem = {
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      mainStock: 0,
      outsourcedStock: qty * 2,
      demandQty: 0,
      dailySales: 10,
      remainingTurnoverDays: 3,
      turnoverDays: 3,
      suggestQty: qty,
      actualQty: qty,
      estimatedPallets: Math.ceil(qty / 50),
      volumeCbm: parseFloat((qty * 0.025).toFixed(2)),
      demandType: computeDemandType(0, 0, { dailySales: 10, outsourcedStock: qty * 2 }),
      priority: computePriority(3),
      priorityRank: 2,
    };
    setItems(prev => [...prev, newItem]);
    setAddForm({ skuCode: "", qty: "" });
    setAddModalOpen(false);
  }

  function handleCancelSuggestion() {
    onShowAlert?.({
      tone: "success",
      title: "取消成功",
      description: `转拨建议 ${suggestion.suggestionNo} 已取消`,
    });
    onBack();
  }

  function handleSubmitTransfer() {
    if (items.length === 0) {
      onShowAlert?.({
        tone: "error",
        title: "提交失败",
        description: "至少需要一个商品才能提交",
      });
      return;
    }
    if (unconfirmedAbnormalItems.length > 0) {
      onShowAlert?.({
        tone: "error",
        title: "存在待确认的销量异常",
        description: `${unconfirmedAbnormalItems.map((item) => item.skuName).join("、")} 无历史销售记录，需逐条确认后才能提交`,
      });
      return;
    }
    const hasInvalidQty = items.some(item => item.actualQty > item.outsourcedStock);
    if (hasInvalidQty) {
      onShowAlert?.({
        tone: "error",
        title: "数量错误",
        description: "实际转拨数量不能超过外租库库存",
      });
      return;
    }
    onShowAlert?.({
      tone: "success",
      title: "提交成功",
      description: `已成功提交转拨建议 ${suggestion.suggestionNo}，共 ${items.length} 个商品，总数量 ${summary.actualQty}`,
    });
    onBack();
  }

  return (
    <div className="space-y-page-block">
      <FloatingAlert notice={null} />
      <PageHeader
        title="转拨建议详情"
        description={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-link hover:underline"
              onClick={onBack}
            >
              <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              返回列表
            </button>
          </div>
        }
      />

      <Card title="建议信息">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-small text-text-muted">建议单号</div>
            <div className="mt-1 text-text-primary font-medium">{suggestion.suggestionNo}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">生成时间</div>
            <div className="mt-1 text-text-primary">{suggestion.createTime}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">状态</div>
            <div className="mt-1">
              <span className={`status-badge ${suggestion.status === "待确认" ? "tone-warning" : suggestion.status === "已确认" ? "tone-success" : "tone-closed"}`}>
                {suggestion.status}
              </span>
            </div>
          </div>
          <div>
            <div className="text-small text-text-muted">生成方式</div>
            <div className="mt-1 text-text-primary">{createTypeLabel(suggestion.createType)}</div>
          </div>
          <div>
            <div className="text-small text-text-muted">定时生成</div>
            <div className="mt-1 flex items-center gap-1">
              <span className={`text-text-primary ${!scheduleEnabled ? "text-text-muted" : ""}`}>{scheduleLabel}</span>
              <button type="button" className="text-link hover:underline" onClick={onOpenConfig}>
                配置
              </button>
            </div>
          </div>
        </div>
      </Card>

      <ListPageMainCard>
        <div className="flex items-center justify-between border-b border-border bg-bg-subtle px-4 py-3">
          <div className="text-medium font-medium text-text-primary">商品清单</div>
          <div className="flex items-center gap-2">
            {selectedItems.size > 0 && (
              <Button variant="secondary" onClick={handleBatchDelete}>
                <Trash2 aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
                批量删除 ({selectedItems.size})
              </Button>
            )}
            <Button variant="secondary" onClick={handleAddItem}>
              <Plus aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
              新增商品
            </Button>
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-3 border-b border-border bg-bg-subtle px-4 py-3 md:grid-cols-[auto_1fr]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-small text-text-muted">优先级按周转天数自动计算：</span>
            <span className="flex items-center gap-1.5 text-small text-text-primary">
              <span
                className="inline-flex h-5 items-center gap-1 px-1.5 text-mini font-medium rounded-sm border"
                style={{ color: "var(--danger)", background: "var(--tag-error-bg)", borderColor: "var(--tag-error-border)" }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" />
                高
              </span>
              <span>周转 &lt;2天</span>
            </span>
            <span className="flex items-center gap-1.5 text-small text-text-primary">
              <span
                className="inline-flex h-5 items-center gap-1 px-1.5 text-mini font-medium rounded-sm border"
                style={{ color: "var(--warning)", background: "var(--warning-subtle)", borderColor: "var(--tag-pending-border)" }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
                中
              </span>
              <span>周转 2-4天</span>
            </span>
            <span className="flex items-center gap-1.5 text-small text-text-primary">
              <span
                className="inline-flex h-5 items-center gap-1 px-1.5 text-mini font-medium rounded-sm border"
                style={{ color: "var(--text-secondary)", background: "var(--bg-subtle)", borderColor: "var(--border-default)" }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--text-muted)" }} />
                低
              </span>
              <span>周转 5-7天</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:border-l md:border-border md:pl-8">
            <span className="text-small text-text-muted">需求类型说明：</span>
            <span className="flex items-center gap-1.5 text-small text-text-primary">
              <span
                className="inline-flex h-5 items-center gap-1 px-1.5 text-mini font-medium rounded-sm border"
                style={{ color: "var(--info)", background: "var(--info-subtle)", borderColor: "#93c5fd" }}
              >
                发运需求
              </span>
              <span>本库库存 &lt; 日均销量</span>
            </span>
            <span className="flex items-center gap-1.5 text-small text-text-primary">
              <span
                className="inline-flex h-5 items-center gap-1 px-1.5 text-mini font-medium rounded-sm border"
                style={{ color: "var(--danger)", background: "var(--tag-error-bg)", borderColor: "var(--tag-error-border)" }}
              >
                销量异常
              </span>
              <span>日销0异常</span>
            </span>
            <span className="flex items-center gap-1.5 text-small text-text-primary">
              <span
                className="inline-flex h-5 items-center gap-1 px-1.5 text-mini font-medium rounded-sm border"
                style={{ color: "#7c3aed", background: "#f5f3ff", borderColor: "#c4b5fd" }}
              >
                批次效期
              </span>
              <span>本库批次优于外库，优先调拨</span>
            </span>
          </div>
        </div>
        <HorizontalScrollArea>
          <table>
            <thead>
              <tr>
                {suggestion.status === "待确认" && (
                  <th className="table-header-cell" style={{ width: 48, minWidth: 48 }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={items.length > 0 && selectedItems.size === items.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <TableHeaderCell label="商品编码" width={140} isFixed={false} showDivider={true} />
                <TableHeaderCell label="商品名称" width={200} isFixed={false} showDivider={true} />
                <TableHeaderCell label="本库库存" width={100} align="right" isFixed={false} showDivider={true} />
                <TableHeaderCell label="日均销量" width={100} align="right" isFixed={false} showDivider={true} />
                <TableHeaderCell label="本库剩余周转天数" width={120} align="right" isFixed={false} showDivider={true} />
                <TableHeaderCell label="外租库库存" width={120} align="right" isFixed={false} showDivider={true} />
                <TableHeaderCell label="需求类型" width={110} isFixed={false} showDivider={true} />
                <TableHeaderCell label="确认状态" width={100} isFixed={false} showDivider={true} />
                <TableHeaderCell label="优先级" width={130} isFixed={false} showDivider={true} />
                <TableHeaderCell label="建议数量" width={120} align="right" isFixed={false} showDivider={true} />
                <TableHeaderCell label="预计托数" width={100} align="right" isFixed={false} showDivider={true} />
                <TableHeaderCell label="体积(m³)" width={110} align="right" isFixed={false} showDivider={true} />
                <TableHeaderCell label="实际数量" width={140} align="right" isFixed={false} showDivider={suggestion.status === "待确认"} />
                {suggestion.status === "待确认" && (
                  <TableHeaderCell label="操作" width={80} isFixed={false} showDivider={false} />
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  {suggestion.status === "待确认" && (
                    <td className="table-data-cell" style={{ width: 48, minWidth: 48 }}>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedItems.has(index)}
                        onChange={() => toggleSelect(index)}
                      />
                    </td>
                  )}
                  <td className="table-data-cell" style={{ width: 140, minWidth: 140 }}>
                    <span className="tabular-nums">{item.skuCode}</span>
                  </td>
                  <td className="table-data-cell" style={{ width: 200, minWidth: 200 }}>
                    {item.skuName}
                  </td>
                  <td className="table-data-cell text-right" style={{ width: 100, minWidth: 100 }}>
                    <span className="tabular-nums">{numberText(item.mainStock)}</span>
                  </td>
                  <td className="table-data-cell text-right" style={{ width: 100, minWidth: 100 }}>
                    <span className="tabular-nums">{numberText(item.dailySales)}</span>
                  </td>
                  <td className="table-data-cell text-right" style={{ width: 120, minWidth: 120 }}>
                    <span
                      className={`tabular-nums font-medium ${item.remainingTurnoverDays < 2 ? "text-danger" : item.remainingTurnoverDays <= 4 ? "text-warning" : ""}`}
                    >
                      {item.remainingTurnoverDays}
                    </span>
                  </td>
                  <td className="table-data-cell text-right" style={{ width: 120, minWidth: 120 }}>
                    <span className="tabular-nums text-text-primary font-medium">{numberText(item.outsourcedStock)}</span>
                  </td>
                  <td className="table-data-cell" style={{ width: 110, minWidth: 110 }}>
                    <span
                      className="inline-flex h-6 items-center gap-1 px-2 text-small font-medium rounded-sm border"
                      style={demandTypeStyle(item.demandType)}
                      title={
                        item.demandType === "发运需求"
                          ? item.demandDays ? `${item.demandDays}天内有发运订单` : "有发运需求"
                          : item.demandType === "销量异常"
                            ? "无历史销售记录，外租库有可用库存，需库房人工确认（可能涉及新品或 AB 物料）"
                            : item.demandType === "批次效期"
                              ? item.batchNote ?? "本库库存批次优于外库，按先进先出优先从外租库调拨"
                              : "库存低于安全库存，建议补库"
                      }
                    >
                      {item.demandType === "发运需求" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5h9.5l-2.5-2M7 10H2.5M2.5 4.5v11h11V7" />
                        </svg>
                      ) : item.demandType === "销量异常" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 2.5 14 13H2L8 2.5Z" />
                          <path strokeLinecap="round" d="M8 6.5v3" />
                          <circle cx="8" cy="11.2" r="0.6" fill="currentColor" stroke="none" />
                        </svg>
                      ) : item.demandType === "批次效期" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0">
                          <circle cx="8" cy="8" r="6" />
                          <path strokeLinecap="round" d="M8 4.5V8l2.2 1.4" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.5 3.5l2.1 2.1M10.4 10.4l2.1 2.1M3.5 12.5l2.1-2.1M10.4 5.6l2.1-2.1" />
                        </svg>
                      )}
                      <span className="truncate">{item.demandType}</span>
                    </span>
                  </td>
                  <td className="table-data-cell" style={{ width: 100, minWidth: 100 }}>
                    {item.demandType === "销量异常" ? (
                      suggestion.status === "待确认" ? (
                        <button
                          type="button"
                          onClick={() => toggleConfirm(item.skuCode)}
                          className="inline-flex h-6 items-center gap-1 rounded-sm border px-2 text-small font-medium transition hover:opacity-80"
                          style={
                            confirmedSkus.has(item.skuCode)
                              ? { color: "var(--success)", background: "var(--success-subtle)", borderColor: "#86efac" }
                              : { color: "var(--warning)", background: "var(--warning-subtle)", borderColor: "var(--tag-pending-border)" }
                          }
                        >
                          {confirmedSkus.has(item.skuCode) ? "已确认" : "待确认"}
                        </button>
                      ) : (
                        <span className="text-mini text-text-muted">{confirmedSkus.has(item.skuCode) ? "已确认" : "未确认"}</span>
                      )
                    ) : (
                      <span className="text-mini text-text-muted">-</span>
                    )}
                  </td>
                  <td className="table-data-cell" style={{ width: 130, minWidth: 130 }}>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex h-6 items-center gap-1 px-2 text-small font-medium rounded-sm border"
                        style={priorityStyle(item.priority)}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: item.priority === "高" ? "var(--danger)" : item.priority === "中" ? "var(--warning)" : "var(--text-muted)" }}
                        />
                        {item.priority}
                      </span>
                    </div>
                    <div
                      className="mt-1 text-mini text-text-muted truncate"
                      style={{ maxWidth: 120 }}
                      title={item.priorityReason}
                    >
                      {item.priorityReason}
                    </div>
                  </td>
                  <td className="table-data-cell text-right" style={{ width: 120, minWidth: 120 }}>
                    <span className="tabular-nums text-text-secondary">{numberText(item.suggestQty)}</span>
                  </td>
                  <td className="table-data-cell text-right" style={{ width: 100, minWidth: 100 }}>
                    <span className="tabular-nums">{item.estimatedPallets}</span>
                  </td>
                  <td className="table-data-cell text-right" style={{ width: 110, minWidth: 110 }}>
                    <span className="tabular-nums">{item.volumeCbm.toFixed(2)}</span>
                  </td>
                  <td className="table-data-cell" style={{ width: 140, minWidth: 140 }}>
                    {suggestion.status === "待确认" ? (
                      <Input
                        type="number"
                        value={String(item.actualQty)}
                        onChange={(e) => updateActualQty(index, parseInt(e.target.value || "0", 10))}
                        className="text-right tabular-nums"
                      />
                    ) : (
                      <span className="tabular-nums text-text-primary font-medium text-right block">
                        {numberText(item.actualQty)}
                      </span>
                    )}
                  </td>
                  {suggestion.status === "待确认" && (
                    <td className="table-data-cell" style={{ width: 80, minWidth: 80 }}>
                      <button
                        type="button"
                        className="text-error hover:text-error/80"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </HorizontalScrollArea>
        <div className="flex items-center justify-between border-t border-border bg-bg-subtle px-4 py-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-text-muted text-small">商品数：</span>
              <span className="text-text-primary font-medium">{summary.itemCount}</span>
            </div>
            <div>
              <span className="text-text-muted text-small">总建议数量：</span>
              <span className="text-text-primary font-medium">{numberText(summary.suggestQty)}</span>
            </div>
            <div>
              <span className="text-text-muted text-small">总实际数量：</span>
              <span className="text-text-primary font-semibold text-lg">{numberText(summary.actualQty)}</span>
            </div>
            <div>
              <span className="text-text-muted text-small">总预计托数：</span>
              <span className="text-text-primary font-medium">{summary.estimatedPallets}</span>
            </div>
            <div>
              <span className="text-text-muted text-small">总体积(m³)：</span>
              <span className="text-text-primary font-medium">{summary.volumeCbm.toFixed(2)}</span>
            </div>
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-4 pl-4 border-l border-border">
                <span className="text-warning text-small font-medium">已选 {selectedItems.size} 行</span>
                <div>
                  <span className="text-text-muted text-small">数量：</span>
                  <span className="text-warning font-medium">{numberText(selectedSummary.actualQty)}</span>
                </div>
                <div>
                  <span className="text-text-muted text-small">托数：</span>
                  <span className="text-warning font-medium">{selectedSummary.estimatedPallets}</span>
                </div>
                <div>
                  <span className="text-text-muted text-small">体积：</span>
                  <span className="text-warning font-medium">{selectedSummary.volumeCbm.toFixed(2)}m³</span>
                </div>
              </div>
            )}
          </div>
          {suggestion.status === "待确认" && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {selectedItems.size > 0 && (
                <Button variant="primary" onClick={handleDispatch}>
                  下发选中明细行短驳
                </Button>
              )}
              <Button onClick={handleCancelSuggestion}>
                取消建议
              </Button>
              <Button variant="primary" onClick={handleSubmitTransfer}>
                确认并提交转拨单
              </Button>
            </div>
          )}
        </div>
      </ListPageMainCard>

      <Modal open={addModalOpen} title="新增商品" onClose={() => setAddModalOpen(false)}>
        <div className="space-y-5">
          <div>
            <div className="field-label">选择商品</div>
            <Select
              options={skuOptions}
              onValueChange={(value) => setAddForm((f) => ({ ...f, skuCode: value }))}
              placeholder="请选择商品"
            />
          </div>
          <div>
            <div className="field-label">转拨数量</div>
            <Input
              type="number"
              value={addForm.qty}
              onChange={(e) => setAddForm((f) => ({ ...f, qty: e.target.value }))}
              placeholder="请输入数量"
            />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button onClick={() => setAddModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleConfirmAdd}>
              确认添加
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
