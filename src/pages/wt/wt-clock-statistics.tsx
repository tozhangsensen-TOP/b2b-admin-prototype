import { useState } from "react";
import { initialClaims, initialWtTasks, type WtClaimRecord, type WtPdaTask } from "../../data/wt-labor";
import { ClockTaskManagement } from "./wt-task-center";

export function WtClockStatisticsPage() {
  const [tasks, setTasks] = useState<WtPdaTask[]>(() => initialWtTasks.map((task) => ({ ...task })));
  const [claims, setClaims] = useState<WtClaimRecord[]>(() => initialClaims.map((claim) => ({ ...claim })));

  return <div className="space-y-page-block p-page-block"><div><h1 className="text-h1 font-h1">计时任务统计</h1><p className="mt-1 text-body text-text-secondary">管理单证打卡、劳务打卡、保洁打卡的领取完成明细</p></div><ClockTaskManagement tasks={tasks} claims={claims} onTasksChange={setTasks} onClaimsChange={setClaims} /></div>;
}
