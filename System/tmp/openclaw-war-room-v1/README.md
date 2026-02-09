# OpenClaw War Room v1 (Visual First Pass)

This is the first browser-based visual pass for a cinematic OpenClaw wallboard.

## Preview URL (local)

From this folder:

```powershell
python -m http.server 8899
```

Open:

- http://127.0.0.1:8899/

## What v1 includes

- Original war-room visual style (no VoxYZ assets/branding)
- Agent presence cards
- Live event feed panel
- Mission pulse panel
- Dark dashboard layout optimized for wallboard view
- Demo ticker to validate interaction rhythm

## v1 -> v2 real-time wiring plan

### Phase 1 (done)
- Frontend shell and visual language
- Event card and status components
- Mission/presence scaffolding

### Phase 2 (next)
- Add a **read-only relay** process between Gateway and browser
- Relay subscribes privately to Gateway events (presence + agent stream)
- Browser consumes relay stream via SSE/WebSocket
- Sanitize payloads (strip sensitive tool args/results)

### Phase 3
- Add time filters, lane filters (tasks/social), per-agent drilldown
- Add event replay timeline and mission trace view
- Add public-view mode with stricter redaction profile

## Data contract (target)

```json
{
  "agent": "main",
  "stream": "tool|assistant|lifecycle|presence",
  "ts": 1770667200000,
  "summary": "tool end: web_search (ok)",
  "state": "active|idle|stale",
  "runId": "...",
  "sessionKey": "agent:main:main"
}
```

## Safety baseline

- Keep this view read-only.
- Do not expose Gateway admin controls to public clients.
- Token stays server-side in the relay; browser gets sanitized events only.
