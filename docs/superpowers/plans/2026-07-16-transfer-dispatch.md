# 调拨作业中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the PC + PDA transfer dispatch interaction covering order merging, driver assignment, per-location picking with batch→warehouse sequential allocation, and batch traceability.

**Architecture:** Data layer (`transfer-dispatch.ts`) holds types + mock data + grouping logic. Page layer (`transfer-dispatch.tsx`) holds PC view (merge preview + task dispatch + monitoring) and PDA driver view (overview → pick → sequential allocate). App shell and routing are already wired.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind + custom UI components (`Card`, `Button`, `Input`, `Select`, `Badge`, `Modal`, `PageHeader`).

## Global Constraints

- No new npm dependencies
- All data is mock data in `src/data/transfer-dispatch.ts`
- Component imports from `../components/ui/` only
- Must pass `npx tsc --noEmit` and `npx vite build` with zero errors
- Follow existing code patterns in `src/pages/` (functional components, hooks, lucide-react icons)

---

### Task 1: Data Layer — Types, Mock Data, Grouping Logic

**Files:**
- Modify: `src/data/transfer-dispatch.ts`

**Interfaces:**
- Produces: All types and mock data consumed by Task 2

**Spec coverage:** Sections §2 Data Model, §5 Single Order, §6 Batch Traceability

- [ ] **Step 1: Verify type definitions match spec**

Current types (TransferOrderRow, CombinedTask, PickLocation, TaskDestination, PickRecord, TaskStatus) — confirm each field from spec §2 exists. Fields requiring confirmation:
- `TransferOrderRow`: id, sourceWarehouse, targetWarehouse, sku, skuName, batchNo, plannedQty, unit, priority, requiredArrival, status
- `CombinedTask`: id, taskNo, sourceWarehouse, sku, skuName, unit, pickLocations[], destinations[], pickRecords[], forkliftDriver, status, totalQty, pickedQty, progress
- `PickLocation`: location, batchNo, availableQty, pickedQty
- `TaskDestination`: targetWarehouse, orderId, plannedQty, sortedQty
- `PickRecord`: id, location, batchNo, qty, allocations[]

If any field is missing, add it.

- [ ] **Step 2: Verify mock data has the three-order flour example (A300/B400/C300)**

Data should include:
- 3 orders for 高筋面粉 (same SKU-FM-001, same batch B20260711) going to A/B/C
- 1+ separate orders for different SKU (demonstrates direct dispatch)
- The existing combinedTask for the flour wave with 2 pickLocations (different batches), 3 destinations, pickRecords showing batch→warehouse allocation

- [ ] **Step 3: Verify `suggestCombinedTasks()` function**

Input: list of TransferOrderRow[]. Output: grouped suggestions by SKU+batch. If only 1 order for a SKU, it should still appear as a single-order suggestion (direct dispatch).

- [ ] **Step 4: Verify and commit**

```bash
cd /Users/zss/Desktop/Vita-Design-B2B-Backend-Admin-Prototype-main
npx tsc --noEmit
git add src/data/transfer-dispatch.ts
git commit -m "feat: transfer dispatch data layer with batch traceability"
```

---

### Task 2: PC Page — Merge Preview, Driver Dispatch, Execution Monitoring

**Files:**
- Modify: `src/pages/transfer-dispatch.tsx`

**Interfaces:**
- Consumes: All types and `suggestCombinedTasks` from `src/data/transfer-dispatch.ts`
- Produces: `TransferDispatchPage` export consumed by `src/App.tsx`
- Sub-components: `PdaFrame` consumed by Task 3

**Spec coverage:** Sections §3 PC Page, §5 Single Order, §6 Batch Traceability

- [ ] **Step 1: Verify PC page imports and component structure**

Imports should include from `../data/transfer-dispatch`: combinedTasks, suggestCombinedTasks, transferOrders, CombinedTask, TaskStatus (and any others used in JSX).

Component: `TransferDispatchPage` with 4 internal states: viewMode, assignModalOpen, activeTaskId, selectedDriver.

- [ ] **Step 2: Stats cards** — 4 cards showing: 待合并调拨单 count, 执行中任务 count, 当前司机 unique count, 本周完成 count.

- [ ] **Step 3: Left column — merged task preview**

Loop through `suggestCombinedTasks()` result. For each group:
- Render a card with SKU name, batch, location, total qty
- List each destination warehouse with qty
- Badge: "合并任务 · N单" if >1 order, or "单任务" if 1 order

Under the merge cards, render direct-dispatch items in a compact table.

- [ ] **Step 4: Right column — driver binding + dispatch**

For each suggestion:
- Show SKU name + total qty + destination summary
- `<Select>` for driver assignment (刘海峰, 陈伟, 王强)
- Badge showing merged or single

Bottom: `<Button>` "生成任务并派发" → opens modal showing assigned items + "打开司机PDA" action.

- [ ] **Step 5: Execution monitoring with batch traceability**

Loop through `combinedTasks`. Each card shows:
- taskNo, status badge, merged/single badge, driver name, pick progress
- For merged tasks: per-destination sortedQty/plannedQty with progress bars
- Expandable `<details>` section showing pickRecords: each record shows location, batch, qty, → warehouse+allocations

- [ ] **Step 6: Button to switch to PDA view**

`<Button variant="primary">` with `Smartphone` icon → sets `viewMode` to "pda", which renders `<DriverPdaView>`.

- [ ] **Step 7: Verify and commit**

```bash
cd /Users/zss/Desktop/Vita-Design-B2B-Backend-Admin-Prototype-main
npx tsc --noEmit
npx vite build 2>&1 | tail -5
git add src/pages/transfer-dispatch.tsx
git commit -m "feat: transfer dispatch PC page with merge preview and monitoring"
```

---

### Task 3: PDA Driver View — Overview, Pick, Sequential Allocate

**Files:**
- Modify: `src/pages/transfer-dispatch.tsx` (append DriverPdaView + PdaFrame)

**Interfaces:**
- Consumes: CombinedTask, PickLocation, TaskDestination, PickRecord from data layer
- Produces: DriverPdaView rendered by TransferDispatchPage when `viewMode === "pda"`

**Spec coverage:** Section §4 PDA Driver

- [ ] **Step 1: DriverPdaView component structure**

State: `step` ("list" | "pick" | "allocate"), `locationDone` (Record<string, number>), `sortTotal` (Record<string, number>), `activeLocationIdx`, `pickQty`, `allocQueueIdx`, `allocQty`, `allocDone`.

- [ ] **Step 2: "list" step — task overview**

Spec §4.1 layout:
- Task summary card (sku, total, driver, picked/sorted progress bar)
- Pick locations list — each with location code, batch, qty, done/completed badges, active one has "开始此库位下架" button
- Destination demand section — per-warehouse progress bars
- Expandable historical records section (pickRecords)

- [ ] **Step 3: "pick" step — location picking**

Spec §4.2 layout:
- Location and batch header
- Scanned location input (readonly for prototype)
- Quantity input with quick-select buttons (全量, 半量, 可选 fractions)
- "下架 N 袋，去分播 →" button → enters allocate step

- [ ] **Step 4: "allocate" step — sequential warehouse allocation**

Spec §4.3 layout — the core interaction:
- Batch info bar showing total to allocate and remaining
- One destination at a time (controlled by allocQueueIdx):
  - Large destination name ("A仓")
  - Remaining demand for this warehouse
  - Quantity input with +/- buttons and quick-select
  - Max = min(warehouse remaining, batch remaining)
- Sideline: all destinations with remaining demand, current one highlighted
- Running progress: "已分 X / Y"
- Confirm button: "确认 N 袋 分到 A仓"
- On confirm: record allocation → if more to allocate → next warehouse; if done → write to locationDone + sortTotal → back to list

- [ ] **Step 5: PdaFrame wrapper**

Reusable phone-frame wrapper with:
- Status bar (09:41, 5G signal)
- Header bar with back button, title, badge
- Content slot
- No separate file — keep as inner function component in same file

- [ ] **Step 6: Handle edge cases**

- `needyDestinations` filter: skip warehouses already fulfilled
- When no needy destinations remain → auto-return to list
- Same location multiple picks: cumulative tracking in locationDone
- Single-destination task: allocate step has only 1 warehouse, confirm once

- [ ] **Step 7: Verify and commit**

```bash
cd /Users/zss/Desktop/Vita-Design-B2B-Backend-Admin-Prototype-main
npx tsc --noEmit
npx vite build 2>&1 | tail -5
git add src/pages/transfer-dispatch.tsx
git commit -m "feat: PDA driver view with sequential batch-to-warehouse allocation"
```

---

### Task 4: Final Verification

**Files:** (no changes — only verification)

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/zss/Desktop/Vita-Design-B2B-Backend-Admin-Prototype-main
npx tsc --noEmit --pretty 2>&1
```
Expected: zero errors.

- [ ] **Step 2: Full Vite build**

```bash
npx vite build 2>&1
```
Expected: build success (chunk size warning is acceptable).

- [ ] **Step 3: Git status check**

```bash
git status
```
Expected: only the intended files modified, no untracked artifacts.

- [ ] **Step 4: Final commit if any fixes were made**

```bash
git add -u
git commit -m "fix: address review feedback for transfer dispatch prototype"
```
