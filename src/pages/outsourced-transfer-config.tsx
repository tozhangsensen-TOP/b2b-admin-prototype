import { useState } from "react";
import { Save, CalendarClock, Layers, Package, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PageHeader } from "../components/ui/page-header";
import { RadioGroup } from "../components/ui/radio-group";
import { Switch } from "../components/ui/switch";
import { mockSkuList } from "../data/outsourced-transfer-suggestions";

type FloatingAlertInput = {
  tone: "success" | "info" | "warning" | "error";
  title: string;
  description?: string;
};

type ScheduleFreq = "daily" | "weekly" | "monthly";

type SkuOverride = {
  skuCode: string;
  enabled: boolean;
  highDays: string;
  midDays: string;
  lowDays: string;
  safetyDays: string;
};

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-3 md:grid-cols-[200px_1fr] md:items-center">
      <div>
        <div className="text-body text-text-primary">{label}</div>
        {hint ? <div className="mt-0.5 text-small text-text-muted">{hint}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

const weekDayOptions = [
  { v: 1, label: "一" },
  { v: 2, label: "二" },
  { v: 3, label: "三" },
  { v: 4, label: "四" },
  { v: 5, label: "五" },
  { v: 6, label: "六" },
  { v: 7, label: "日" },
];

export function OutsourcedTransferConfigPage({
  onShowAlert,
}: {
  onShowAlert?: (input: FloatingAlertInput) => void;
}) {
  // 定时生成配置
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleFreq, setScheduleFreq] = useState<ScheduleFreq>("daily");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [scheduleTime, setScheduleTime] = useState("08:00");

  // 库存周转 · 第 1 层（全局）
  const [safetyStockDays, setSafetyStockDays] = useState(7);
  const [highPriorityMaxDays, setHighPriorityMaxDays] = useState(2);
  const [midPriorityMaxDays, setMidPriorityMaxDays] = useState(4);
  const [lowPriorityMinDays, setLowPriorityMinDays] = useState(5);

  // 库存周转 · 第 2 层（SKU 覆盖）
  const [skuOverrides, setSkuOverrides] = useState<SkuOverride[]>(
    mockSkuList.map((sku) => ({
      skuCode: sku.skuCode,
      enabled: false,
      highDays: "",
      midDays: "",
      lowDays: "",
      safetyDays: "",
    })),
  );

  // 异常与批次规则
  const [abnormalSalesEnabled, setAbnormalSalesEnabled] = useState(true);
  const [fifoBatchEnabled, setFifoBatchEnabled] = useState(true);

  function updateSku(skuCode: string, patch: Partial<SkuOverride>) {
    setSkuOverrides((prev) => prev.map((row) => (row.skuCode === skuCode ? { ...row, ...patch } : row)));
  }

  function toggleWeeklyDay(day: number) {
    setWeeklyDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  function handleSave() {
    onShowAlert?.({ tone: "success", title: "配置已保存", description: "外租库转拨配置已更新，将影响后续自动生成。" });
  }

  const freqLabel =
    scheduleFreq === "daily" ? "每日" : scheduleFreq === "weekly" ? "每周" : "每月";
  const scheduleSummary = scheduleEnabled
    ? scheduleFreq === "daily"
      ? `每日 ${scheduleTime}`
      : scheduleFreq === "weekly"
        ? `每周 ${weeklyDays.map((d) => weekDayOptions.find((o) => o.v === d)?.label).join("、")} ${scheduleTime}`
        : `每月 ${monthlyDay} 号 ${scheduleTime}`
    : "已停用";

  return (
    <div className="space-y-page-block">
      <PageHeader
        title="外租库转拨配置"
        description={`当前定时生成：${scheduleSummary}。库存周转优先级：未做 SKU 覆盖的商品默认使用第 1 层全局配置，已覆盖商品按第 2 层取值。`}
        actions={
          <Button variant="primary" onClick={handleSave}>
            <Save className="h-4 w-4" aria-hidden="true" />
            保存配置
          </Button>
        }
      />

      {/* ① 定时生成配置 */}
      <Card title="① 定时生成配置" extra={<CalendarClock className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <Row label="启用定时生成" hint="关闭后将不再按计划自动生成调拨建议">
          <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
        </Row>
        <div className="h-px bg-border" />
        <Row label="生成频率" hint="支持每天、每周指定星期、每月指定日期">
          <RadioGroup
            direction="horizontal"
            value={scheduleFreq}
            onValueChange={(v) => setScheduleFreq(v as ScheduleFreq)}
            options={[
              { label: "每天", value: "daily" },
              { label: "每周", value: "weekly" },
              { label: "每月", value: "monthly" },
            ]}
          />
        </Row>
        <div className="h-px bg-border" />
        {scheduleFreq === "weekly" ? (
          <Row label="每周几" hint="多选，至少选择一天">
            <div className="flex flex-wrap gap-2">
              {weekDayOptions.map((d) => {
                const checked = weeklyDays.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => toggleWeeklyDay(d.v)}
                    className={`h-8 w-8 rounded-sm border text-mini transition-colors ${
                      checked
                        ? "bg-primary border-primary text-white"
                        : "bg-white border-border text-text-primary hover:border-primary"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Row>
        ) : scheduleFreq === "monthly" ? (
          <Row label="每月几号" hint="取值范围 1-28，避免小月无此日期">
            <Input
              type="number"
              min={1}
              max={28}
              value={monthlyDay}
              onChange={(e) => setMonthlyDay(Number(e.target.value))}
              className="w-32"
            />
          </Row>
        ) : null}
        <div className="h-px bg-border" />
        <Row label="计划生成时间" hint="每天 / 每周指定日 / 每月指定日在此时刻生成建议">
          <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-40" />
        </Row>
      </Card>

      {/* ② 库存周转配置 · 第 1 层（全局） */}
      <Card title="② 库存周转配置 · 第 1 层（全局）" extra={<Layers className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <Row label="安全库存天数" hint="库存可覆盖天数低于该值时视为库存不足，建议补库">
          <Input
            type="number"
            min={0}
            value={safetyStockDays}
            onChange={(e) => setSafetyStockDays(Number(e.target.value))}
            className="w-32"
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="高优先级阈值" hint="库存覆盖天数不高于该值时，标记为高优先级">
          <Input
            type="number"
            min={0}
            value={highPriorityMaxDays}
            onChange={(e) => setHighPriorityMaxDays(Number(e.target.value))}
            className="w-32"
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="中优先级阈值" hint="高于高优先级阈值、且不高于该值时，标记为中优先级">
          <Input
            type="number"
            min={0}
            value={midPriorityMaxDays}
            onChange={(e) => setMidPriorityMaxDays(Number(e.target.value))}
            className="w-32"
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="低优先级阈值" hint="库存覆盖天数不低于该值时，标记为低优先级">
          <Input
            type="number"
            min={0}
            value={lowPriorityMinDays}
            onChange={(e) => setLowPriorityMinDays(Number(e.target.value))}
            className="w-32"
          />
        </Row>
      </Card>

      {/* ③ 库存周转配置 · 第 2 层（SKU 覆盖） */}
      <Card title="③ 库存周转配置 · 第 2 层（SKU 覆盖）" extra={<Package className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <div className="mb-3 rounded-sm border border-border bg-bg-subtle px-3 py-2 text-mini text-text-muted">
          未开启覆盖的 SKU 默认使用第 1 层全局配置；开启覆盖后，该 SKU 的优先级阈值取第 2 层填写值，留空则沿用全局值。
        </div>
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-subtle text-mini text-text-muted">
                <th className="px-3 py-2 font-medium">SKU 编码</th>
                <th className="px-3 py-2 font-medium">SKU 名称</th>
                <th className="px-3 py-2 font-medium">覆盖全局</th>
                <th className="px-3 py-2 font-medium">安全库存（天）</th>
                <th className="px-3 py-2 font-medium">高阈值（天）</th>
                <th className="px-3 py-2 font-medium">中阈值（天）</th>
                <th className="px-3 py-2 font-medium">低阈值（天）</th>
              </tr>
            </thead>
            <tbody>
              {skuOverrides.map((row) => {
                const sku = mockSkuList.find((s) => s.skuCode === row.skuCode);
                return (
                  <tr key={row.skuCode} className="border-t border-border">
                    <td className="px-3 py-2 text-small text-text-primary whitespace-nowrap">{row.skuCode}</td>
                    <td className="px-3 py-2 text-small text-text-primary whitespace-nowrap">{sku?.skuName ?? "-"}</td>
                    <td className="px-3 py-2">
                      <Switch
                        checked={row.enabled}
                        checkedLabel="覆盖"
                        uncheckedLabel="全局"
                        onCheckedChange={(checked) => updateSku(row.skuCode, { enabled: checked })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        disabled={!row.enabled}
                        value={row.enabled ? row.safetyDays : safetyStockDays}
                        onChange={(e) => updateSku(row.skuCode, { safetyDays: e.target.value })}
                        className="w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        disabled={!row.enabled}
                        value={row.enabled ? row.highDays : highPriorityMaxDays}
                        onChange={(e) => updateSku(row.skuCode, { highDays: e.target.value })}
                        className="w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        disabled={!row.enabled}
                        value={row.enabled ? row.midDays : midPriorityMaxDays}
                        onChange={(e) => updateSku(row.skuCode, { midDays: e.target.value })}
                        className="w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        disabled={!row.enabled}
                        value={row.enabled ? row.lowDays : lowPriorityMinDays}
                        onChange={(e) => updateSku(row.skuCode, { lowDays: e.target.value })}
                        className="w-24"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ④ 异常与批次规则 */}
      <Card title="④ 异常与批次规则" extra={<AlertTriangle className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <Row
          label="销量异常检查"
          hint="日均销量为 0 但外租库有可用库存时，标记为「销量异常」。此类商品无历史销售记录，可能涉及新品或 AB 物料，提交前必须逐条人工确认"
        >
          <Switch checked={abnormalSalesEnabled} onCheckedChange={setAbnormalSalesEnabled} />
        </Row>
        <div className="h-px bg-border" />
        <Row
          label="批次先进先出检查"
          hint="本库库存批次优于外库时，按先进先出规则优先从外租库调拨，先消耗外库库存、保留本库好批次"
        >
          <Switch checked={fifoBatchEnabled} onCheckedChange={setFifoBatchEnabled} />
        </Row>
      </Card>
    </div>
  );
}
