import { useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { DemoToolbar } from "../components/ui/demo-toolbar";
import { mockDeliveryOrders, type DeliveryOrderInfo, type CheckinResultData } from "../data/driver-checkin";

export type DriverCheckinScenario = "normal" | "no-gps" | "out-of-range" | "duplicate" | "cancelled";

const demoCheckinTabs = [
  { label: "正常签到", value: "normal" },
  { label: "定位失败", value: "no-gps" },
  { label: "超出范围", value: "out-of-range" },
  { label: "重复签到", value: "duplicate" },
  { label: "单据作废", value: "cancelled" },
] as const;

type CheckinFlowScreen = "scan" | "loading" | "order-info" | "success";

const SCAN_DELAY_MS = 1200;
const GPS_DELAY_MS = 800;

const scenarioCheckinData: Record<string, { driverName: string; driverPhone: string }> = {
  normal: { driverName: "张师傅", driverPhone: "139-1234-5678" },
  "no-gps": { driverName: "李司机", driverPhone: "138-5678-1234" },
  "out-of-range": { driverName: "王师傅", driverPhone: "137-1111-2222" },
  duplicate: { driverName: "赵司机", driverPhone: "136-3333-4444" },
  cancelled: { driverName: "刘师傅", driverPhone: "135-5555-6666" },
};

export function DriverCheckinPage({
  scenario,
  onScenarioChange,
  onCheckinComplete,
}: {
  scenario: DriverCheckinScenario;
  onScenarioChange: (value: DriverCheckinScenario) => void;
  onCheckinComplete: (inboundNoticeId: string, data: CheckinResultData) => void;
}) {
  const [screen, setScreen] = useState<CheckinFlowScreen>("scan");
  const [gpsResolved, setGpsResolved] = useState(false);
  const [scanProgress, setScanProgress] = useState(false);
  const [gpsProgress, setGpsProgress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentOrder = useMemo(() => mockDeliveryOrders[0], []);
  const scenarioData = scenarioCheckinData[scenario];

  const driverLatitude = scenario === "out-of-range" ? 31.0734 : 31.0201;
  const driverLongitude = scenario === "out-of-range" ? 121.5834 : 121.5211;
  const distanceMeters = scenario === "out-of-range" ? 6200 : 380;
  const withinRange = distanceMeters <= 1000;

  const gpsDenied = scenario === "no-gps" && gpsResolved === false;
  const isDuplicate = scenario === "duplicate";
  const isCancelled = scenario === "cancelled";

  function resetFlow() {
    setScreen("scan");
    setScanProgress(false);
    setGpsProgress(false);
    setGpsResolved(false);
    setSubmitting(false);
  }

  function handleScan() {
    if (scanProgress) return;
    setScanProgress(true);
    setTimeout(() => {
      if (isCancelled) {
        setScreen("order-info");
        setScanProgress(false);
        return;
      }
      if (isDuplicate) {
        setScreen("order-info");
        setScanProgress(false);
        return;
      }
      setScreen("loading");
      setTimeout(() => {
        setScreen("order-info");
        setScanProgress(false);
        handleSimulateGps();
      }, SCAN_DELAY_MS);
    }, 600);
  }

  function handleSimulateGps() {
    setGpsProgress(true);
    setTimeout(() => {
      setGpsResolved(true);
      setGpsProgress(false);
    }, GPS_DELAY_MS);
  }

  function handleCheckin() {
    if (submitting) return;
    setSubmitting(true);

    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const checkinTime = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

    setTimeout(() => {
      const result: CheckinResultData = {
        driverName: scenarioData.driverName,
        driverPhone: scenarioData.driverPhone,
        checkinTime,
        checkinLatitude: driverLatitude,
        checkinLongitude: driverLongitude,
        checkinAddress: "上海市浦东新区临港物流园区A区2号门",
        distance: distanceMeters,
      };
      onCheckinComplete(currentOrder.inboundNoticeId, result);
      setSubmitting(false);
      setScreen("success");
    }, 1500);
  }

  function renderPhoneScreen() {
    return (
      <div className="mx-auto flex w-full max-w-[375px] flex-col overflow-hidden rounded-[32px] border-2 border-border bg-white shadow-lg">
        {/* Dynamic Island */}
        <div className="flex justify-center pt-2">
          <div className="h-6 w-28 rounded-full bg-black" />
        </div>
        <div className="flex min-h-[640px] flex-col px-4 pb-6 pt-2">
          {renderScreenContent()}
        </div>
      </div>
    );
  }

  function renderScreenContent() {
    if (screen === "loading") {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="text-body text-text-secondary">正在加载单据信息…</div>
        </div>
      );
    }

    if (screen === "success") {
      return renderSuccessScreen();
    }

    if (screen === "scan") {
      return renderScanScreen();
    }

    return renderOrderInfoScreen();
  }

  function renderScanScreen() {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="text-center">
          <div className="text-body-lg font-body-strong text-text-primary">司机签到</div>
          <div className="mt-1 text-small text-text-muted">请扫描发货单二维码进行签到</div>
        </div>

        {/* QR scanner frame */}
        <div className="relative flex h-52 w-52 items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary-subtle/20">
          <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-primary rounded-tl-lg" />
          <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-primary rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
          <div className="text-center">
            <div className="text-5xl text-primary/60">≡≡≡</div>
            <div className="mt-2 text-mini text-text-muted">二维码模拟区域</div>
          </div>
        </div>

        <Button disabled={scanProgress} onClick={handleScan}>
          {scanProgress ? "解析中…" : "模拟扫码"}
        </Button>

        <div className="rounded-sm bg-bg-subtle px-4 py-2 text-small text-text-muted">
          <div>发货单号：{currentOrder.deliveryOrderNo}</div>
        </div>
      </div>
    );
  }

  function renderOrderInfoScreen() {
    const warehouse = currentOrder.warehouse;

    if (isCancelled) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="text-4xl">⛔</div>
          <div className="text-body-lg font-body-strong text-text-primary">单据已作废</div>
          <div className="text-center text-body text-text-secondary">
            当前发货单已作废，无法签到
          </div>
          <Button variant="secondary" onClick={resetFlow}>返回</Button>
        </div>
      );
    }

    if (isDuplicate) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="text-4xl">⚠️</div>
          <div className="text-body-lg font-body-strong text-text-primary">已签到</div>
          <div className="text-center text-body text-text-secondary">
            当前单据已完成签到，请勿重复操作
          </div>
          <Button variant="secondary" onClick={resetFlow}>返回</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col gap-4">
        {/* Supplier info */}
        <div>
          <div className="text-xs text-text-muted">供应商</div>
          <div className="text-body font-body-strong text-text-primary">{currentOrder.supplierName}</div>
        </div>

        {/* Warehouse info */}
        <div className="rounded-sm border border-border bg-bg-subtle p-3 text-small text-text-secondary">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span className="text-text-muted">仓库</span><span>{warehouse.name}</span>
            <span className="text-text-muted">地址</span><span className="truncate">{warehouse.address}</span>
            <span className="text-text-muted">联系人</span><span>{warehouse.contact}</span>
            <span className="text-text-muted">电话</span><span>{warehouse.phone}</span>
            <span className="text-text-muted">送货日期</span><span>{currentOrder.requiredDeliveryDate}</span>
          </div>
        </div>

        {/* GPS status */}
        {gpsProgress ? (
          <div className="flex items-center gap-2 rounded-sm bg-bg-subtle px-3 py-2 text-small text-text-secondary">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            正在获取定位…
          </div>
        ) : gpsDenied ? (
          <div className="rounded-sm bg-danger-subtle px-3 py-2 text-small text-danger">
            请开启手机定位权限并允许获取位置，若无法操作请联系仓库联系人 {warehouse.contact} 电话 {warehouse.phone}
          </div>
        ) : withinRange ? (
          <div className="flex items-center gap-2 rounded-sm bg-success-subtle px-3 py-2 text-small text-success">
            <span>✅</span>
            <span>您已在收货范围内（距仓库约{distanceMeters}m）</span>
          </div>
        ) : (
          <div className="rounded-sm bg-warning-subtle px-3 py-2 text-small text-warning">
            您当前不在订单收货地址范围内，请确认位置（距仓库约{(distanceMeters / 1000).toFixed(1)}km）
          </div>
        )}

        {/* Items list */}
        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-sm bg-bg-subtle px-3 py-2 text-small font-body-strong text-text-primary"
          >
            货品清单（{currentOrder.items.length}项）
          </button>
          <div className="mt-1 space-y-1">
            {currentOrder.items.map((item) => (
              <div key={item.sku} className="flex items-center justify-between rounded-sm border border-border px-3 py-1.5 text-small">
                <span className="text-text-primary">{item.name}</span>
                <span className="text-text-muted">{item.spec} · {item.qty}{item.unit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button
            variant="primary"
            disabled={!withinRange || gpsDenied || isDuplicate || isCancelled || submitting}
            onClick={handleCheckin}
            className="w-full"
          >
            {submitting ? "签到投单中…" : "签到并投单"}
          </Button>
          <Button variant="secondary" onClick={resetFlow} className="w-full">
            重新扫码
          </Button>
        </div>
      </div>
    );
  }

  function renderSuccessScreen() {
    const warehouse = currentOrder.warehouse;
    return (
      <div className="flex flex-1 flex-col items-center gap-4 pt-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle">
          <span className="text-3xl">✅</span>
        </div>
        <div className="text-body-lg font-body-strong text-text-primary">签到成功</div>

        <div className="w-full rounded-sm border border-border bg-bg-subtle p-3 text-small text-text-secondary">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span className="text-text-muted">发货单号</span><span className="tabular-nums">{currentOrder.deliveryOrderNo}</span>
            <span className="text-text-muted">签到时间</span><span className="tabular-nums">{new Date().toLocaleString("zh-CN", { hour12: false })}</span>
            <span className="text-text-muted">签到地址</span><span className="truncate">上海市浦东新区临港物流园区A区2号门</span>
            <span className="text-text-muted">仓库地址</span><span className="truncate">{warehouse.address}</span>
            <span className="text-text-muted">仓库联系人</span><span>{warehouse.contact}</span>
            <span className="text-text-muted">仓库电话</span><span>{warehouse.phone}</span>
          </div>
        </div>

        <div className="w-full rounded-sm bg-success-subtle px-3 py-2 text-small text-success">
          签到信息已同步至仓储系统
        </div>

        <Button variant="secondary" onClick={resetFlow} className="mt-2 w-full">
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-page-block">
      <DemoToolbar
        label="司机签到"
        items={demoCheckinTabs}
        value={scenario}
        onChange={(v) => {
          onScenarioChange(v as DriverCheckinScenario);
          resetFlow();
        }}
      />

      <PageHeader
        title="司机扫码签到"
        description="供应商司机到仓后扫描发货单二维码，自动获取定位校验距离并发起签到。签到时间回写入库通知单。"
      />

      <Card title="H5签到模拟">
        <div className="flex justify-center py-4">
          {renderPhoneScreen()}
        </div>
      </Card>

      <Card title="签到流程说明">
        <div className="grid gap-4 text-small text-text-secondary xl:grid-cols-3">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-small font-body-strong text-primary">1</span>
            <div>
              <div className="font-body-strong text-text-primary">扫描二维码</div>
              <div className="mt-1">SRM发货单自带二维码，司机微信扫码自动解析发货单号</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-small font-body-strong text-primary">2</span>
            <div>
              <div className="font-body-strong text-text-primary">定位校验</div>
              <div className="mt-1">自动获取GPS定位，校验与仓库距离≤1km方可签到</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-small font-body-strong text-primary">3</span>
            <div>
              <div className="font-body-strong text-text-primary">签到同步</div>
              <div className="mt-1">签到数据实时同步TMS→WMS，入库通知单时间轴记录签到时间</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <p className="page-description">{description}</p>
    </div>
  );
}
