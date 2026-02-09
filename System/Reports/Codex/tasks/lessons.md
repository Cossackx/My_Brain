# Lessons

- VS Code background tasks: problemMatcher must be schema-valid (regexp + file/line/column groups). Otherwise VS Code errors with "description can't be converted into a problem matcher". Use a proper pattern or remove the matcher.
- When a user corrects a path or naming detail (e.g., `TaskNotes/_Archive`), immediately update configs and any plan/spec text to match the corrected path.
- For Obsidian callouts, use the official foldable syntax (`> [!type]-`) and verify against docs before reformatting chat outputs.
- For Obsidian Web Clipper runtime errors, confirm browser-side toggles (especially Interpreter on/off) before deep template surgery; the toggle state can mimic template crashes.
- When OpenClaw doctor shows a Windows gateway entrypoint mismatch with missing backslashes (`C:Users...`), inspect the task script parser before rewriting Scheduled Tasks; malformed parsing can be the real bug, not the task action.
- For OpenClaw bootstrap template errors, verify fallback path math (`../docs/reference/templates` vs `../../...`) and require file-level checks before selecting a template directory; directory existence alone is insufficient.
- When OpenClaw reports missing Anthropic API key unexpectedly, run `openclaw models list` first: if the configured primary model is tagged `missing`, switch primary to an auth-ready model and restart gateway before touching auth stores.
- If OpenClaw CLI appears stalled from WSL, verify daemon/gateway state and retry health commands via PowerShell; this can distinguish shell transport issues from runtime failures.
- For cron/system maintenance prompts, do not load a skill unless the task explicitly requires specialized skill behavior; unnecessary skill-file reads can leak large internal text into user-visible chat.
