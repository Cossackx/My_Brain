# Task Plan

## OpenClaw War Room Visual v1 (2026-02-09)
- [x] Define v1 architecture and event/data model aligned to OpenClaw streams.
- [x] Build first browser-based UI pass (agent cards, live feed, mission strip, status chips).
- [x] Add a local run path and produce a concrete URL for preview.
- [x] Document implementation plan (phases, risks, next steps) for production hardening.
- [x] Capture review outcomes in this file.

## Review (2026-02-09) - OpenClaw War Room Visual v1
- [x] Created first-pass browser UI at `System/tmp/openclaw-war-room-v1/` with:
  - `index.html` (3-panel layout)
  - `styles.css` (original dark cinematic visual language)
  - `war-room.js` (agent cards, mission pulse, live feed demo ticker)
  - `README.md` (phase plan + safety model + run instructions)
- [x] Added concrete preview URL path via local static server on port `8899`.
- [x] Documented v2 architecture for real-time relay wiring (read-only, sanitized stream).


## OpenClaw 8-Layer Alignment (2026-02-09)
- [x] Add canonical layer files (`BRAIN.md`, `MUSCLES.md`, `BONES.md`, `DNA.md`, `EYES.md`, `NERVES.md`, `MISSION_CONTROL.md`) at vault root.
- [x] Update core files (`AGENTS.md`, `SOUL.md`, `USER.md`, `RESPONSE.md`, `HEARTBEAT.md`, `TOOLS.md`) to wire 8-layer flow.
- [x] Add OpenClaw automation scripts:
  - `System/automation/openclaw/syncOpenClawTemplateStack.js`
  - `System/automation/openclaw/patchOpenClawBootstrapLayers.js`
  - `System/automation/openclaw/validateOpenClawLayerStack.js`
- [x] Add CLI wrappers (`sync-template-stack`, `patch-bootstrap-loader`, `validate-layer-stack`) and VS Code tasks.
- [x] Patch OpenClaw loader dist files and validate idempotence.
- [x] Sync template stack to OpenClaw templates, template probe, and runtime workspace.
- [x] Update OpenClaw/PKM governance docs and add review notes.
- [x] Run full validation suite (static contract, patch integrity, bootstrap smoke, PKM regressions, runtime checks).

## Review (2026-02-09) - OpenClaw 8-Layer Alignment
- [x] Added root layer files and runbook (`BRAIN.md`, `MUSCLES.md`, `BONES.md`, `DNA.md`, `EYES.md`, `NERVES.md`, `MISSION_CONTROL.md`) plus root `BOOTSTRAP.md`.
- [x] Updated root orchestration files (`AGENTS.md`, `SOUL.md`, `USER.md`, `RESPONSE.md`, `HEARTBEAT.md`, `TOOLS.md`) for compatibility-first 8-layer flow.
- [x] Added OpenClaw automation tooling and wrappers in `System/automation/openclaw/`.
- [x] Added VS Code tasks for layer sync/patch/validate.
- [x] Patched OpenClaw dist loaders (`agent-scope-4nAkb5YL.js`, `agent-scope-xzSh3IZK.js`, `agent-scope-BHIT6LIU.js`) with bootstrap support for `RESPONSE.md` and layer files.
- [x] Confirmed patch idempotence: second dry-run returns `changed=0 unchanged=3`.
- [x] Synced canonical files to all template/runtime surfaces and confirmed second dry-run `copied=0 unchanged=45`.
- [x] Updated integration/governance docs:
  - `System/Docs/Guides/OpenClaw + Obsidian Integration.md`
  - `System/Docs/Guides/OpenClaw + PKM Routing Table.md`
  - `System/Docs/Reference/Agent Governance Alignment.md`
  - `System/START_HERE.md`
  - `System/Docs/Reference/Directives.md`
- [x] Verification results:
  - `node System/automation/openclaw/validateOpenClawLayerStack.js` -> all checks passed
  - bootstrap smoke (`ensureAgentWorkspace`) created all expected core + layer files in temp workspace
  - memory pipeline dry-runs remained idempotent (`Created=0`, stable digest sessions)
  - runtime checks via PowerShell (`openclaw doctor --non-interactive`, `openclaw status --all`) returned success booleans.
  - daemon reload applied after patching (`openclaw daemon restart` -> success).

## Templater User Script Regression Fix (2026-02-09)
- [x] Reproduce and confirm why Templater stopped resolving `tp.user.*` scripts.
- [x] Remove non-Templater CLI `.js` files from `System/scripts` into a dedicated automation path.
- [x] Update task wiring and canonical docs/SOPs to the new script paths.
- [x] Add guardrails documenting the Templater safety boundary.
- [x] Run verification checks (Templater export audit + importer/digest dry-runs).

## Review (2026-02-09) - Templater User Script Regression Fix
- [x] Root cause confirmed: `System/scripts` is Templater's `user_scripts_folder`, and standalone CLI `.js` files there broke user-script loading.
- [x] Moved scripts to `System/automation/agent-memory/`:
  - `codexVscodeChatImporter.js`
  - `openclawSessionImporter.js`
  - `openclawDailyDigest.js`
- [x] Updated `.vscode/tasks.json`, root instructions (`AGENTS.md`, `TOOLS.md`, `System/START_HERE.md`), and canonical SOP/reference docs to new paths.
- [x] Added safety-boundary guidance in docs to prevent future regressions.
- [x] Verification passed:
  - `System/scripts/*.js` export audit: `ALL_TEMPLATER_JS_HAVE_EXPORTS`
  - `node System/automation/agent-memory/codexVscodeChatImporter.js --dry-run` successful
  - `node System/automation/agent-memory/openclawSessionImporter.js --dry-run` successful
  - `node System/automation/agent-memory/openclawDailyDigest.js --dry-run` successful

## Instruction + SOP Alignment Pass (2026-02-09)
- [x] Audit canonical instruction files (`AGENTS.md`, `TOOLS.md`, `System/START_HERE.md`) for hybrid memory flow coverage.
- [x] Update SOP/spec docs (`System/Docs/04_Processes_and_Workflows_SOP.md`, `System/Docs/05_Automation_and_Regulation_Spec.md`, `System/Docs/09_QA_Checklists_and_Rubrics.md`) with OpenClaw runtime -> vault pipeline rules.
- [x] Update governance/reference docs (`System/Docs/README.md`, `System/Docs/Reference/Directives.md`, `System/Docs/Reference/Agent Governance Alignment.md`) with canonical paths, scripts, and idempotence expectations.
- [x] Update supporting guides/examples (`System/Docs/Guides/Codex + Obsidian (VS Code Extension).md`, `System/Docs/Guides/OpenClaw + PKM Routing Table.md`, `System/Docs/03_Object_Model_and_Metadata.md`, `System/Docs/08_Use_Cases_and_Examples.md`) as needed for consistency.
- [x] Verify all touched docs use `updated_on: 2026-02-09` and consistent terminology (`source: Codex|OpenClaw`, `Notes/chats`, `memory/GPT_Chat_YYYY-MM-DD.md`).
- [x] Document review outcomes in this file.

## Review (2026-02-09) - Instruction + SOP Alignment Pass
- [x] Updated root instruction + operator files (`AGENTS.md`, `TOOLS.md`, `System/START_HERE.md`) to document the hybrid memory model, script paths, and one-shot sync task.
- [x] Updated canonical SOP/spec/QA docs with explicit agent-memory bridge contracts: idempotent importers, managed-marker digest writes, and repeat-run verification checks.
- [x] Updated governance/reference/guides (`System/Docs/README.md`, `System/Docs/Reference/Directives.md`, `System/Docs/Reference/Agent Governance Alignment.md`, `System/Docs/Guides/Codex + Obsidian (VS Code Extension).md`, `System/Docs/Guides/OpenClaw + PKM Routing Table.md`) with canonical path/state references.
- [x] Updated schema/examples docs (`System/Docs/03_Object_Model_and_Metadata.md`, `System/Docs/08_Use_Cases_and_Examples.md`, `System/Docs/02_Vault_Layout_Blueprint.md`) to include Codex/OpenClaw chat-source expectations.
- [x] Consistency checks passed via grep/audit for updated date stamps and key terms (`openclawSessionImporter`, `openclawDailyDigest`, `PKM: Sync Agent Memory`, managed marker names).

## OpenClaw Memory + Vault Hybrid Bridge (2026-02-09)
- [x] Implement OpenClaw session importer (`System/automation/agent-memory/openclawSessionImporter.js`) from runtime JSONL to `Notes/chats/`.
- [x] Add deterministic state tracking for OpenClaw imports (session/file level idempotence).
- [x] Implement daily digest bridge (`System/automation/agent-memory/openclawDailyDigest.js`) to sync OpenClaw chat outcomes into `memory/GPT_Chat_YYYY-MM-DD.md`.
- [x] Add VS Code task wiring for OpenClaw watch/once/dry-run import + digest runs.
- [x] Update vault docs with the combined operating model and commands.
- [x] Run dry-run + live verification for importer and digest flows; capture review notes.

## Review (2026-02-09) - OpenClaw Memory + Vault Hybrid Bridge
- [x] Added `System/automation/agent-memory/openclawSessionImporter.js` with root discovery (`OPENCLAW_SESSIONS_ROOT` override), watch mode, and idempotent state in `System/Reports/Codex/openclaw-chat-importer-state.json`.
- [x] Added `System/automation/agent-memory/openclawDailyDigest.js` with managed block sync into `memory/GPT_Chat_YYYY-MM-DD.md` and optional candidate promotion block into `MEMORY.md`.
- [x] Added VS Code tasks for OpenClaw watch/once/dry-run imports, digest runs, and a combined `PKM: Sync Agent Memory (once)` task.
- [x] Updated docs in `Notes/Codex in Obsidian (Windows + WSL).md` and `System/Docs/Guides/OpenClaw + Obsidian Integration.md`.
- [x] Verified end-to-end:
  - `openclawSessionImporter --dry-run` before import: `Created=8`
  - live import: `Created=8`, then repeat dry-run: `Created=0 Skipped=8`
  - digest run: `sessions=3` for `2026-02-09`
  - managed markers remain single-instance on rerun (`OPENCLAW_DAILY_DIGEST`, `OPENCLAW_LONG_TERM_CANDIDATES`).

## OpenClaw LAN 24-7 Project Package (2026-02-08)
- [x] Audit existing OpenClaw migration artifacts and reuse baseline Docker/C2 patterns.
- [x] Create LAN-targeted deployment bundle under `System/Config/openclaw-lan/`:
  - `Dockerfile`
  - `docker-compose.yml`
  - `.env.example`
  - `openclaw.json.example`
  - `README.md`
- [x] Add host-ops scripts for portability and operations:
  - `scripts/init-host-folders.ps1`
  - `scripts/export-openclaw-image.ps1`
  - `scripts/import-openclaw-image.ps1`
  - `scripts/allow-lan-gateway.ps1`
  - `scripts/heartbeat-check.ps1`
  - `scripts/memory-sync.ps1`
  - `scripts/register-proactive-tasks.ps1`
  - `scripts/unregister-proactive-tasks.ps1`
- [x] Generate supporting planner/subagent artifacts:
  - `agents/project-roster.yaml`
  - `agents/subagent-playbooks.md`
  - `sops/*.md` proactive governance protocols
- [x] Write master project runbook for desired end state:
  - `System/Docs/Guides/OpenClaw LAN 24-7 Program Plan.md`
- [x] Link LAN runbook from `OpenClaw + Obsidian Integration.md`.
- [ ] Execute deployment on old computer and complete LAN connectivity tests.
- [ ] Run 72-hour stability validation and credential-rotation post-cutover.

## Review (2026-02-08) - OpenClaw LAN 24-7 Project Package
- [x] Added a complete LAN-first deployment kit designed for Windows old-computer hosting with Docker.
- [x] Added explicit role model for primary planner + subagents and concrete playbooks for execution handoffs.
- [x] Added proactive operations scripts for heartbeat and memory sync with Task Scheduler registration.
- [x] Added runbook-level governance and phase-by-phase cutover plan aligned with existing Obsidian/OpenClaw docs.
- [ ] Live runtime validation (`docker compose config` / container health) still depends on operator machine with Docker runtime access.

## OpenClaw Local -> VPS Docker Migration Pack (2026-02-07)
- [x] Audit current OpenClaw runtime anchors (gateway port, workspace, channel path) and existing vault governance docs.
- [x] Create VPS Docker deployment bundle under `System/Config/openclaw-vps/` (`Dockerfile`, `docker-compose.yml`, `.env.example`, `README.md`).
- [x] Add operational scripts for command-and-control operations:
  - `System/scripts/openclaw-scuttle.sh`
  - `System/scripts/openclaw-heartbeat-watchdog.sh`
  - `System/scripts/openclaw-memory-sync.sh`
- [x] Write migration + Navy-style C2 runbook in `System/Docs/Guides/OpenClaw VPS + Docker Migration and C2 Framework.md`.
- [x] Link integration docs to the new migration/C2 runbook.
- [ ] Execute live VPS provisioning and run the cutover checklist in production.
- [ ] Run 72-hour dual-run validation and then decommission local runtime.

## Review (2026-02-07) - OpenClaw Local -> VPS Docker Migration Pack
- [x] Deployment artifacts now exist for an exact `18789` gateway baseline with persisted host volumes under `/var/lib/openclaw/...`.
- [x] Command-and-control primitives are in place (watchdog, scuttle, memory sync) with environment-driven configuration.
- [x] New runbook maps Obsidian + GitHub + Clawdbot into explicit role/authority/fail-safe boundaries.
- [x] Local validation completed for shell syntax (`bash -n`) and JSON parsing (`openclaw.json.example`).
- [ ] `docker compose config` validation is pending on a host with Docker available (Docker is unavailable in this WSL session).
- [ ] Live infrastructure execution, credential rotation, and cutover verification remain operator steps.

## PDF Extraction Toolchain (Option B: Poppler + OCRmyPDF) (2026-02-07)
- [ ] Inventory current PDF-related skills/tools in this vault (remove/avoid any ClawHub PDF skill usage).
- [ ] Install/verify **pdftotext** (Poppler) availability on Windows (prefer winget; fallback choco/scoop).
- [ ] Install/verify **OCRmyPDF** + dependencies (Python, Ghostscript, Tesseract) on Windows.
- [ ] Add a thin wrapper script (PowerShell or Python) under `System/scripts/`:
  - `pdf_to_text`: fast path for text PDFs via `pdftotext`.
  - `pdf_ocr_then_text`: OCR path via `ocrmypdf` → then `pdftotext`.
  - Writes outputs to a deterministic folder and returns paths.
- [ ] Smoke test on 2 sample PDFs (text + scanned) and capture logs/output in `System/Reports/Codex/tmp/pdf-cli/`.
- [ ] Document usage + tradeoffs (speed, quality, language packs) in a short guide note.


## OpenClaw WSL -> PowerShell Shift (2026-02-06)
- [x] Create Windows-side OpenClaw config at `C:\Users\aleks\.openclaw\openclaw.json` from current WSL settings.
- [x] Verify Windows CLI reads config (`openclaw config get ...`) and reports expected gateway/workspace values.
- [x] Document migration result and recommended cleanup to avoid dual-config confusion.

## Daily Note Template Updates (2026-02-04)

- [x] Replace the "Tasks Today" callout in `System/templates/Daily Note Template.md` with a section header and TaskNotes base embed.
- [x] Add `limit: 7` to the Base views used in the daily template (TaskNotes Today, Daily notes Created/Modified, Daily Web Clips Today, Daily Chats Today).
- [x] Verify the template and Base view changes are consistent and captured in the review section.

## Daily Note Template Layout + Base Fixes (2026-02-04)

- [x] Fix Base parse error in `Daily notes activity.base` by removing duplicate `limit` keys.
- [x] Update daily template spacing, emojis in callout titles and section headers, and collapse Progress Tracking.
- [x] Remove Daily Navigation section from `System/templates/Daily Note Template.md`.
- [x] Verify updated template renders with proper spacing and Bases load.

## Codex Extension + Obsidian Vault Support

- [x] Review current Codex-related vault docs/configs (AGENTS.md, TOOLS.md, .codex/, .vscode/) and map gaps for IDE extension usage.
- [x] Draft a short Codex+Obsidian guide under `System/Docs/Guides/` (setup, workflows, guardrails, pointers to canonical docs).
- [x] Add/adjust project-scoped Codex config and instructions (e.g., `.codex/config.toml`, AGENTS.md, TOOLS.md) to make the extension reliable.
- [x] Verify docs and config alignment; document results in the Review section.

- [x] Review current Task Board + TaskNotes settings and confirm unified paths (TaskNotes/ + TaskNotes/_Archive).
- [x] Update Task Board config to exclude `Inbox` and `Journal`, and align task note locations to `TaskNotes/`.
- [x] Clear Task Board cache and note any required rescan/reload steps.
- [x] Update vault task-management SOP/docs to reflect TaskNotes + Task Board roles, unified folders, and scan exclusions.

## OpenClaw - Run/Deploy Decision

- [x] Read official OpenClaw docs (install, Docker/sandboxing, security).
- [x] Compare 3 run modes: local install, Docker sandbox, Cloudflare edge.
- [x] Write recommendation: start local + Docker sandbox; add Cloudflare only if always-on/public webhook needed.

## OpenClaw + Obsidian (Second Brain)

- [x] Review vault automation guardrails (`System/Docs/05_Automation_and_Regulation_Spec.md`).
- [x] Identify existing chat/task automation to reuse (`System/scripts/syncChats.js`, TaskNotes schema).
- [x] Choose primary integration mode: Obsidian Local REST API (commands + note I/O) vs file-only fallback.
- [x] Draft a “starter kit” plan: capture → Inbox, task → TaskNotes, docs → Areas + wrapper note.
- [x] Write a guide note under `System/Docs/Guides/` for repeatable setup.

## Review
- [x] Updated Task Board filters and unified Task Board/TaskNotes paths; cleared Task Board cache.
- [x] Updated SOP/instructions to document TaskNotes as system of record, Task Board as optional inline surface, and `Inbox/` + `Journal/` exclusions.
- [x] Captured OpenClaw run/deploy recommendation and tradeoffs (local vs Docker vs Cloudflare).
- [x] Captured OpenClaw↔Obsidian integration architecture aligned to vault guardrails.
- [x] Added Codex VS Code extension guide, project config, and updated AGENTS/TOOLS for Codex support.

## Codex VS Code Chat Capture (Web Clipper)
- [x] Confirm no-web requirement; use Codex VS Code JSONL sessions as source of truth.
- [x] Implement Node importer to convert Codex sessions into vault chat notes with `source: Codex`.
- [x] Add VS Code tasks for auto-run (folder open), one-time import, and dry-run.
- [x] Document usage in Codex notes.

## Review
- [x] Added `System/automation/agent-memory/codexVscodeChatImporter.js` to convert Codex VS Code sessions into `Notes/chats`.
- [x] Added `.vscode/tasks.json` auto-run watcher and manual import tasks.
- [x] Documented Codex VS Code chat capture in `Notes/Codex in Obsidian (Windows + WSL).md`.

## Codex Chat Formatting Refresh (2026-02-04)
- [x] Confirm required chat frontmatter fields + filename rules for Codex chats.
- [x] Update the Codex VS Code importer to render tool calls/outputs as collapsed callouts with truncation.
- [x] Reformat existing Codex chat notes to the new callout format and fix any missing/incorrect properties.
- [x] Verify all Codex chat properties and capture results below.

## Review (2026-02-04)
- [x] Rebuild pass updated 83 Codex chat notes using the new callout formatting (`--rebuild`).
- [x] Property verification passed: 83 files checked, 0 errors.

## Review (2026-02-04) - Daily Note Template
- [x] Replaced "Tasks Today" callout with a "Tasks" section header and kept TaskNotes Today base embed.
- [x] Added `priority_1` frontmatter bound to the same focus input; removed the “What matters most today?” placeholder and inserted a blank line between Priority and Quests.
- [x] Capped daily-template Base views at 7 rows (TaskNotes Today, Created/Modified Today, Daily Web Clips Today, Daily Chats Today).
- [x] Fixed Base parse error and removed Daily Navigation section.
- [x] Added emoji to callout titles and section headers, improved spacing, and collapsed Progress Tracking by default.

## OpenClaw Windows Install (2026-02-05)
- [x] Confirm WSL OpenClaw status
- [x] Uninstall WSL OpenClaw + gateway data
- [x] Install OpenClaw on Windows (PowerShell)
- [x] Verify PowerShell `openclaw` works

## Review (2026-02-05) - OpenClaw Windows Install
- [x] Removed WSL OpenClaw data at `~/.openclaw` by archiving it to `~/.openclaw.archive-20260206-194551`
- [x] Installed OpenClaw on Windows via PowerShell
- [x] Verified `openclaw --version` in PowerShell

## Video → PKM Mapping (2026-02-05)
- [x] Pull video details/transcript + key points from source
- [x] Map video concepts to vault rules, folders, and workflows
- [x] Deliver concise connection summary with concrete file/command references

## Review (2026-02-05) - Video → PKM Mapping
- [x] Summarized video + mapped to PKM system with actionable connections
- [x] Wrote routing + frontmatter templates in `System/Docs/Guides/OpenClaw + PKM Routing Table.md`

## NVIDIA Integrate API Script (2026-02-05)

- [x] Add safe runner script `System/scripts/nvidia_integrate_chat.py` (API key via env var; no secrets in files).
- [x] Document run instructions + key-rotation note.
- [ ] Verify live call works (blocked until `NVIDIA_API_KEY` is set in the environment).

## Review (2026-02-05) - NVIDIA Integrate API Script
- [x] Added `System/scripts/nvidia_integrate_chat.py` to call the same endpoint with optional streaming.
- [x] Avoided hardcoding tokens; uses `NVIDIA_API_KEY`/`NVAPI_KEY` environment variables.
- [ ] Live run pending (needs API key exported in shell).

## PKM Instructions + SOP Alignment (2026-02-06)
- [x] Audit canonical instruction/SOP docs against actual Obsidian config (`daily-notes`, `templater`, `quickadd`, `task-board`, `tasknotes`).
- [x] Resolve instruction drift in `AGENTS.md` (lessons path and daily memory-file creation rule).
- [x] Align QuickAdd command naming in canonical docs (`Daily Note Capture`).
- [x] Align ontology relation examples to the registered relations vocabulary.
- [x] Align OpenClaw routing templates with inbound capture policy (`status: capture` in `Inbox/`).
- [x] Fix encoding corruption in taxonomy guide and refresh `updated_on` metadata on touched docs.
- [x] Consolidate Codex lessons into one canonical file path.

## Review (2026-02-06) - PKM Instructions + SOP Alignment
- [x] Updated `AGENTS.md`, `System/START_HERE.md`, `System/Docs/Reference/Directives.md`, `System/Docs/03_Object_Model_and_Metadata.md`, `System/Docs/07_Taxonomy_and_Ontology_Guide.md`, `System/Docs/Guides/OpenClaw + PKM Routing Table.md`, and `System/Docs/Guides/OpenClaw + Obsidian Integration.md`.
- [x] Canonical lessons path standardized to `System/Reports/Codex/tasks/lessons.md` with `System/Reports/Codex/lessons.md` retained as a legacy pointer.
- [x] Validation scans passed: no remaining `Capture to Daily Note` references in canonical docs, no `belongs_to`/`decides_for` drift in relation guidance, and OpenClaw Bookmark templates now start at `status: capture`.

## Root Governance Alignment (2026-02-06)
- [x] Read root-level agent configs/docs for Codex, OpenClaw, and Claude.
- [x] Add explicit root-vs-vault governance precedence and host filesystem scope to vault docs.
- [x] Add canonical reference doc for agent governance alignment and path map.
- [x] Align OpenClaw runtime workspace to `C:\Users\aleks\OneDrive\My_Brain`.
- [x] Make Claude vault allowlist path-agnostic for host-wide file operations.
- [x] Validate updated JSON configs and verify key doc references.

## Review (2026-02-06) - Root Governance Alignment
- [x] Added `System/Docs/Reference/Agent Governance Alignment.md` and linked it from `AGENTS.md`, `System/Docs/README.md`, `System/START_HERE.md`, and `System/Docs/Reference/Directives.md`.
- [x] Updated `TOOLS.md` and `System/Docs/Guides/Codex + Obsidian (VS Code Extension).md` to reflect global-root + project-vault configuration layering.
- [x] Updated `System/Docs/Guides/OpenClaw + Obsidian Integration.md` with runtime config alignment and workspace/absolute-path rules.
- [x] Updated `.claude/settings.local.json` allowlist to host-wide, path-agnostic command patterns.
- [x] Updated root OpenClaw runtime config `C:\Users\aleks\.openclaw\openclaw.json` workspace path to `C:\Users\aleks\OneDrive\My_Brain` and converted legacy `C:\Users\aleks\.openclaw\workspace\AGENTS.md` into a pointer note.

## Template Alignment Audit (2026-02-06)
- [x] Audit active templates in `System/templates/` against canonical schema drift markers (`updatedOn`, `object_class`, legacy status values).
- [x] Audit active JSON templates in `System/WebClipperTemplates/` for Inbox path, `status: capture`, resource boolean, and required keys.
- [x] Remove duplicate-leading metadata frontmatter from templater-executable templates to prevent double-frontmatter output drift.
- [x] Re-run compliance checks after edits.

## Review (2026-02-06) - Template Alignment Audit
- [x] Verified active Web Clipper templates are aligned (`path: Inbox`, `status: capture`, `updated_on`, no `object_class`, required key set present).
- [x] Removed leading template-metadata frontmatter from 15 executable templates in `System/templates/`:
  `AI Prompt Template.md`, `AI-media-analyzer.md`, `Article Template.md`, `Book Template.md`, `Concept Template.md`, `Decision Template.md`, `Event Template.md`, `Game Template.md`, `Music Release Template.md`, `Organization Template.md`, `Place Template.md`, `Podcast Template.md`, `Quote Template.md`, `Video Template.md`, `swapToolbar.md`.
- [x] Confirmed zero remaining active templates with `--- ... ---` metadata blocks immediately before `<%*` execution blocks.
- [x] Left archived templates in `System/templates/archive/` and `System/WebClipperTemplates/_Archive/` unchanged (historical snapshots).

## Daily Note Image Model Alignment (2026-02-06)
- [x] Verify official OpenAI docs for the latest recommended GPT Image model and current image-generation options.
- [x] Confirm the active Daily Notes template path in Obsidian settings.
- [x] Ensure `System/templates/Daily Note Template.md` defaults and runtime image model usage stay on `gpt-image-1.5`.
- [x] Add lightweight model/quality audit output in generated note image details.

## Review (2026-02-06) - Daily Note Image Model Alignment
- [x] Confirmed active template path: `.obsidian/daily-notes.json` -> `System/templates/Daily Note Template.md`.
- [x] Updated `System/templates/Daily Note Template.md` with explicit `gpt-image-1.5` default guidance and runtime fallback to `gpt-image-1.5` if config is blank.
- [x] Updated generated image details block to include model and quality values for per-note traceability.

## OpenAI Codex 5.3 Alignment (2026-02-06)
- [x] Align root Codex runtime default to `gpt-5.3-codex`.
- [ ] Align root OpenClaw runtime default to `openai-codex/gpt-5.3-codex` (active `openclaw.json` not found on accessible host paths in this environment).
- [x] Align vault OpenAI defaults and automations to `gpt-5.3-codex`.
- [x] Update governance SOP/spec examples to match the new default model.
- [x] Verify active templates in `System/templates/` and `System/WebClipperTemplates/` remain compliant (no live drift).

## Review (2026-02-06) - OpenAI Codex 5.3 Alignment
- [x] Root Codex and vault model defaults updated to `gpt-5.3-codex`; vault checks passed for scripts/config/docs.
- [ ] Root OpenClaw model default pending because no active `openclaw.json` was found in accessible root paths.
- [x] Template/WebClipper alignment re-audited: 9 active WebClipper templates pass (`path: Inbox`, `status: capture`, `updated_on`, no `object_class`/`updatedOn`).

## Brave + Obsidian Web Clipper Recovery (2026-02-06)
- [x] Confirm likely root-cause class from runtime error (`undefined.split`) and interpreter dependency.
- [x] Harden active Web Clipper templates in `System/WebClipperTemplates/` with null-safe split chains where metadata may be absent.
- [x] Verify latest official Web Clipper setup/reset guidance and Brave-specific caveats from primary sources.
- [x] Deliver deterministic browser reset + extension test workflow (single-template smoke test first, then staged re-enable).
- [x] Capture task review + memory notes for continuity.

## Review (2026-02-06) - Brave + Obsidian Web Clipper Recovery
- [x] Added null-safe template hardening for risky split chains in active templates under `System/WebClipperTemplates/`.
- [x] Added smoke-test template: `System/WebClipperTemplates/minimal-smoke-bookmark.json`.
- [x] Added runbook: `System/Docs/Guides/Brave + Obsidian Web Clipper Recovery.md`.
- [x] Verified all active JSON templates parse successfully after edits.
- [x] Cross-checked official docs (`/web-clipper`, `/web-clipper/clip-web-pages`, `/web-clipper/troubleshoot`) and known issue context (`obsidian-clipper#591`).

## OpenClaw WSL2 Install + Setup (2026-02-06)
- [x] Install native Linux `openclaw` in WSL so `/home/raz/.npm-global/bin/openclaw` resolves before Windows shim.
- [x] Run non-interactive onboarding for local mode with workspace `/mnt/c/Users/aleks/OneDrive/My_Brain`.
- [x] Configure gateway token and remote token in `~/.openclaw/openclaw.json`.
- [x] Start gateway in a detached `tmux` session (`openclaw-gw`) because WSL `systemd --user` is unavailable.
- [x] Verify gateway health/probe and listener on `127.0.0.1:18789`.

## Review (2026-02-06) - OpenClaw WSL2 Install + Setup
- [x] WSL OpenClaw installed and selected on PATH (`which -a openclaw` shows Linux path first).
- [x] Onboarding config saved at `~/.openclaw/openclaw.json` with workspace `/mnt/c/Users/aleks/OneDrive/My_Brain`.
- [x] Gateway runtime verified via `openclaw gateway health --json`, `openclaw gateway probe --json`, and socket listener check.
- [x] Service manager remains unavailable in this WSL instance (`systemd --user` bus missing), so daemon install is intentionally skipped and `tmux` is used.

## Review (2026-02-06) - OpenClaw WSL -> PowerShell Shift
- [x] Created Windows config at `C:\Users\aleks\.openclaw\openclaw.json` using WSL settings, with workspace path normalized to `C:\Users\aleks\OneDrive\My_Brain`.
- [x] Stopped WSL gateway runtime (`openclaw-gateway` in tmux) so port `18789` is no longer served from WSL.
- [x] Validated Windows runtime via `cmd /c openclaw health --json`; sessions path now resolves to `C:\Users\aleks\.openclaw\agents\main\sessions\sessions.json`.

## ClawHub Desktop Control Install (2026-02-06)
- [x] Download `matagul/desktop-control` zip from ClawHub to a local temp path.
- [x] Run safety preflight (hash + package content scan + quick code red-flag scan).
- [x] Install **skill** from ClawHub (`npx clawhub install desktop-control`) after confirming `openclaw plugins install` is not the right installer for skills.
- [x] Verify skill appears in OpenClaw skill discovery/status output.
- [x] Set up dedicated Python venv and install Desktop Control dependencies.
- [x] Capture review notes and session memory.

## Review (2026-02-06) - ClawHub Desktop Control Install
- [x] Downloaded archive to `System/Reports/Codex/tmp/desktop-control-20260206/desktop-control-1.0.0.zip` with SHA-256 `6ea60cb5f6d243e1bad66dfe9155f1d5693f62ebbeec3be3d5b615bf301455ac`.
- [x] Extracted and scanned package contents (`7 files`) and did a red-flag grep pass; no direct network/exfil or runtime download logic found in source.
- [x] Confirmed `openclaw plugins install` is for plugins and does not register this skill; installed correctly via `npx clawhub install desktop-control` to `skills/desktop-control`.
- [x] Verified OpenClaw sees the skill as ready: `openclaw skills info desktop-control` and `openclaw skills check` show `desktop-control` as `✓ Ready` (`openclaw-workspace`).
- [x] Created dedicated Windows venv at `C:\Users\aleks\.openclaw\venvs\desktop-control` and installed: `pyautogui`, `pillow`, `opencv-python`, `pygetwindow`, `pyperclip`.
- [x] Captured environment freeze at `System/Reports/Codex/tmp/desktop-control-20260206/venv-freeze.txt` and validated imports (`IMPORT_OK`).
- [x] VT CLI exists but is not authenticated in this shell (`vt scan` requires API key); ClawHub marketplace scan remains available on the listing.

## Autonomy Upgrade: Heartbeat + Boundaries (2026-02-09)
- [x] Strengthen `HEARTBEAT.md` with proactive, actionable heartbeat behavior (checks, auto-action policy, alert format).
- [x] Define explicit act-without-asking guardrails in `BONES.md`.
- [x] Keep external/destructive actions gated behind explicit approval.
- [x] Capture review notes.

## Review (2026-02-09) - Autonomy Upgrade: Heartbeat + Boundaries
- [x] `HEARTBEAT.md` now enforces useful cycles: runtime health quick-check, memory drift repair, conflict-only calendar reporting, decision-only message alerts.
- [x] Added anti-noise policy (`no duplicate alerts unless severity changed`) and concise actionable alert structure.
- [x] `BONES.md` now contains explicit autonomy boundaries for low-risk autonomous execution vs approval-required actions.
- [x] Preserved safety guardrails: no external/public sends and no destructive edits without explicit user instruction.
