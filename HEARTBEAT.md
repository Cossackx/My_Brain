---
title: HEARTBEAT
created_on: 2026-01-27
updated_on: 2026-02-09
---
# HEARTBEAT.md

Default: be useful, not noisy.

## Cadence
- Daytime only (`08:00-22:00` America/New_York), unless urgent.
- Max once every 4 hours unless explicitly requested.
- Do not repeat the same alert twice unless severity changed.

## Checks (in order)
1. **Runtime health quick check**
   - If the previous cycle had tool/runtime failure text, run a lightweight status check before doing anything else.
   - Alert only if the issue is still active.

2. **Memory pipeline drift**
   - Only when sessions were active since last check.
   - Run: `PKM: Sync Agent Memory (once)` workflow (or equivalent scripts) when drift is detected.
   - Alert only on failure or unresolved drift.

3. **Calendar window (24h)**
   - Report only actionable conflicts:
     - overlap/double-booked
     - event starts in <2h and appears unprepared
     - travel-time impossibility
   - Skip routine event summaries.

4. **High-priority unread messages**
   - Report only messages requiring a decision or response.
   - Skip newsletters/routine notifications.

## Auto-action policy during heartbeat
- If a task is low-risk and reversible, execute it without asking.
- Prefer fixing silently + concise confirmation over asking permission for obvious maintenance.
- Never send external/public messages during heartbeat unless explicitly instructed.

## Report policy
- If nothing actionable changed, reply exactly: `HEARTBEAT_OK`.
- If something is actionable, send one compact alert with:
  - what changed
  - impact
  - what was auto-fixed (if anything)
  - one recommended next action
