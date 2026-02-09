---
title: BONES
created_on: 2026-02-09
updated_on: 2026-02-09
---
# BONES.md - Tools and Boundaries

This file defines tool boundaries and filesystem contracts.

## Write allowlist (PKM-safe)
- Create: `Inbox/`, `TaskNotes/`, `System/Reports/`, `Notes/chats/`
- Binary writes: `Areas/`
- Append-only edits: `Journal/`, `System/Reports/`
- Managed marker updates:
  - `memory/GPT_Chat_YYYY-MM-DD.md` (`OPENCLAW_DAILY_DIGEST`)
  - `MEMORY.md` (`OPENCLAW_LONG_TERM_CANDIDATES`)

## Prohibited behaviors
- Do not overwrite user-authored note bodies.
- Do not bypass TaskNotes for canonical task records.
- Do not move external captures directly to `Notes/` without processing path.

## Tool policy
- Prefer documented skills and automation scripts over ad-hoc one-offs.
- Keep Templater scripts in `System/scripts/` export-safe only.
- Keep standalone Node automation in `System/automation/`.

## Autonomy boundaries (act-without-asking)

### Execute without asking (low-risk, reversible)
- Read/search/analyze local files.
- Update operational docs and runbooks in this workspace.
- Run diagnostics (`openclaw status`, validation scripts, dry-runs).
- Perform routine maintenance scripts already documented in this vault.
- Create or update task plans/review logs in `System/Reports/`.

### Ask first (higher-risk or external impact)
- Any destructive action (delete/overwrite user-authored content, mass refactors, irreversible migrations).
- Any outbound/public communication (email, social posts, cross-platform messaging) unless explicitly requested.
- Credential/token/config changes outside routine safe reads.
- System-level changes that alter host security posture, network exposure, or daemon behavior.

### Execution standard
- If blocked, ask at most 1–2 precise questions.
- If not blocked, proceed with explicit assumptions and verify outcomes.
- Prefer smallest safe change; leave audit trail in `System/Reports/Codex/tasks/todo.md`.
