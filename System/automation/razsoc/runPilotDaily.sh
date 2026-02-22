#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
RAZSOC ClawVault Shadow Pilot - Daily Runner

Usage:
  bash System/automation/razsoc/runPilotDaily.sh
  bash System/automation/razsoc/runPilotDaily.sh --continue-on-error

Options:
  --continue-on-error   Run all steps and return non-zero at end if any step fails.
  -h, --help            Show this help.
EOF
}

CONTINUE_ON_ERROR=0
for arg in "$@"; do
  case "$arg" in
    --continue-on-error)
      CONTINUE_ON_ERROR=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"
TODAY_ET="$(TZ=America/New_York date +%F)"

declare -a FAILURES=()

run_step() {
  local label="$1"
  shift

  local start_ts
  start_ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  echo
  echo "==> $label"
  echo "    cmd: $*"

  set +e
  "$@"
  local exit_code=$?
  set -e

  if [[ "$exit_code" -eq 0 ]]; then
    echo "    status: OK"
    return 0
  fi

  echo "    status: FAIL (exit $exit_code)"
  FAILURES+=("$label|$exit_code|$start_ts|$*")

  if [[ "$CONTINUE_ON_ERROR" -eq 0 ]]; then
    echo
    echo "Stopped on first failure. Re-run with --continue-on-error to collect all failures."
    exit "$exit_code"
  fi

  return 0
}

echo "RAZSOC daily pilot runner"
echo "root: $ROOT_DIR"
echo "mode: $([[ "$CONTINUE_ON_ERROR" -eq 1 ]] && echo 'continue-on-error' || echo 'fail-fast')"
echo "target_date_et: $TODAY_ET"

run_step "Auto-remediate OpenClaw gateway startup guard drift" \
  node System/automation/openclaw/remediateGatewayStartupGuards.js

run_step "Run full-stack degradation diagnostics (daily strict gate)" \
  bash System/automation/razsoc/runDegradationDiagnostics.sh --profile=daily --strict --auto-fix=safe

run_step "Sync ClawVault mirror into Ops/RAZSOC" \
  node System/automation/razsoc/syncClawVaultToRazsoc.js

run_step "Materialize approval queue into decision notes" \
  node System/automation/razsoc/syncApprovalsQueueToNotes.js

run_step "Materialize lessons log into lesson notes" \
  python3 System/automation/razsoc/syncLessonsFromTaskLessons.py

run_step "Route dreams/experiences/conversation into decision-task packets" \
  node System/automation/razsoc/routeInsightsToExecution.js --date="$TODAY_ET" --timezone=America/New_York

run_step "Publish CCDR insight command deck for subordinate lanes" \
  node System/automation/razsoc/publishInsightCommandDeck.js --date="$TODAY_ET" --timezone=America/New_York

run_step "Enforce insight closeout gate (fail-closed)" \
  node System/automation/razsoc/enforceInsightCloseoutGate.js

run_step "Validate typed-memory templates (strict)" \
  python3 System/automation/razsoc/validateTemplateSchema.py --strict

run_step "Validate typed memory schema (strict)" \
  python3 System/automation/razsoc/validateMemorySchema.py --strict

run_step "Validate memory filename policy (strict)" \
  python3 System/automation/razsoc/validateMemoryNaming.py --strict --ensure-today-gpt

run_step "Check duplicate-write telemetry" \
  python3 System/automation/razsoc/detectMemoryDuplicates.py

run_step "Run 10-query gold recall suite" \
  python3 System/automation/razsoc/runGoldRecallSuite.py

run_step "Generate mission-control contract parity status" \
  node System/automation/razsoc/missionControlContractParity.js

run_step "Evaluate pilot guardrails (strict)" \
  python3 System/automation/razsoc/evaluatePilotGuardrails.py --strict

run_step "Run secret publish guard (strict)" \
  python3 System/automation/razsoc/secretPublishGuard.py --strict

run_step "Run skill-graph advisory routing status" \
  python3 System/automation/razsoc/runSkillGraphAdvisory.py

echo
echo "Latest reports:"
echo "  - System/Reports/Codex/status/degradation-diagnostics-latest.md"
echo "  - System/Reports/Codex/status/template-schema-validation-latest.md"
echo "  - System/Reports/Codex/status/insight-router-latest.md"
echo "  - System/Reports/Codex/status/ccdr-insight-command-latest.md"
echo "  - System/Reports/Codex/status/insight-closeout-gate-latest.md"
echo "  - System/Reports/Codex/status/memory-schema-validation-latest.md"
echo "  - System/Reports/Codex/status/memory-naming-validation-latest.md"
echo "  - System/Reports/Codex/status/clawvault-duplicate-telemetry-latest.md"
echo "  - System/Reports/Codex/status/gold-recall-suite-latest.md"
echo "  - System/Reports/Codex/status/mission-control-contract-latest.md"
echo "  - System/Reports/Codex/status/clawvault-shadow-pilot-guardrail-latest.md"
echo "  - System/Reports/Codex/status/secret-publish-guard-latest.md"
echo "  - System/Reports/Codex/status/skill-graph-advisory-latest.md"

if [[ "${#FAILURES[@]}" -gt 0 ]]; then
  echo
  echo "Failures:"
  for item in "${FAILURES[@]}"; do
    IFS='|' read -r label code started cmd <<<"$item"
    echo "  - [$started] $label (exit $code)"
    echo "    cmd: $cmd"
  done
  exit 1
fi

echo
echo "Pilot daily run completed successfully."
