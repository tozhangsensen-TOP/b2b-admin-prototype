import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download, FileText, MoreHorizontal, Plus, Sparkles, Users, X } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import { PageHeader } from "../components/ui/page-header";

type ShiftKey = "morning" | "mid" | "night" | "off" | "leave";
type ScheduleTab = "cycles" | "calendar" | "strategy" | "people" | "teams" | "shifts" | "stats";

const initialTeams = [
  { id: "pick-1", name: "拣货一组", code: "PICK-01", warehouse: "北京仓", leader: "张三", status: "启用" },
  { id: "pick-2", name: "拣货二组", code: "PICK-02", warehouse: "北京仓", leader: "孙丽", status: "启用" },
  { id: "receive-1", name: "收货一组", code: "RECV-01", warehouse: "北京仓", leader: "王五", status: "启用" },
  { id: "ship-1", name: "发运组", code: "SHIP-01", warehouse: "北京仓", leader: "周强", status: "启用" },
];

const scheduleCycles = [
  { month: "2026-09" as const, label: "2026年9月", status: "published", statusLabel: "已发布", completion: "100%", coverage: "8 / 8", updatedAt: "2026-09-23 16:40", owner: "张主管" },
  { month: "2026-10" as const, label: "2026年10月", status: "draft", statusLabel: "草稿", completion: "0%", coverage: "0 / 8", updatedAt: "尚未排班", owner: "-" },
  { month: "2026-11" as const, label: "2026年11月", status: "not-started", statusLabel: "未开始", completion: "-", coverage: "-", updatedAt: "-", owner: "-" },
  { month: "2026-12" as const, label: "2026年12月", status: "not-started", statusLabel: "未开始", completion: "-", coverage: "-", updatedAt: "-", owner: "-" },
];

type Employee = {
  id: string;
  name: string;
  code: string;
  team: string;
  position: string;
  night: number;
  hours: number;
};

const employees: Employee[] = [
  { id: "zhang", name: "张三", code: "WH-001", team: "拣货一组", position: "拣货员", night: 3, hours: 168 },
  { id: "li", name: "李四", code: "WH-002", team: "拣货一组", position: "拣货员", night: 5, hours: 176 },
  { id: "wang", name: "王五", code: "WH-003", team: "收货一组", position: "收货员", night: 2, hours: 160 },
  { id: "zhao", name: "赵六", code: "WH-004", team: "收货一组", position: "上架员", night: 4, hours: 168 },
  { id: "sun", name: "孙丽", code: "WH-005", team: "拣货二组", position: "复核员", night: 2, hours: 152 },
  { id: "zhou", name: "周强", code: "WH-006", team: "发运组", position: "发运员", night: 3, hours: 160 },
  { id: "wu", name: "吴敏", code: "WH-007", team: "拣货二组", position: "拣货员", night: 1, hours: 144 },
  { id: "chen", name: "陈涛", code: "WH-008", team: "发运组", position: "发运员", night: 4, hours: 168 },
];

const shifts: Record<ShiftKey, { name: string; short: string; time: string; color: string }> = {
  morning: { name: "早班", short: "早", time: "08:00-17:00", color: "bg-blue-50 text-blue-700 border-blue-200" },
  mid: { name: "中班", short: "中", time: "12:00-21:00", color: "bg-violet-50 text-violet-700 border-violet-200" },
  night: { name: "夜班", short: "夜", time: "21:00-06:00", color: "bg-slate-100 text-slate-700 border-slate-300" },
  off: { name: "休息", short: "休", time: "-", color: "bg-gray-50 text-gray-500 border-gray-200" },
  leave: { name: "请假", short: "假", time: "-", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

const dateLabels = ["01 周二", "02 周三", "03 周四", "04 周五", "05 周六", "06 周日", "07 周一", "08 周二", "09 周三", "10 周四", "11 周五", "12 周六", "13 周日", "14 周一"];

function initialSchedule() {
  const values: Record<string, ShiftKey[]> = {};
  employees.forEach((employee, employeeIndex) => {
    values[employee.id] = dateLabels.map((_, dateIndex) => {
      if (dateIndex === 5 || (employeeIndex + dateIndex) % 9 === 0) return "off";
      if (employeeIndex === 1 && dateIndex === 8) return "leave";
      if ((employeeIndex + dateIndex) % 7 === 0) return "night";
      return employeeIndex % 3 === 1 ? "mid" : "morning";
    });
  });
  return values;
}

function emptySchedule() {
  return Object.fromEntries(employees.map((employee) => [employee.id, dateLabels.map(() => "off" as ShiftKey)]));
}

function StatCard({ label, value, detail, tone = "blue" }: { label: string; value: string; detail: string; tone?: "blue" | "green" | "amber" | "purple" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", purple: "bg-violet-50 text-violet-700" };
  return <div className="rounded-md border border-border bg-white p-4"><div className="flex items-center justify-between"><span className="text-small text-text-secondary">{label}</span><span className={`rounded-full px-2 py-1 text-mini ${tones[tone]}`}>{detail}</span></div><div className="mt-2 text-[26px] font-semibold leading-none text-text-primary">{value}</div></div>;
}

export function SchedulingPage() {
  const [activeTab, setActiveTab] = useState<ScheduleTab>("calendar");
  const [schedule, setSchedule] = useState<Record<string, ShiftKey[]>>(initialSchedule);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; dateIndex: number } | null>(null);
  const [warehouse, setWarehouse] = useState("北京仓");
  const [team, setTeam] = useState("全部班组");
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [bulkTarget, setBulkTarget] = useState<{ employeeId: string; employeeName: string } | null>(null);
  const [bulkShift, setBulkShift] = useState<ShiftKey>("morning");
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenerated, setAutoGenerated] = useState(false);
  const [autoPlan, setAutoPlan] = useState("plan-a");
  const [autoConfirmOpen, setAutoConfirmOpen] = useState(false);
  const [planningMonth, setPlanningMonth] = useState<"2026-09" | "2026-10">("2026-09");
  const [publishedView, setPublishedView] = useState(false);

  const filteredEmployees = useMemo(() => team === "全部班组" ? employees : employees.filter((employee) => employee.team === team), [team]);
  const assignedCount = Object.values(schedule).flat().filter((shift) => shift !== "off" && shift !== "leave").length;
  const warningCount = Object.values(schedule).filter((items) => items.filter((shift) => shift === "night").length > 3).length;

  function updateCell(shift: ShiftKey) {
    if (publishedView) {
      setActionNotice("已发布排班为只读版本，如需修改请返回编辑");
      return;
    }
    if (!selectedCell) return;
    setSchedule((current) => ({ ...current, [selectedCell.employeeId]: current[selectedCell.employeeId].map((value, index) => index === selectedCell.dateIndex ? shift : value) }));
    setSelectedCell(null);
    setSaved(false);
  }

  function applyFillWeek(employeeId: string, shift: ShiftKey) {
    setSchedule((current) => ({ ...current, [employeeId]: current[employeeId].map((value, index) => index < 7 && value !== "leave" ? shift : value) }));
    setSaved(false);
  }

  function fillWeek(employeeId: string, _shift: ShiftKey) {
    if (publishedView) {
      setActionNotice("已发布排班为只读版本，如需修改请返回编辑");
      return;
    }
    const employee = employees.find((item) => item.id === employeeId);
    setBulkTarget(employee ? { employeeId, employeeName: employee.name } : null);
  }

  function confirmFillWeek() {
    if (!bulkTarget) return;
    applyFillWeek(bulkTarget.employeeId, bulkShift);
    setBulkTarget(null);
    setActionNotice(`${bulkTarget.employeeName} 的首周已批量设置为${shifts[bulkShift].name}`);
  }

  function openAutoSchedule() {
    setAutoConfirmOpen(true);
  }

  function startAutoSchedule() {
    setAutoConfirmOpen(false);
    setAutoOpen(true);
    setAutoGenerated(false);
    setAutoGenerating(true);
    window.setTimeout(() => {
      setAutoGenerating(false);
      setAutoGenerated(true);
      if (planningMonth === "2026-10") {
        applyAutoPlan();
      }
    }, 700);
  }

  function generateAutoPlan() {
    setAutoGenerating(true);
    window.setTimeout(() => {
      setAutoGenerating(false);
      setAutoGenerated(true);
    }, 500);
  }

  function applyAutoPlan() {
    setSchedule((current) => {
      const next = { ...current };
      employees.forEach((employee, employeeIndex) => {
        next[employee.id] = next[employee.id].map((shift, dateIndex) => {
          if (shift === "leave" || dateIndex === 5) return shift === "leave" ? shift : "off";
          return (employeeIndex + dateIndex + (autoPlan === "plan-b" ? 1 : 0)) % 6 === 0 ? "night" : employeeIndex % 2 ? "mid" : "morning";
        });
      });
      return next;
    });
    setAutoOpen(false);
    setSaved(false);
    setActionNotice("自动排班方案已应用到日历，可继续人工调整后保存或发布");
  }

  function changePlanningMonth(month: "2026-09" | "2026-10") {
    setPlanningMonth(month);
    setPublishedView(false);
    setSchedule(month === "2026-10" ? emptySchedule() : initialSchedule());
    setActionNotice(month === "2026-10" ? "2026年10月为待排月份，当前排班为空，请使用自动排班或人工安排" : "已切换到2026年9月排班");
  }

  function openPublishedCalendar() {
    setPlanningMonth("2026-09");
    setSchedule(initialSchedule());
    setPublishedView(true);
    setActionNotice("当前查看的是2026年9月已发布版本，排班单元格为只读");
  }

  function editPublishedSchedule() {
    setPublishedView(false);
    setPublished(false);
    setActionNotice("已进入已发布排班的编辑模式，修改完成后可重新发布");
  }

  function openCycle(month: "2026-09" | "2026-10", published = false) {
    setPlanningMonth(month);
    setPublishedView(published);
    setSchedule(month === "2026-10" ? emptySchedule() : initialSchedule());
    setActiveTab("calendar");
    setActionNotice(published ? "当前查看的是已发布版本，排班单元格为只读" : `${month === "2026-10" ? "2026年10月" : "2026年9月"}已进入编辑模式`);
  }

  return <div className="space-y-page-block">
    <PageHeader title="排班管理" description="统一管理仓库人员、班次与月度排班，实时识别工时和人力风险。" actions={<div className="flex gap-2"><Button size="sm" onClick={() => setSaved(true)}><Check size={15} />保存草稿</Button><Button size="sm" variant="primary" onClick={() => setPublished(true)}><Sparkles size={15} />发布排班</Button></div>} />
    {saved && <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-small text-emerald-800"><span><Check size={16} className="mr-2 inline" />排班草稿已保存，最后保存时间：2026-09-23 16:40</span><X size={16} className="cursor-pointer" onClick={() => setSaved(false)} /></div>}
    {published && <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-small text-blue-800"><span><Check size={16} className="mr-2 inline" />2026年9月排班已发布，员工现在可以查看最新安排。</span><X size={16} className="cursor-pointer" onClick={() => setPublished(false)} /></div>}
    {actionNotice && <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-small text-blue-800"><span>{actionNotice}</span><X size={16} className="cursor-pointer" onClick={() => setActionNotice("")} /></div>}
    {activeTab === "calendar" && publishedView && <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-small text-amber-800"><span><Check size={16} className="mr-2 inline" />当前为已发布版本，只读查看中。</span><Button size="sm" variant="primary" onClick={editPublishedSchedule}>编辑并重新发布</Button></div>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="排班完成率" value="92.6%" detail="较上月 +4.2%" tone="green" /><StatCard label="计划出勤人数" value={`${assignedCount} 人次`} detail="8名员工" /><StatCard label="待处理预警" value={`${warningCount + 2} 条`} detail="需关注" tone="amber" /><StatCard label="本月预计工时" value="1,296 h" detail="上限 1,408h" tone="purple" /></div>

    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-1 rounded-md bg-bg-subtle p-1">
          {([ ["cycles", "排班周期", CalendarDays], ["calendar", "排班日历", CalendarDays], ["strategy", "排班策略", Clock3], ["people", "人员管理", Users], ["teams", "班组管理", Users], ["shifts", "班次管理", Clock3], ["stats", "统计报表", FileText] ] as const).map(([key, label, Icon]) => <button key={key} className={`inline-flex items-center gap-2 rounded-sm px-3 py-2 text-small ${activeTab === key ? "bg-white font-medium text-primary shadow-xs" : "text-text-secondary hover:text-text-primary"}`} onClick={() => setActiveTab(key)}><Icon size={15} />{label}</button>)}
        </div>
        <div className="flex items-center gap-2 text-small text-text-secondary"><span className={`h-2 w-2 rounded-full ${published ? "bg-emerald-500" : "bg-amber-500"}`} />{published ? "已发布" : "草稿"}</div>
      </div>

      {activeTab === "cycles" && <CyclePage onOpenCycle={openCycle} />}
      {activeTab === "calendar" && <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"><div className="flex items-center gap-2"><select className="h-9 rounded-sm border border-border bg-white px-3 text-small" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}><option>北京仓</option><option>上海仓</option><option>广州仓</option></select><select className="h-9 rounded-sm border border-border bg-white px-3 text-small" value={team} onChange={(event) => setTeam(event.target.value)}><option>全部班组</option><option>拣货一组</option><option>拣货二组</option><option>收货一组</option><option>发运组</option></select><span className="ml-2 text-body font-medium">{planningMonth === "2026-10" ? "2026年10月" : "2026年9月"}</span><Button size="sm"><ChevronLeft size={15} /></Button><Button size="sm">今天</Button><Button size="sm"><ChevronRight size={15} /></Button></div><div className="flex gap-2"><Button size="sm" onClick={() => setActionNotice(`${planningMonth === "2026-10" ? "2026年10月" : "2026年9月"}当前筛选结果已导出`)}><Download size={15} />导出</Button><Button size="sm" variant="secondary" onClick={openAutoSchedule} disabled={publishedView}><Sparkles size={15} />自动排班</Button></div></div>
        <div className="flex flex-wrap items-center gap-4 border-b border-border py-3 text-mini text-text-secondary"><span className="font-medium text-text-primary">班次图例</span>{Object.entries(shifts).map(([key, shift]) => <span key={key} className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${shift.color.split(" ")[0]}`} />{shift.name} {shift.time !== "-" ? `· ${shift.time}` : ""}</span>)}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse text-small"><thead><tr className="bg-bg-subtle text-left text-text-secondary"><th className="sticky left-0 z-10 min-w-[178px] border-b border-r border-border bg-bg-subtle px-3 py-3">员工 / 岗位</th>{dateLabels.map((date, index) => <th key={date} className={`min-w-[74px] border-b border-border px-2 py-3 text-center ${index === 5 || index === 12 ? "text-danger" : ""}`}><div>{date.split(" ")[0]}</div><div className="mt-0.5 text-mini">{date.split(" ")[1]}</div></th>)}<th className="min-w-[74px] border-b border-l border-border px-2 py-3 text-center">本月</th></tr></thead><tbody>{filteredEmployees.map((employee) => <tr key={employee.id} className="group"><td className="sticky left-0 z-10 border-b border-r border-border bg-white px-3 py-2"><div className="flex items-center justify-between"><div><div className="font-medium text-text-primary">{employee.name} <span className="ml-1 text-mini font-normal text-text-muted">{employee.code}</span></div><div className="mt-0.5 text-mini text-text-secondary">{employee.position} · {employee.team}</div></div><button className="invisible text-text-muted hover:text-primary group-hover:visible" title="批量设置" onClick={() => fillWeek(employee.id, "morning")}><MoreHorizontal size={16} /></button></div></td>{schedule[employee.id].map((shift, dateIndex) => <td key={`${employee.id}-${dateIndex}`} className="border-b border-border p-1"><button className={`h-[53px] w-full rounded-sm border px-1 text-center transition hover:shadow-sm ${shifts[shift].color}`} onClick={() => setSelectedCell({ employeeId: employee.id, dateIndex })}><div className="font-medium">{shifts[shift].short}</div><div className="mt-1 text-[10px] opacity-80">{shifts[shift].time === "-" ? "—" : shifts[shift].time.split("-")[0]}</div></button></td>)}<td className="border-b border-l border-border px-2 text-center"><div className="font-medium">{employee.hours}h</div><div className="mt-1 text-mini text-text-muted">夜{employee.night}次</div></td></tr>)}</tbody></table></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-small"><span className="text-text-secondary">共 {filteredEmployees.length} 名员工 · 点击单元格可修改班次 · 点击员工右侧菜单可批量设置首周</span><span className="flex items-center gap-1 text-amber-700"><AlertTriangle size={15} />连续夜班、超工时将允许保存但需确认</span></div>
      </>}
      {activeTab === "strategy" && <StrategyTab onNotice={setActionNotice} />}

      {activeTab === "people" && <PeopleTabInteractive onNotice={setActionNotice} />}
      {activeTab === "teams" && <TeamsTab onNotice={setActionNotice} />}
      {activeTab === "shifts" && <ShiftsTabCreateInteractive onNotice={setActionNotice} />}
      {activeTab === "stats" && <StatsTab />}
    </Card>

    <Modal open={Boolean(bulkTarget)} title="批量设置首周" onClose={() => setBulkTarget(null)}>
      <div className="space-y-4">
        <div className="rounded-md bg-bg-subtle p-3 text-small text-text-secondary">{bulkTarget?.employeeName} · 2026年9月1日 - 9月7日</div>
        <label className="block text-small font-medium text-text-primary">应用班次<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3" value={bulkShift} onChange={(event) => setBulkShift(event.target.value as ShiftKey)}>{Object.entries(shifts).map(([key, shift]) => <option key={key} value={key}>{shift.name} {shift.time !== "-" ? `（${shift.time}）` : ""}</option>)}</select></label>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-small text-amber-800"><AlertTriangle size={15} className="mr-1 inline" />已存在的请假不会被覆盖，修改后需要保存草稿。</div>
        <div className="flex justify-end gap-2"><Button onClick={() => setBulkTarget(null)}>取消</Button><Button variant="primary" onClick={confirmFillWeek}>确认设置</Button></div>
      </div>
    </Modal>

    <Modal open={autoConfirmOpen} title="确认自动排班" onClose={() => setAutoConfirmOpen(false)}>
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-small text-amber-800"><AlertTriangle size={17} className="mr-2 inline" />系统将根据当前仓库、班组和排班规则重新计算{planningMonth === "2026-10" ? "2026年10月" : "当前周期"}排班。</div>
        <div className="space-y-2 text-small text-text-secondary"><div>· 当前周期：{planningMonth === "2026-10" ? "2026年10月" : "2026年9月"}</div><div>· 预计覆盖：8名员工</div><div>· 已请假安排不会被覆盖</div><div>· 生成结果会写入当前排班草稿，需人工确认后发布</div></div>
        <div className="flex justify-end gap-2"><Button onClick={() => setAutoConfirmOpen(false)}>取消</Button><Button variant="primary" onClick={startAutoSchedule}><Sparkles size={15} />确认并生成</Button></div>
      </div>
    </Modal>

    <Modal open={autoOpen} title="自动排班" widthClassName="max-w-[min(100%,680px)] w-full" onClose={() => setAutoOpen(false)}>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2 text-center text-small"><div className="rounded-md border border-primary bg-blue-50 p-3"><div className="font-semibold text-primary">1</div><div className="mt-1 text-text-secondary">设置目标</div></div><div className={`rounded-md border p-3 ${autoGenerated ? "border-primary bg-blue-50" : "border-border"}`}><div className="font-semibold text-primary">2</div><div className="mt-1 text-text-secondary">生成方案</div></div><div className={`rounded-md border p-3 ${autoGenerated ? "border-primary bg-blue-50" : "border-border"}`}><div className="font-semibold text-primary">3</div><div className="mt-1 text-text-secondary">应用排班</div></div></div>
        <div className="grid gap-3 md:grid-cols-2"><label className="text-small font-medium">排班范围<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3"><option>北京仓 · 2026年9月</option></select></label><label className="text-small font-medium">参与岗位<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3"><option>拣货、收货、发运</option><option>仅拣货岗位</option></select></label></div>
        <div><div className="mb-2 text-small font-medium">排班目标</div><div className="grid gap-2 md:grid-cols-2">{[["plan-a", "方案 A · 均衡夜班", "满足率 100% · 夜班差异 ≤ 1"], ["plan-b", "方案 B · 工时优先", "满足率 100% · 工时差异最小"]].map(([value, title, detail]) => <button key={value} className={`rounded-md border p-3 text-left ${autoPlan === value ? "border-primary bg-blue-50" : "border-border hover:border-primary-subtle"}`} onClick={() => setAutoPlan(value)}><div className="font-medium">{title}</div><div className="mt-1 text-small text-text-secondary">{detail}</div></button>)}</div></div>
        {autoGenerated && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4"><div className="font-medium text-emerald-800"><Check size={16} className="mr-1 inline" />已生成 2 个可行方案</div><div className="mt-2 grid grid-cols-3 gap-3 text-small text-emerald-700"><span>需求满足率 <b>100%</b></span><span>硬约束冲突 <b>0</b></span><span>覆盖人数 <b>8 / 8</b></span></div></div>}
        <div className="flex justify-end gap-2"><Button onClick={() => setAutoOpen(false)}>取消</Button>{autoGenerated ? <Button variant="primary" onClick={applyAutoPlan}>应用方案</Button> : <Button variant="primary" onClick={generateAutoPlan} disabled={autoGenerating}>{autoGenerating ? "正在计算…" : "生成排班方案"}</Button>}</div>
      </div>
    </Modal>

    <Modal open={Boolean(selectedCell)} title="调整排班" onClose={() => setSelectedCell(null)}><div className="space-y-4"><div className="rounded-md bg-bg-subtle p-3 text-small text-text-secondary">{selectedCell && `${employees.find((employee) => employee.id === selectedCell.employeeId)?.name} · 2026年9月${String(selectedCell.dateIndex + 1).padStart(2, "0")}日`}</div><div className="grid grid-cols-2 gap-2">{Object.entries(shifts).map(([key, shift]) => <button key={key} className={`rounded-md border p-3 text-left hover:shadow-sm ${shift.color}`} onClick={() => updateCell(key as ShiftKey)}><div className="font-medium">{shift.name}</div><div className="mt-1 text-mini opacity-75">{shift.time}</div></button>)}</div><div className="flex justify-end gap-2"><Button onClick={() => setSelectedCell(null)}>取消</Button></div></div></Modal>
  </div>;
}

function PeopleTab() { return <div className="pt-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="page-section-title mb-1">仓库人员</h3><p className="text-small text-text-secondary">当前仓库共 8 名在职员工，均已完成岗位和技能配置。</p></div><Button size="sm" variant="primary"><Plus size={15} />新增人员</Button></div><div className="overflow-x-auto"><table className="w-full text-small"><thead className="bg-bg-subtle text-left text-text-secondary"><tr>{["工号", "姓名", "所属班组", "岗位", "技能标签", "本月工时", "夜班", "状态", "操作"].map((label) => <th key={label} className="border-b border-border px-3 py-3">{label}</th>)}</tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td className="border-b border-border px-3 py-3 text-text-secondary">{employee.code}</td><td className="border-b border-border px-3 py-3 font-medium">{employee.name}</td><td className="border-b border-border px-3 py-3">{employee.team}</td><td className="border-b border-border px-3 py-3">{employee.position}</td><td className="border-b border-border px-3 py-3"><span className="rounded bg-blue-50 px-2 py-1 text-mini text-blue-700">拣货</span> <span className="rounded bg-gray-100 px-2 py-1 text-mini text-gray-600">复核</span></td><td className="border-b border-border px-3 py-3">{employee.hours}h</td><td className="border-b border-border px-3 py-3">{employee.night}次</td><td className="border-b border-border px-3 py-3"><Badge tone="success">在职</Badge></td><td className="border-b border-border px-3 py-3 text-primary">查看 / 编辑</td></tr>)}</tbody></table></div></div>; }

function ShiftsTab() { return <div className="pt-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="page-section-title mb-1">班次配置</h3><p className="text-small text-text-secondary">维护仓库可用班次，跨天班次会参与夜班和休息规则校验。</p></div><Button size="sm" variant="primary"><Plus size={15} />新增班次</Button></div><div className="grid gap-3 md:grid-cols-2">{Object.entries(shifts).map(([key, shift]) => <div key={key} className="flex items-center justify-between rounded-md border border-border p-4"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-md border text-body font-semibold ${shift.color}`}>{shift.short}</span><div><div className="font-medium">{shift.name} <span className="ml-2 text-mini font-normal text-text-muted">{key.toUpperCase()}</span></div><div className="mt-1 text-small text-text-secondary">{shift.time} · 标准工时 {key === "off" || key === "leave" ? 0 : 8}h</div></div></div><button className="text-small text-primary">编辑</button></div>)}</div></div>; }

function StatsTab() { return <div className="pt-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="page-section-title mb-1">排班统计</h3><p className="text-small text-text-secondary">按人员查看应出勤、实际出勤、工时和夜班分布。</p></div><Button size="sm"><Download size={15} />导出报表</Button></div><div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-md border border-border p-4"><div className="mb-4 flex items-center justify-between"><span className="font-medium">人员工时概览</span><span className="text-mini text-text-muted">2026年9月</span></div>{employees.slice(0, 6).map((employee) => <div key={employee.id} className="mb-4 last:mb-0"><div className="mb-1 flex justify-between text-small"><span>{employee.name} · {employee.position}</span><span className="font-medium">{employee.hours}h</span></div><div className="h-2 overflow-hidden rounded-full bg-bg-subtle"><div className={`h-full rounded-full ${employee.hours >= 176 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(100, employee.hours / 1.76)}%` }} /></div></div>)}</div><div className="rounded-md border border-border p-4"><div className="mb-4 font-medium">人力缺口</div><div className="space-y-3">{[["09/24", "拣货", "12 / 14", "-2"], ["09/25", "收货", "5 / 5", "0"], ["09/26", "发运", "6 / 8", "-2"], ["09/27", "拣货", "10 / 10", "0"]].map(([date, position, people, gap]) => <div key={`${date}-${position}`} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"><div><div className="text-small font-medium">{date} · {position}</div><div className="mt-1 text-mini text-text-muted">已排 / 需求 {people}</div></div><span className={`font-medium ${gap === "0" ? "text-emerald-600" : "text-danger"}`}>{gap === "0" ? "满足" : `缺 ${gap.slice(1)} 人`}</span></div>)}</div></div></div></div>; }

function StrategyTab({ onNotice }: { onNotice: (message: string) => void }) {
  const [hardRules, setHardRules] = useState([
    { id: "leave", label: "员工请假不可排班", detail: "请假日期自动锁定为请假状态", enabled: true },
    { id: "skill", label: "岗位技能必须匹配", detail: "仅安排具备对应技能的员工", enabled: true },
    { id: "overlap", label: "禁止同一时间重复排班", detail: "跨天班次按实际时间计算", enabled: true },
    { id: "hours", label: "月度工时不能超限", detail: "默认上限 176 小时", enabled: true },
    { id: "rest", label: "夜班后至少休息 1 天", detail: "夜班结束后自动检查休息间隔", enabled: true },
  ]);
  const [softRules, setSoftRules] = useState([
    { id: "demand", label: "岗位需求满足率", weight: 40 },
    { id: "night", label: "夜班均衡度", weight: 20 },
    { id: "hours", label: "工时均衡度", weight: 15 },
    { id: "preference", label: "员工班次偏好", weight: 10 },
    { id: "continuity", label: "连续工作合理性", weight: 10 },
    { id: "switch", label: "班次切换稳定性", weight: 5 },
  ]);
  const [maxConsecutive, setMaxConsecutive] = useState("6");
  const [maxNight, setMaxNight] = useState("10");
  const [targetRate, setTargetRate] = useState("100");
  const totalWeight = softRules.reduce((total, rule) => total + rule.weight, 0);
  const toggleHardRule = (id: string) => setHardRules((current) => current.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
  const updateWeight = (id: string, value: string) => setSoftRules((current) => current.map((rule) => rule.id === id ? { ...rule, weight: Number(value) || 0 } : rule));

  function saveStrategy() {
    onNotice(`排班策略已保存，${hardRules.filter((rule) => rule.enabled).length}条硬约束生效，软约束权重${totalWeight}%`);
  }

  return <div className="pt-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="page-section-title mb-1">排班策略</h3><p className="text-small text-text-secondary">自动排班会优先满足硬约束，再按照软约束权重计算最优方案。</p></div><div className="flex gap-2"><Button size="sm" onClick={() => { setHardRules((current) => current.map((rule) => ({ ...rule, enabled: true }))); setSoftRules([{ id: "demand", label: "岗位需求满足率", weight: 40 }, { id: "night", label: "夜班均衡度", weight: 20 }, { id: "hours", label: "工时均衡度", weight: 15 }, { id: "preference", label: "员工班次偏好", weight: 10 }, { id: "continuity", label: "连续工作合理性", weight: 10 }, { id: "switch", label: "班次切换稳定性", weight: 5 }]); }}>恢复默认</Button><Button size="sm" variant="primary" onClick={saveStrategy}><Check size={15} />保存策略</Button></div></div><div className="grid gap-4 xl:grid-cols-2"><section className="rounded-md border border-border bg-white p-4"><div className="mb-1 flex items-center justify-between"><h4 className="font-medium">硬约束</h4><Badge tone="danger">违反后不可生成</Badge></div><p className="mb-4 text-small text-text-secondary">用于保证排班结果合法，建议仅关闭已确认不适用的规则。</p><div className="space-y-3">{hardRules.map((rule) => <div key={rule.id} className="flex items-center justify-between rounded-md border border-border px-3 py-3"><div><div className="text-small font-medium">{rule.label}</div><div className="mt-1 text-mini text-text-muted">{rule.detail}</div></div><button role="switch" aria-checked={rule.enabled} className={`relative h-6 w-11 rounded-full transition ${rule.enabled ? "bg-primary" : "bg-gray-300"}`} onClick={() => toggleHardRule(rule.id)}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${rule.enabled ? "left-6" : "left-1"}`} /></button></div>)}</div></section><section className="rounded-md border border-border bg-white p-4"><div className="mb-1 flex items-center justify-between"><h4 className="font-medium">软约束权重</h4><Badge tone={totalWeight === 100 ? "success" : "warning"}>{totalWeight}% / 100%</Badge></div><p className="mb-4 text-small text-text-secondary">权重越高，自动排班越优先优化该目标。</p><div className="space-y-3">{softRules.map((rule) => <div key={rule.id}><div className="mb-1 flex items-center justify-between text-small"><span>{rule.label}</span><span className="font-medium text-primary">{rule.weight}%</span></div><input type="range" min="0" max="100" value={rule.weight} onChange={(event) => updateWeight(rule.id, event.target.value)} className="w-full accent-blue-600" /></div>)}</div>{totalWeight !== 100 && <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-small text-amber-800"><AlertTriangle size={15} className="mr-1 inline" />当前权重总和不是 100%，保存前建议调整。</div>}</section></div><section className="mt-4 rounded-md border border-border bg-white p-4"><h4 className="mb-1 font-medium">基础规则参数</h4><p className="mb-4 text-small text-text-secondary">这些参数会同时用于人工调整后的实时校验。</p><div className="grid gap-3 md:grid-cols-3"><label className="text-small font-medium">最大连续工作天数<input type="number" min="1" max="15" className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={maxConsecutive} onChange={(event) => setMaxConsecutive(event.target.value)} /></label><label className="text-small font-medium">单人最大夜班次数<input type="number" min="0" max="31" className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={maxNight} onChange={(event) => setMaxNight(event.target.value)} /></label><label className="text-small font-medium">岗位需求满足率目标<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3" value={targetRate} onChange={(event) => setTargetRate(event.target.value)}><option value="100">100%（严格满足）</option><option value="95">95%（允许少量缺口）</option><option value="90">90%（优先保证工时均衡）</option></select></label></div></section><div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-small text-blue-800"><div className="font-medium"><Sparkles size={16} className="mr-1 inline" />当前策略摘要</div><div className="mt-2 grid gap-2 md:grid-cols-3"><span>硬约束：{hardRules.filter((rule) => rule.enabled).length} 条生效</span><span>目标满足率：{targetRate}%</span><span>连续工作上限：{maxConsecutive} 天 · 夜班上限：{maxNight} 次</span></div></div></div>;
}

function CyclePage({ onOpenCycle }: { onOpenCycle: (month: "2026-09" | "2026-10", published?: boolean) => void }) {
  const [keyword, setKeyword] = useState("");
  const filteredCycles = scheduleCycles.filter((cycle) => cycle.label.includes(keyword.trim()));
  return <div className="pt-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="page-section-title mb-1">排班周期</h3><p className="text-small text-text-secondary">按月管理排班计划，进入具体周期后再进行日历排班。</p></div><div className="flex gap-2"><input className="h-9 rounded-sm border border-border px-3 text-small" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索月份" /><Button size="sm" variant="primary" onClick={() => onOpenCycle("2026-10")}><Plus size={15} />新建周期</Button></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{filteredCycles.map((cycle) => <div key={cycle.month} className="rounded-md border border-border bg-white p-4"><div className="flex items-start justify-between"><div><div className="text-body font-medium">{cycle.label}</div><div className="mt-1 text-small text-text-secondary">北京仓 · 8名员工</div></div><Badge tone={cycle.status === "published" ? "success" : cycle.status === "draft" ? "warning" : "default"}>{cycle.statusLabel}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 text-small"><div><div className="text-mini text-text-muted">排班完成率</div><div className="mt-1 font-medium">{cycle.completion}</div></div><div><div className="text-mini text-text-muted">人员覆盖</div><div className="mt-1 font-medium">{cycle.coverage}</div></div></div><div className="mt-4 border-t border-border pt-3 text-mini text-text-muted">更新时间：{cycle.updatedAt}</div><div className="mt-3 flex gap-2">{cycle.status === "published" ? <Button size="sm" className="flex-1" onClick={() => onOpenCycle("2026-09", true)}>查看发布版</Button> : <Button size="sm" variant="primary" className="flex-1" onClick={() => onOpenCycle(cycle.month)}>进入排班</Button>}<Button size="sm" onClick={() => onOpenCycle(cycle.month, cycle.status === "published")}>打开</Button></div></div>)}</div>{filteredCycles.length === 0 && <div className="py-12 text-center text-small text-text-muted">没有匹配的排班周期</div>}</div>;
}

function TeamsTab({ onNotice }: { onNotice: (message: string) => void }) {
  const [items, setItems] = useState(initialTeams);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof initialTeams)[number] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [warehouse, setWarehouse] = useState("北京仓");
  const [leader, setLeader] = useState("张三");

  function openEditor(team?: (typeof initialTeams)[number]) {
    setEditing(team ?? null); setName(team?.name ?? ""); setCode(team?.code ?? ""); setWarehouse(team?.warehouse ?? "北京仓"); setLeader(team?.leader ?? "张三"); setOpen(true);
  }

  function saveTeam() {
    if (!name.trim() || !code.trim()) return;
    if (editing) {
      setItems((current) => current.map((item) => item.id === editing.id ? { ...item, name: name.trim(), code: code.trim().toUpperCase(), warehouse, leader } : item));
      onNotice(`${name.trim()}班组已更新`);
    } else {
      setItems((current) => [...current, { id: `team-${Date.now()}`, name: name.trim(), code: code.trim().toUpperCase(), warehouse, leader, status: "启用" }]);
      onNotice(`${name.trim()}班组已创建，可在人员和排班中使用`);
    }
    setOpen(false);
  }

  function toggleStatus(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, status: item.status === "启用" ? "停用" : "启用" } : item));
    const target = items.find((item) => item.id === id);
    if (target) onNotice(`${target.name}已${target.status === "启用" ? "停用" : "启用"}`);
  }

  return <div className="pt-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="page-section-title mb-1">班组管理</h3><p className="text-small text-text-secondary">先建立班组，再将人员归属到班组，排班时可按班组筛选。</p></div><Button size="sm" variant="primary" onClick={() => openEditor()}><Plus size={15} />新建班组</Button></div><div className="overflow-x-auto"><table className="w-full text-small"><thead className="bg-bg-subtle text-left text-text-secondary"><tr>{["班组名称", "班组编码", "所属仓库", "班组长", "人员数量", "状态", "操作"].map((label) => <th key={label} className="border-b border-border px-3 py-3">{label}</th>)}</tr></thead><tbody>{items.map((team) => <tr key={team.id}><td className="border-b border-border px-3 py-3 font-medium">{team.name}</td><td className="border-b border-border px-3 py-3 text-text-secondary">{team.code}</td><td className="border-b border-border px-3 py-3">{team.warehouse}</td><td className="border-b border-border px-3 py-3">{team.leader}</td><td className="border-b border-border px-3 py-3">{employees.filter((employee) => employee.team === team.name).length} 人</td><td className="border-b border-border px-3 py-3">{team.status === "启用" ? <Badge tone="success">启用</Badge> : <Badge tone="default">停用</Badge>}</td><td className="border-b border-border px-3 py-3"><button className="text-primary" onClick={() => openEditor(team)}>编辑</button><button className="ml-3 text-text-secondary" onClick={() => toggleStatus(team.id)}>{team.status === "启用" ? "停用" : "启用"}</button></td></tr>)}</tbody></table></div><Modal open={open} title={editing ? "编辑班组" : "新建班组"} onClose={() => setOpen(false)}><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><label className="text-small font-medium">班组名称<input className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：拣货三组" /></label><label className="text-small font-medium">班组编码<input className="mt-2 h-10 w-full rounded-sm border border-border px-3 uppercase" value={code} onChange={(event) => setCode(event.target.value)} placeholder="例如：PICK-03" /></label></div><div className="grid grid-cols-2 gap-3"><label className="text-small font-medium">所属仓库<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}><option>北京仓</option><option>上海仓</option><option>广州仓</option></select></label><label className="text-small font-medium">班组长<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3" value={leader} onChange={(event) => setLeader(event.target.value)}>{employees.map((employee) => <option key={employee.id}>{employee.name}</option>)}</select></label></div><div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>取消</Button><Button variant="primary" disabled={!name.trim() || !code.trim()} onClick={saveTeam}>保存班组</Button></div></div></Modal></div>;
}

function PeopleTabInteractive({ onNotice }: { onNotice: (message: string) => void }) {
  const [items, setItems] = useState(employees);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("拣货员");
  const [team, setTeam] = useState("拣货一组");

  function openEditor(employee?: Employee) {
    setEditing(employee ?? null);
    setName(employee?.name ?? "");
    setPosition(employee?.position ?? "拣货员");
    setTeam(employee?.team ?? "拣货一组");
    setOpen(true);
  }

  function savePerson() {
    if (!name.trim()) return;
    if (editing) {
      setItems((current) => current.map((item) => item.id === editing.id ? { ...item, name: name.trim(), position, team } : item));
      onNotice(`${name.trim()} 的人员信息已更新`);
    } else {
      setItems((current) => [...current, { id: `new-${Date.now()}`, name: name.trim(), code: `WH-${String(current.length + 1).padStart(3, "0")}`, team, position, night: 0, hours: 0 }]);
      onNotice(`已新增人员 ${name.trim()}`);
    }
    setOpen(false);
  }

  return <div className="pt-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="page-section-title mb-1">仓库人员</h3><p className="text-small text-text-secondary">当前仓库共 {items.length} 名在职员工，人员信息会参与排班技能校验。</p></div><Button size="sm" variant="primary" onClick={() => openEditor()}><Plus size={15} />新增人员</Button></div><div className="overflow-x-auto"><table className="w-full text-small"><thead className="bg-bg-subtle text-left text-text-secondary"><tr>{["工号", "姓名", "所属班组", "岗位", "技能标签", "本月工时", "夜班", "状态", "操作"].map((label) => <th key={label} className="border-b border-border px-3 py-3">{label}</th>)}</tr></thead><tbody>{items.map((employee) => <tr key={employee.id}><td className="border-b border-border px-3 py-3 text-text-secondary">{employee.code}</td><td className="border-b border-border px-3 py-3 font-medium">{employee.name}</td><td className="border-b border-border px-3 py-3">{employee.team}</td><td className="border-b border-border px-3 py-3">{employee.position}</td><td className="border-b border-border px-3 py-3"><span className="rounded bg-blue-50 px-2 py-1 text-mini text-blue-700">拣货</span> <span className="rounded bg-gray-100 px-2 py-1 text-mini text-gray-600">复核</span></td><td className="border-b border-border px-3 py-3">{employee.hours}h</td><td className="border-b border-border px-3 py-3">{employee.night}次</td><td className="border-b border-border px-3 py-3"><Badge tone="success">在职</Badge></td><td className="border-b border-border px-3 py-3"><button className="text-primary" onClick={() => openEditor(employee)}>编辑</button><button className="ml-3 text-text-secondary" onClick={() => onNotice(`已打开${employee.name}的排班详情`)}>查看</button></td></tr>)}</tbody></table></div><Modal open={open} title={editing ? "编辑人员" : "新增人员"} onClose={() => setOpen(false)}><div className="space-y-4"><label className="block text-small font-medium">姓名<input className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入姓名" /></label><div className="grid grid-cols-2 gap-3"><label className="text-small font-medium">班组<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3" value={team} onChange={(event) => setTeam(event.target.value)}><option>拣货一组</option><option>拣货二组</option><option>收货一组</option><option>发运组</option></select></label><label className="text-small font-medium">岗位<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3" value={position} onChange={(event) => setPosition(event.target.value)}><option>拣货员</option><option>收货员</option><option>上架员</option><option>复核员</option><option>发运员</option></select></label></div><div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>取消</Button><Button variant="primary" onClick={savePerson} disabled={!name.trim()}>保存</Button></div></div></Modal></div>;
}

function ShiftsTabInteractive({ onNotice }: { onNotice: (message: string) => void }) {
  const [items, setItems] = useState(Object.entries(shifts).map(([key, shift]) => ({ key: key as ShiftKey, ...shift })));
  const [editing, setEditing] = useState<(typeof items)[number] | null>(null);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");

  function openEditor(item: (typeof items)[number]) { setEditing(item); setName(item.name); setTime(item.time); }
  function saveShift() { if (!editing || !name.trim()) return; setItems((current) => current.map((item) => item.key === editing.key ? { ...item, name: name.trim(), time: time.trim() || "-" } : item)); onNotice(`${name.trim()}班次配置已更新`); setEditing(null); }

  return <div className="pt-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="page-section-title mb-1">班次配置</h3><p className="text-small text-text-secondary">维护仓库可用班次，跨天班次会参与夜班和休息规则校验。</p></div><Button size="sm" variant="primary" onClick={() => onNotice("新增班次入口已打开，当前原型默认维护标准班次") }><Plus size={15} />新增班次</Button></div><div className="grid gap-3 md:grid-cols-2">{items.map((shift) => <div key={shift.key} className="flex items-center justify-between rounded-md border border-border p-4"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-md border text-body font-semibold ${shift.color}`}>{shift.short}</span><div><div className="font-medium">{shift.name} <span className="ml-2 text-mini font-normal text-text-muted">{shift.key.toUpperCase()}</span></div><div className="mt-1 text-small text-text-secondary">{shift.time} · 标准工时 {shift.key === "off" || shift.key === "leave" ? 0 : 8}h</div></div></div><button className="text-small text-primary" onClick={() => openEditor(shift)}>编辑</button></div>)}</div><Modal open={Boolean(editing)} title="编辑班次" onClose={() => setEditing(null)}><div className="space-y-4"><label className="block text-small font-medium">班次名称<input className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="block text-small font-medium">时间范围<input className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={time} onChange={(event) => setTime(event.target.value)} placeholder="例如 08:00-17:00" /></label><div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>取消</Button><Button variant="primary" onClick={saveShift}>保存修改</Button></div></div></Modal></div>;
}

function ShiftsTabCreateInteractive({ onNotice }: { onNotice: (message: string) => void }) {
  type ShiftItem = { key: string; name: string; short: string; time: string; color: string; hours: number; type: string };
  const standardItems: ShiftItem[] = Object.entries(shifts).map(([key, shift]) => ({ key, ...shift, hours: key === "off" || key === "leave" ? 0 : 8, type: key === "night" ? "夜班" : key === "off" || key === "leave" ? "休息" : "正常" }));
  const [customItems, setCustomItems] = useState<ShiftItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShiftItem | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [time, setTime] = useState("");
  const [hours, setHours] = useState("8");
  const [type, setType] = useState("正常");

  function resetForm() {
    setName(""); setCode(""); setTime(""); setHours("8"); setType("正常");
  }

  function openCreate() {
    resetForm();
    setEditItem(null);
    setCreateOpen(true);
  }

  function openEdit(item: ShiftItem) {
    setEditItem(item);
    setName(item.name); setCode(item.key); setTime(item.time); setHours(String(item.hours)); setType(item.type);
    setCreateOpen(true);
  }

  function saveShift() {
    if (!name.trim() || !code.trim()) return;
    const next: ShiftItem = { key: code.trim().toUpperCase(), name: name.trim(), short: name.trim().slice(0, 1), time: time.trim() || "-", color: "bg-cyan-50 text-cyan-700 border-cyan-200", hours: Number(hours) || 0, type };
    if (editItem) {
      setCustomItems((current) => current.map((item) => item.key === editItem.key ? next : item));
      onNotice(`${next.name}班次已更新`);
    } else {
      setCustomItems((current) => [...current, next]);
      onNotice(`${next.name}班次已新增，可用于后续排班配置`);
    }
    setCreateOpen(false);
  }

  return <div className="pt-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="page-section-title mb-1">班次配置</h3><p className="text-small text-text-secondary">维护仓库可用班次，新增班次保存后会进入当前仓库班次库。</p></div><Button size="sm" variant="primary" onClick={openCreate}><Plus size={15} />新增班次</Button></div><div className="grid gap-3 md:grid-cols-2">{[...standardItems, ...customItems].map((shift) => <div key={shift.key} className="flex items-center justify-between rounded-md border border-border p-4"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-md border text-body font-semibold ${shift.color}`}>{shift.short}</span><div><div className="font-medium">{shift.name} <span className="ml-2 text-mini font-normal text-text-muted">{shift.key}</span></div><div className="mt-1 text-small text-text-secondary">{shift.time} · 标准工时 {shift.hours}h · {shift.type}</div></div></div><button className="text-small text-primary" onClick={() => openEdit(shift)}>编辑</button></div>)}</div><Modal open={createOpen} title={editItem ? "编辑班次" : "新增班次"} onClose={() => setCreateOpen(false)}><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><label className="text-small font-medium">班次名称<input className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：早班" /></label><label className="text-small font-medium">班次编码<input className="mt-2 h-10 w-full rounded-sm border border-border px-3 uppercase" value={code} onChange={(event) => setCode(event.target.value)} placeholder="例如：M01" /></label></div><div className="grid grid-cols-2 gap-3"><label className="text-small font-medium">时间范围<input className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={time} onChange={(event) => setTime(event.target.value)} placeholder="例如 08:00-17:00" /></label><label className="text-small font-medium">标准工时<input type="number" min="0" max="24" className="mt-2 h-10 w-full rounded-sm border border-border px-3" value={hours} onChange={(event) => setHours(event.target.value)} /></label></div><label className="block text-small font-medium">班次类型<select className="mt-2 h-10 w-full rounded-sm border border-border bg-white px-3" value={type} onChange={(event) => setType(event.target.value)}><option>正常</option><option>夜班</option><option>休息</option><option>调休</option></select></label><div className="flex justify-end gap-2"><Button onClick={() => setCreateOpen(false)}>取消</Button><Button variant="primary" disabled={!name.trim() || !code.trim()} onClick={saveShift}>保存班次</Button></div></div></Modal></div>;
}
