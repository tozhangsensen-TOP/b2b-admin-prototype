import { useState } from "react";
import { Save, Settings2, Layers, Truck, Waves, Users, ClipboardList } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/modal";
import { PageHeader } from "../components/ui/page-header";
import { RadioGroup } from "../components/ui/radio-group";
import { SegmentedControl } from "../components/ui/segmented-control";
import { Select } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  defaultRule,
  getRule,
  setRule,
  type ClaimDimension,
  type ClaimOrder,
  type MergeDimension,
  type PickMode,
  type TransferPickingRule,
  type VehicleDimension,
  type WaveMode,
} from "../data/transfer-picking";

function FieldLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-small font-body-strong text-text-primary">
      {icon}
      {children}
    </div>
  );
}

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

export function TransferPickingRulesPage() {
  const [rule, setLocal] = useState<TransferPickingRule>(() => ({ ...getRule() }));
  const [savedOpen, setSavedOpen] = useState(false);

  function update<K extends keyof TransferPickingRule>(key: K, value: TransferPickingRule[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setRule(rule);
    setSavedOpen(true);
  }

  return (
    <div className="space-y-page-block">
      <PageHeader
        title="调拨拣货规则配置"
        description="合单 / 合车 / 波次 / 拣货模式 / 任务领取 规则全部前端可配置，适配不同货量与场地，不用硬编码。"
        actions={
          <Button variant="primary" onClick={save}>
            <Save className="h-4 w-4" aria-hidden="true" />
            保存配置
          </Button>
        }
      />

      {/* ① 合单规则 */}
      <Card title="① 合单规则" extra={<Layers className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <Row label="启用合单" hint="关闭后每张调拨单独立生成任务，不合并">
          <Switch checked={rule.mergeEnabled} onCheckedChange={(v) => update("mergeEnabled", v)} />
        </Row>
        <div className="h-px bg-border" />
        <Row label="合并维度" hint="决定哪些调拨单可合并为一个大任务">
          <RadioGroup
            direction="horizontal"
            variant="card"
            value={rule.mergeDimension}
            onValueChange={(v) => update("mergeDimension", v as MergeDimension)}
            options={[
              { label: "按 SKU", value: "按SKU" },
              { label: "按 SKU + 批次", value: "按SKU+批次" },
              { label: "按目标仓", value: "按目标仓" },
            ]}
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="自动合并阈值" hint="达到该单量自动合并下单，不足则等待">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={rule.autoMergeThreshold}
              onChange={(e) => update("autoMergeThreshold", Math.max(1, Number(e.target.value) || 1))}
              className="w-28"
            />
            <span className="text-small text-text-secondary">单 / 批</span>
          </div>
        </Row>
        <div className="h-px bg-border" />
        <Row label="保留手动选择合并范围" hint="现场可手动框选单据合并，不被自动规则完全接管">
          <Switch checked={rule.manualMergeSelect} onCheckedChange={(v) => update("manualMergeSelect", v)} />
        </Row>
      </Card>

      {/* ② 合车规则 */}
      <Card title="② 合车规则" extra={<Truck className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <Row label="启用合车" hint="按车次聚合多个任务，一车多单">
          <Switch checked={rule.vehicleEnabled} onCheckedChange={(v) => update("vehicleEnabled", v)} />
        </Row>
        <div className="h-px bg-border" />
        <Row label="合车数上限" hint="每车最大承载任务/单数">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={rule.vehicleCapacity}
              onChange={(e) => update("vehicleCapacity", Math.max(1, Number(e.target.value) || 1))}
              className="w-28"
            />
            <span className="text-small text-text-secondary">单 / 车</span>
          </div>
        </Row>
        <div className="h-px bg-border" />
        <Row label="合车维度" hint="按波次打包成车，或按配送线路打包">
          <SegmentedControl
            items={[
              { label: "按波次", value: "按波次" },
              { label: "按线路", value: "按线路" },
            ]}
            value={rule.vehicleDimension}
            onChange={(v) => update("vehicleDimension", v as VehicleDimension)}
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="满车自动生成车次" hint="达到合车数上限自动生成车次任务">
          <Switch checked={rule.autoGenerateOnFull} onCheckedChange={(v) => update("autoGenerateOnFull", v)} />
        </Row>
      </Card>

      {/* ③ 波次规则 */}
      <Card title="③ 波次规则" extra={<Waves className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <Row label="启用波次" hint="按波次组织调拨拣货任务">
          <Switch checked={rule.waveEnabled} onCheckedChange={(v) => update("waveEnabled", v)} />
        </Row>
        <div className="h-px bg-border" />
        <Row label="波次生成方式">
          <SegmentedControl
            items={[
              { label: "按时间窗", value: "按时间窗" },
              { label: "按单量", value: "按单量" },
            ]}
            value={rule.waveMode}
            onChange={(v) => update("waveMode", v as WaveMode)}
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="波次容量" hint={rule.waveMode === "按时间窗" ? "每隔该分钟生成一个波次" : "累计该单量生成一个波次"}>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={rule.waveValue}
              onChange={(e) => update("waveValue", Math.max(1, Number(e.target.value) || 1))}
              className="w-28"
            />
            <span className="text-small text-text-secondary">{rule.waveMode === "按时间窗" ? "分钟" : "单"}</span>
          </div>
        </Row>
      </Card>

      {/* ④ 拣货模式 */}
      <Card title="④ 拣货模式与协同" extra={<Users className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <Row label="默认拣货模式" hint="创建任务时默认带入，现场可按任务切换">
          <Select
            value={rule.defaultPickMode}
            onValueChange={(v) => update("defaultPickMode", v as PickMode)}
            options={[
              { label: "车统后按店播种（先下架完，再按店播种）", value: "车统后按店播种" },
              { label: "车统边拣边播（下架与播种同步并行）", value: "车统边拣边播" },
              { label: "直接 SKU 播种（按 SKU 直播，不按店聚合）", value: "直接SKU播种" },
            ]}
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="双人两端协同" hint="叉车司机下架 + 分拣员播种 两端独立操作、任务联动">
          <Switch checked={rule.dualPersonCollab} onCheckedChange={(v) => update("dualPersonCollab", v)} />
        </Row>
      </Card>

      {/* ⑤ 任务领取规则 */}
      <Card title="⑤ 任务领取规则" extra={<ClipboardList className="h-4 w-4 text-text-muted" aria-hidden="true" />}>
        <Row label="领取维度" hint="适配合车合单场景，可按整车或整波次合单领取">
          <SegmentedControl
            items={[
              { label: "按车", value: "按车" },
              { label: "按波次", value: "按波次" },
            ]}
            value={rule.claimDimension}
            onChange={(v) => update("claimDimension", v as ClaimDimension)}
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="领取顺序" hint="前端可选，控制待领取任务的呈现与抢占顺序">
          <Select
            value={rule.claimOrder}
            onValueChange={(v) => update("claimOrder", v as ClaimOrder)}
            options={[
              { label: "先到先得", value: "先到先得" },
              { label: "按优先级", value: "按优先级" },
              { label: "按线路", value: "按线路" },
            ]}
          />
        </Row>
        <div className="h-px bg-border" />
        <Row label="PC 端指派任务" hint="关闭后仅靠现场领取，开启后 PC 可直接指派叉车/分拣员">
          <Switch checked={rule.pcAssign} onCheckedChange={(v) => update("pcAssign", v)} />
        </Row>
      </Card>

      <div className="flex items-center justify-between rounded-sm border border-border bg-bg-subtle px-4 py-3">
        <div className="flex items-center gap-2 text-small text-text-secondary">
          <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
          所有规则均为前端配置项，保存后即时生效，适配不同货量与作业场地。
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setLocal({ ...defaultRule })}>恢复默认</Button>
          <Button variant="primary" onClick={save}>
            <Save className="h-4 w-4" aria-hidden="true" />
            保存配置
          </Button>
        </div>
      </div>

      <Modal open={savedOpen} title="配置已保存" onClose={() => setSavedOpen(false)} widthClassName="max-w-[420px]">
        <div className="space-y-3">
          <div className="rounded-sm border border-success bg-success-subtle p-3 text-body text-text-primary">
            调拨拣货规则已保存并即时生效。
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setSavedOpen(false)}>知道了</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* FieldLabel exported for potential reuse */
export { FieldLabel };
