# Lessons

- For any `delivery.mode=announce` cron job, enforce the transport identity-header contract in the prompt (`CCDR → reports to Raz (SECWAR) → session: agent:main:cron:<job_id>`) with exact exemptions only for `NO_REPLY`/`HEARTBEAT_OK`; otherwise response-lint drift will recur.
- VS Code background tasks: problemMatcher must be schema-valid (regexp + file/line/column groups). Otherwise VS Code errors with "description can't be converted into a problem matcher". Use a proper pattern or remove the matcher.
- When a user corrects a path or naming detail (e.g., `TaskNotes/_Archive`), immediately update configs and any plan/spec text to match the corrected path.
- For Obsidian callouts, use the official foldable syntax (`> [!type]-`) and verify against docs before reformatting chat outputs.
- For Obsidian Web Clipper runtime errors, confirm browser-side toggles (especially Interpreter on/off) before deep template surgery; the toggle state can mimic template crashes.
- When OpenClaw doctor shows a Windows gateway entrypoint mismatch with missing backslashes (`C:Users...`), inspect the task script parser before rewriting Scheduled Tasks; malformed parsing can be the real bug, not the task action.
- For OpenClaw bootstrap template errors, verify fallback path math (`../docs/reference/templates` vs `../../...`) and require file-level checks before selecting a template directory; directory existence alone is insufficient.
- When OpenClaw reports missing Anthropic API key unexpectedly, run `openclaw models list` first: if the configured primary model is tagged `missing`, switch primary to an auth-ready model and restart gateway before touching auth stores.
- If OpenClaw CLI appears stalled from WSL, verify daemon/gateway state and retry health commands via PowerShell; this can distinguish shell transport issues from runtime failures.
- For cron/system maintenance prompts, do not load a skill unless the task explicitly requires specialized skill behavior; unnecessary skill-file reads can leak large internal text into user-visible chat.
- On Windows/pwsh hosts, never use bash-only syntax (`&&`, `python - <<'PY'`, `if [ -f ... ]`, `head -n`); use PowerShell-safe separators/constructs or invoke `bash -lc` explicitly.
- Before `git checkout master` in nightly automation, run a quick dirty-worktree preflight; stash only the minimum tracked files that block checkout (avoid broad `stash -u` on large vaults).
- Treat any “implemented” claim as `UNVERIFIED` until checkpoint artifact path + optest output are attached in the same execution slice.
- When searching paths containing spaces (for example `RAZSOC Duty Board.md`), quote paths or use `rg --glob` to avoid false missing-file errors on Windows.
- For diagnostic-only cron prompts with explicit command allowlists, execute only the listed checks; do not add extra file reads/skill loads/sweeps that expand scope or leak internals.
- On pwsh hosts, if Python multiline logic is needed, use `python -c` or write a temp `.py` file; never use bash heredoc forms (`python - <<'PY'`).
- Before reporting a CLI lane as healthy on Windows, run a command-availability preflight (`Get-Command <tool>`) for each required binary (for example `gh`, `gog`, `summarize`, `nano-pdf`) and classify missing tools as explicit blockers instead of retrying failing calls.
- When multiple transcript shards of the same session exist (for example `_4`, `_5`, `_6` variants), treat them as one evidence stream during reviews to avoid duplicate-learning inflation and repeated blocker counts.
