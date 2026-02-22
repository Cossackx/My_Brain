#!/usr/bin/env node
/*
RAZSOC Full-Stack Degradation Diagnostics

Usage:
  node System/automation/razsoc/runDegradationDiagnostics.js --profile daily --strict --auto-fix safe
  node System/automation/razsoc/runDegradationDiagnostics.js --profile startup --auto-fix off
*/

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const PROFILE_VALUES = new Set(['startup', 'hourly', 'daily', 'post-change', 'incident']);
const AUTO_FIX_VALUES = new Set(['safe', 'off']);
const SEVERITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3, none: 99 };

const DEFAULT_CONTRACT = {
  contract_version: 'v1.0',
  profiles: {
    startup: {
      checks: [
        'runtime_versions_cross_context',
        'gateway_reachability_cross_context',
        'launcher_guard_integrity',
        'runtime_policy_alignment',
        'layer_stack_parity',
        'managed_source_daily_lite',
        'artifact_freshness',
      ],
    },
    hourly: {
      checks: [
        'runtime_versions_cross_context',
        'gateway_reachability_cross_context',
        'managed_source_daily_lite',
        'artifact_freshness',
      ],
    },
    daily: {
      checks: [
        'runtime_versions_cross_context',
        'gateway_reachability_cross_context',
        'launcher_guard_integrity',
        'runtime_policy_alignment',
        'governance_conformance',
        'workflow_lint',
        'reporting_requirements_lint',
        'instruction_enforcement_lint',
        'layer_stack_parity',
        'memory_schema_contract',
        'memory_naming_policy',
        'memory_duplicates_telemetry',
        'gold_recall_suite',
        'pilot_guardrail_status',
        'secret_publish_guard',
        'mission_control_contract',
        'insight_closeout_gate',
        'obsidian_control_center_drift',
        'command_center_bases_presence',
        'template_schema_contract',
        'clipper_json_integrity',
        'pkm_note_contract',
        'skill_mirror_hygiene',
        'managed_source_daily_lite',
        'latest_alias_integrity',
        'artifact_freshness',
      ],
    },
    'post-change': {
      checks: [
        'runtime_versions_cross_context',
        'gateway_reachability_cross_context',
        'launcher_guard_integrity',
        'runtime_policy_alignment',
        'governance_conformance',
        'workflow_lint',
        'reporting_requirements_lint',
        'instruction_enforcement_lint',
        'layer_stack_parity',
        'obsidian_control_center_drift',
        'command_center_bases_presence',
        'template_schema_contract',
        'clipper_json_integrity',
        'pkm_note_contract',
        'skill_mirror_hygiene',
        'managed_source_daily_lite',
        'managed_source_full_optest',
        'latest_alias_integrity',
        'artifact_freshness',
      ],
    },
    incident: {
      checks: [
        'runtime_versions_cross_context',
        'gateway_reachability_cross_context',
        'launcher_guard_integrity',
        'runtime_policy_alignment',
        'governance_conformance',
        'workflow_lint',
        'reporting_requirements_lint',
        'instruction_enforcement_lint',
        'layer_stack_parity',
        'memory_schema_contract',
        'memory_naming_policy',
        'memory_duplicates_telemetry',
        'gold_recall_suite',
        'pilot_guardrail_status',
        'secret_publish_guard',
        'mission_control_contract',
        'insight_closeout_gate',
        'obsidian_control_center_drift',
        'command_center_bases_presence',
        'template_schema_contract',
        'clipper_json_integrity',
        'pkm_note_contract',
        'skill_mirror_hygiene',
        'managed_source_daily_lite',
        'latest_alias_integrity',
        'artifact_freshness',
      ],
    },
  },
  severity_thresholds: {
    strict_fail_levels_by_profile: {
      startup: ['P0', 'P1'],
      hourly: ['P0', 'P1'],
      daily: ['P0', 'P1'],
      'post-change': ['P0', 'P1'],
      incident: ['P0', 'P1'],
    },
    p2_fail_count_by_profile: {
      startup: 999,
      hourly: 999,
      daily: 1,
      'post-change': 1,
      incident: 1,
    },
  },
  safe_auto_fix_allowlist: [
    {
      id: 'gateway_reachability_cross_context',
      command: 'node System/automation/openclaw/remediateGatewayCrossContext.js',
      reversible: true,
    },
    {
      id: 'launcher_guard_integrity',
      command: 'node System/automation/openclaw/remediateGatewayStartupGuards.js',
      reversible: true,
    },
    {
      id: 'memory_naming_policy',
      command: 'python3 System/automation/razsoc/validateMemoryNaming.py --strict --ensure-today-gpt',
      reversible: true,
    },
    {
      id: 'latest_alias_integrity',
      command: 'internal:rebuild_latest_aliases',
      reversible: true,
    },
    {
      id: 'skill_mirror_hygiene',
      command: 'internal:mirror_sync_missing_only',
      reversible: true,
      flag_required: 'allow_mirror_sync',
    },
  ],
  freshness_slas: {
    report_latest_max_age_hours: {
      'System/Reports/Codex/status/template-schema-validation-latest.json': 30,
      'System/Reports/Codex/status/memory-schema-validation-latest.json': 30,
      'System/Reports/Codex/status/memory-naming-validation-latest.json': 30,
      'System/Reports/Codex/status/clawvault-duplicate-telemetry-latest.json': 30,
      'System/Reports/Codex/status/gold-recall-suite-latest.json': 30,
      'System/Reports/Codex/status/clawvault-shadow-pilot-guardrail-latest.json': 30,
      'System/Reports/Codex/status/secret-publish-guard-latest.json': 30,
      'System/Reports/Codex/status/mission-control-contract-latest.json': 30,
      'System/Reports/Codex/status/insight-closeout-gate-latest.json': 30,
      'System/Reports/Codex/status/workspace-hygiene-latest.md': 30,
      'System/Reports/Codex/status/degradation-diagnostics-latest.json': 30,
    },
    managed_source_max_age_hours: {
      openclaw_deck: 168,
      arscontexta: 168,
      hyperagent: 168,
    },
  },
};

const CHECK_REGISTRY = [
  {
    id: 'runtime_versions_cross_context',
    domain: 'runtime',
    place: 'wsl+windows',
    situations: ['startup', 'hourly', 'daily', 'incident', 'post-change'],
    run: runRuntimeVersionsCrossContext,
  },
  {
    id: 'gateway_reachability_cross_context',
    domain: 'runtime',
    place: 'wsl+windows',
    situations: ['startup', 'hourly', 'daily', 'incident', 'post-change'],
    run: runGatewayReachabilityCrossContext,
  },
  {
    id: 'launcher_guard_integrity',
    domain: 'runtime',
    place: 'windows_runtime_files',
    situations: ['startup', 'daily', 'post-change', 'incident'],
    run: runLauncherGuardIntegrity,
  },
  {
    id: 'runtime_policy_alignment',
    domain: 'runtime',
    place: 'openclaw_config',
    situations: ['startup', 'daily', 'post-change', 'incident'],
    run: runRuntimePolicyAlignment,
  },
  {
    id: 'governance_conformance',
    domain: 'governance',
    place: 'vault_policy_roles',
    situations: ['daily', 'post-change', 'incident'],
    run: runGovernanceConformance,
  },
  {
    id: 'workflow_lint',
    domain: 'governance',
    place: 'workflow_contracts',
    situations: ['daily', 'post-change', 'incident'],
    run: runWorkflowLint,
  },
  {
    id: 'reporting_requirements_lint',
    domain: 'governance',
    place: 'reporting_chain_contract',
    situations: ['daily', 'post-change', 'incident'],
    run: runReportingRequirementsLint,
  },
  {
    id: 'instruction_enforcement_lint',
    domain: 'governance',
    place: 'instruction_enforcement_contract',
    situations: ['daily', 'post-change', 'incident'],
    run: runInstructionEnforcementLint,
  },
  {
    id: 'layer_stack_parity',
    domain: 'governance',
    place: 'template_runtime_layer_stack',
    situations: ['startup', 'daily', 'post-change', 'incident'],
    run: runLayerStackParity,
  },
  {
    id: 'memory_schema_contract',
    domain: 'pkm',
    place: 'typed_memory_schema',
    situations: ['daily', 'incident'],
    run: runMemorySchemaContract,
  },
  {
    id: 'memory_naming_policy',
    domain: 'pkm',
    place: 'memory_filename_contract',
    situations: ['daily', 'incident'],
    run: runMemoryNamingPolicy,
  },
  {
    id: 'memory_duplicates_telemetry',
    domain: 'pkm',
    place: 'memory_duplicate_guard',
    situations: ['daily', 'incident'],
    run: runMemoryDuplicatesTelemetry,
  },
  {
    id: 'gold_recall_suite',
    domain: 'pkm',
    place: 'memory_recall_quality',
    situations: ['daily', 'incident'],
    run: runGoldRecallSuite,
  },
  {
    id: 'pilot_guardrail_status',
    domain: 'pkm',
    place: 'shadow_pilot_guardrails',
    situations: ['daily', 'incident'],
    run: runPilotGuardrailStatus,
  },
  {
    id: 'secret_publish_guard',
    domain: 'security',
    place: 'vault_publish_surfaces',
    situations: ['daily', 'incident'],
    run: runSecretPublishGuard,
  },
  {
    id: 'mission_control_contract',
    domain: 'governance',
    place: 'mission_control_contract',
    situations: ['daily', 'incident'],
    run: runMissionControlContract,
  },
  {
    id: 'insight_closeout_gate',
    domain: 'governance',
    place: 'insight_closeout_state',
    situations: ['daily', 'incident'],
    run: runInsightCloseoutGate,
  },
  {
    id: 'obsidian_control_center_drift',
    domain: 'obsidian',
    place: 'control_center_plugin_surface',
    situations: ['daily', 'post-change', 'incident'],
    run: runObsidianControlCenterDrift,
  },
  {
    id: 'command_center_bases_presence',
    domain: 'obsidian',
    place: 'command_center_bases',
    situations: ['daily', 'post-change', 'incident'],
    run: runCommandCenterBasesPresence,
  },
  {
    id: 'template_schema_contract',
    domain: 'pkm',
    place: 'template_contract',
    situations: ['daily', 'post-change', 'incident'],
    run: runTemplateSchemaContract,
  },
  {
    id: 'clipper_json_integrity',
    domain: 'obsidian',
    place: 'web_clipper_templates',
    situations: ['daily', 'post-change', 'incident'],
    run: runClipperJsonIntegrity,
  },
  {
    id: 'pkm_note_contract',
    domain: 'pkm',
    place: 'notes_razsoc_contract',
    situations: ['daily', 'post-change', 'incident'],
    run: runPkmNoteContract,
  },
  {
    id: 'skill_mirror_hygiene',
    domain: 'hygiene',
    place: 'skills_mirrors',
    situations: ['daily', 'post-change', 'incident'],
    run: runSkillMirrorHygiene,
  },
  {
    id: 'managed_source_daily_lite',
    domain: 'managed_sources',
    place: 'deck_ars_hyperagent',
    situations: ['startup', 'hourly', 'daily', 'post-change', 'incident'],
    run: runManagedSourceDailyLite,
  },
  {
    id: 'managed_source_full_optest',
    domain: 'managed_sources',
    place: 'deck_ars_hyperagent',
    situations: ['post-change', 'incident'],
    run: runManagedSourceFullOptest,
  },
  {
    id: 'latest_alias_integrity',
    domain: 'reporting',
    place: 'status_latest_aliases',
    situations: ['daily', 'post-change', 'incident'],
    run: runLatestAliasIntegrity,
  },
  {
    id: 'artifact_freshness',
    domain: 'reporting',
    place: 'status_artifacts',
    situations: ['startup', 'hourly', 'daily', 'post-change', 'incident'],
    run: runArtifactFreshness,
  },
];

function parseArgs(argv) {
  const out = {
    profile: 'daily',
    strict: false,
    autoFix: 'safe',
    root: path.resolve(__dirname, '..', '..', '..'),
    allowMirrorSync: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--strict') {
      out.strict = true;
      continue;
    }

    if (arg === '--allow-mirror-sync') {
      out.allowMirrorSync = true;
      continue;
    }

    if (arg.startsWith('--profile=')) {
      out.profile = arg.split('=', 2)[1];
      continue;
    }

    if (arg === '--profile' && argv[i + 1]) {
      out.profile = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith('--auto-fix=')) {
      out.autoFix = arg.split('=', 2)[1];
      continue;
    }

    if (arg === '--auto-fix' && argv[i + 1]) {
      out.autoFix = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith('--root=')) {
      out.root = path.resolve(arg.split('=', 2)[1]);
      continue;
    }

    if (arg === '--root' && argv[i + 1]) {
      out.root = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!PROFILE_VALUES.has(out.profile)) {
    throw new Error(`Invalid --profile: ${out.profile}`);
  }

  if (!AUTO_FIX_VALUES.has(out.autoFix)) {
    throw new Error(`Invalid --auto-fix: ${out.autoFix}`);
  }

  return out;
}

function printUsage() {
  const text = [
    'RAZSOC Full-Stack Degradation Diagnostics',
    '',
    'Usage:',
    '  node System/automation/razsoc/runDegradationDiagnostics.js --profile <startup|hourly|daily|post-change|incident> [--strict] [--auto-fix safe|off] [--allow-mirror-sync]',
    '',
    'Options:',
    '  --profile            Diagnostics profile selector',
    '  --strict             Enforce strict non-zero exit gate policy',
    '  --auto-fix           safe|off (default: safe)',
    '  --allow-mirror-sync  Allow optional skill mirror safe auto-fix',
    '  --root               Override workspace root (test harness)',
  ];
  process.stdout.write(`${text.join('\n')}\n`);
}

function toPosix(p) {
  return String(p || '').split(path.sep).join('/');
}

function nowIso() {
  return new Date().toISOString();
}

function nowStamp() {
  const d = new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function firstLine(text) {
  const s = String(text || '').trim();
  return s ? s.split(/\r?\n/, 1)[0] : '';
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(absPath) {
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function runProcess(command, args, options = {}) {
  const started = Date.now();
  let run;
  try {
    run = cp.spawnSync(command, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      timeout: options.timeoutMs || 180000,
      maxBuffer: 12 * 1024 * 1024,
      shell: false,
      windowsHide: true,
    });
  } catch (error) {
    return {
      command: [command, ...args].join(' '),
      exit_code: 1,
      ok: false,
      stdout: '',
      stderr: String(error && error.message ? error.message : error),
      error: String(error && error.code ? error.code : 'spawn_error'),
      duration_ms: Date.now() - started,
    };
  }

  return {
    command: [command, ...args].join(' '),
    exit_code: Number.isInteger(run.status) ? run.status : (run.error ? 1 : 0),
    ok: Number.isInteger(run.status) ? run.status === 0 : !run.error,
    stdout: String(run.stdout || ''),
    stderr: String(run.stderr || ''),
    error: run.error ? String(run.error.code || run.error.message || run.error) : '',
    duration_ms: Date.now() - started,
  };
}

function runBash(command, ctx, timeoutMs = 180000) {
  return runProcess('bash', ['-lc', command], { cwd: ctx.root, timeoutMs });
}

function runCmdExe(command, timeoutMs = 180000) {
  return runProcess('cmd.exe', ['/d', '/c', command], { timeoutMs });
}

function isTransientGatewayHealthFailure(run) {
  const haystack = `${run.stderr || ''}\n${run.stdout || ''}\n${run.error || ''}`.toLowerCase();
  return [
    '1006 abnormal closure',
    'gateway closed',
    'socket hang up',
    'econnrefused',
    'etimedout',
    'timed out',
  ].some((token) => haystack.includes(token));
}

function runGatewayHealthProbe(runFn) {
  const attempts = [];

  const first = runFn('openclaw gateway health');
  attempts.push({ mode: 'text', run: first });
  if (first.ok) return { best: first, attempts };

  if (isTransientGatewayHealthFailure(first)) {
    const retry = runFn('openclaw gateway health');
    attempts.push({ mode: 'text_retry', run: retry });
    if (retry.ok) return { best: retry, attempts };
  }

  const jsonFallback = runFn('openclaw gateway health --json');
  attempts.push({ mode: 'json', run: jsonFallback });
  if (jsonFallback.ok) return { best: jsonFallback, attempts };

  return { best: attempts[attempts.length - 1].run, attempts };
}

function runNodeScript(relScript, ctx, args = [], timeoutMs = 180000) {
  const abs = path.join(ctx.root, relScript);
  return runProcess(process.execPath, [abs, ...args], { cwd: ctx.root, timeoutMs });
}

function runPythonScript(relScript, ctx, args = [], timeoutMs = 180000) {
  const abs = path.join(ctx.root, relScript);
  return runProcess('python3', [abs, ...args], { cwd: ctx.root, timeoutMs });
}

function extractVersion(text) {
  const src = String(text || '');
  const patterns = [
    /(\d{4}\.\d+\.\d+)/,
    /v?(\d+\.\d+\.\d+)/,
    /version\s*[:=]\s*([0-9A-Za-z._-]+)/i,
  ];
  for (const rx of patterns) {
    const m = src.match(rx);
    if (m) return m[1];
  }
  return firstLine(src) || '';
}

function severityCompare(a, b) {
  const av = SEVERITY_ORDER[a] ?? SEVERITY_ORDER.none;
  const bv = SEVERITY_ORDER[b] ?? SEVERITY_ORDER.none;
  return av - bv;
}

function maxSeverity(items) {
  if (!Array.isArray(items) || items.length === 0) return 'none';
  let worst = 'none';
  for (const item of items) {
    const sev = item && item.severity ? item.severity : 'none';
    if (severityCompare(sev, worst) < 0) worst = sev;
  }
  return worst;
}

function deepMerge(base, overlay) {
  if (!overlay || typeof overlay !== 'object') return base;
  if (!base || typeof base !== 'object') return overlay;

  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (Array.isArray(value)) {
      out[key] = [...value];
      continue;
    }
    if (value && typeof value === 'object') {
      out[key] = deepMerge(out[key] && typeof out[key] === 'object' ? out[key] : {}, value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function loadPolicy(root) {
  const policyPath = path.join(root, 'System', 'Config', 'razsoc_policy.yaml');
  if (!fs.existsSync(policyPath)) {
    return { policy: {}, warnings: [`missing policy file: ${toPosix(path.relative(root, policyPath))}`] };
  }

  const parser = [
    'import json, sys',
    'import yaml',
    'with open(sys.argv[1], "r", encoding="utf-8") as fh:',
    '  data = yaml.safe_load(fh.read()) or {}',
    'print(json.dumps(data))',
  ].join('\n');

  const run = runProcess('python3', ['-c', parser, policyPath], { cwd: root, timeoutMs: 20000 });
  if (!run.ok) {
    return {
      policy: {},
      warnings: [
        `failed to parse policy yaml via python: ${firstLine(run.stderr || run.stdout || run.error)}`,
      ],
    };
  }

  try {
    return { policy: JSON.parse(run.stdout), warnings: [] };
  } catch (error) {
    return {
      policy: {},
      warnings: [`failed to decode policy json bridge: ${String(error && error.message ? error.message : error)}`],
    };
  }
}

function resolveContract(policy) {
  const section = policy && typeof policy === 'object' ? (policy.degradation_diagnostics || {}) : {};
  return deepMerge(DEFAULT_CONTRACT, section);
}

function normalizeAllowlist(contract) {
  const list = Array.isArray(contract.safe_auto_fix_allowlist)
    ? contract.safe_auto_fix_allowlist
    : [];

  const byId = new Map();
  for (const item of list) {
    if (typeof item === 'string') {
      byId.set(item, { id: item });
      continue;
    }
    if (!item || typeof item !== 'object' || !item.id) continue;
    byId.set(String(item.id), { ...item });
  }
  return byId;
}

function formatCommandResult(run) {
  const tail = firstLine(run.stderr || run.stdout || run.error || '');
  return `${run.command} -> exit ${run.exit_code}${tail ? ` (${tail})` : ''}`;
}

function baseCheckResult(check, status, severity, summary, details = [], extra = {}) {
  return {
    id: check.id,
    domain: check.domain,
    place: check.place,
    situations: check.situations,
    status,
    severity,
    summary,
    details,
    signatures: extra.signatures || [],
    evidence_ref: extra.evidence_ref || [],
    remediation: extra.remediation || {
      eligible: false,
      attempted: false,
      status: 'not_applicable',
      handler: null,
      notes: [],
      blocked_short_draft: null,
    },
    auto_fix_context: extra.auto_fix_context || {},
    raw: extra.raw || null,
  };
}

function passResult(check, summary, details = [], extra = {}) {
  return baseCheckResult(check, 'pass', 'none', summary, details, extra);
}

function failResult(check, severity, summary, details = [], extra = {}) {
  return baseCheckResult(check, 'fail', severity, summary, details, extra);
}

function warningResult(check, severity, summary, details = [], extra = {}) {
  return baseCheckResult(check, 'warn', severity, summary, details, extra);
}

function listMissingMarkers(filePath, markers) {
  if (!fs.existsSync(filePath)) {
    return markers.map((m) => `missing_file:${toPosix(filePath)} -> marker:${m}`);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  const misses = [];
  for (const marker of markers) {
    if (!text.includes(marker)) misses.push(`${toPosix(filePath)} -> missing marker: ${marker}`);
  }
  return misses;
}

function resolveOpenClawConfigPath(ctx) {
  const home = os.homedir();
  const candidates = [
    process.env.OPENCLAW_CONFIG_PATH,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.openclaw', 'openclaw.json') : '',
    process.env.HOME ? path.join(process.env.HOME, '.openclaw', 'openclaw.json') : '',
    path.join(home, '.openclaw', 'openclaw.json'),
    '/mnt/c/Users/aleks/.openclaw/openclaw.json',
    'C:/Users/aleks/.openclaw/openclaw.json',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeCrossPlatformPath(candidate);
    if (fs.existsSync(normalized)) return normalized;
  }

  return normalizeCrossPlatformPath('/mnt/c/Users/aleks/.openclaw/openclaw.json');
}

function normalizeCrossPlatformPath(inputPath) {
  const raw = String(inputPath || '').trim();
  if (!raw) return raw;
  if (process.platform === 'win32' && raw.startsWith('/mnt/c/')) {
    return `C:/${raw.slice('/mnt/c/'.length)}`;
  }
  if (process.platform !== 'win32' && /^[A-Za-z]:\//.test(raw)) {
    const drive = raw[0].toLowerCase();
    return `/mnt/${drive}/${raw.slice(3)}`;
  }
  return raw;
}

function resolveOpenClawStateDir() {
  const candidates = [
    process.env.OPENCLAW_STATE_DIR,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.openclaw') : '',
    process.env.HOME ? path.join(process.env.HOME, '.openclaw') : '',
    '/mnt/c/Users/aleks/.openclaw',
    'C:/Users/aleks/.openclaw',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeCrossPlatformPath(candidate);
    if (fs.existsSync(normalized)) return normalized;
  }
  return normalizeCrossPlatformPath('/mnt/c/Users/aleks/.openclaw');
}

function resolveOpenClawSkillsDir() {
  const candidates = [
    process.env.OPENCLAW_SKILLS_DIR,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.openclaw', 'skills') : '',
    process.env.HOME ? path.join(process.env.HOME, '.openclaw', 'skills') : '',
    '/mnt/c/Users/aleks/.openclaw/skills',
    'C:/Users/aleks/.openclaw/skills',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeCrossPlatformPath(candidate);
    if (fs.existsSync(normalized)) return normalized;
  }
  return normalizeCrossPlatformPath('/mnt/c/Users/aleks/.openclaw/skills');
}

function collectReportAliasSpec() {
  return [
    { prefix: 'template-schema-validation', hasJson: true, hasMd: true },
    { prefix: 'memory-schema-validation', hasJson: true, hasMd: true },
    { prefix: 'memory-naming-validation', hasJson: true, hasMd: true },
    { prefix: 'clawvault-duplicate-telemetry', hasJson: true, hasMd: true },
    { prefix: 'gold-recall-suite', hasJson: true, hasMd: true },
    { prefix: 'clawvault-shadow-pilot-guardrail', hasJson: true, hasMd: true },
    { prefix: 'secret-publish-guard', hasJson: true, hasMd: true },
    { prefix: 'mission-control-contract', hasJson: true, hasMd: true },
    { prefix: 'insight-closeout-gate', hasJson: true, hasMd: true },
    { prefix: 'workspace-hygiene', hasJson: false, hasMd: true },
  ];
}

function getManagedSourcePaths(ctx) {
  const policyRuntime = (((ctx.policy || {}).runtime_controls) || {});
  const deck = (((policyRuntime.openclaw_deck || {}).managed_source_path) || 'System/_codex_downloads/openclaw-deck');
  const ars = (((policyRuntime.openclaw_arscontexta || {}).managed_source_path) || 'System/_codex_downloads/arscontexta');
  const hyper = (((policyRuntime.openclaw_hyperagent || {}).managed_source_path) || 'System/_codex_downloads/hyperagent');

  return {
    openclaw_deck: path.join(ctx.root, deck),
    arscontexta: path.join(ctx.root, ars),
    hyperagent: path.join(ctx.root, hyper),
  };
}

function readLatestMemoryNamingErrors(ctx) {
  const latest = path.join(ctx.statusDir, 'memory-naming-validation-latest.json');
  const payload = readJsonSafe(latest);
  if (!payload || typeof payload !== 'object') return {};
  return payload.errors_by_type || {};
}

function pickMemoryNamingSeverity(errorMap) {
  const highRisk = [
    'legacy_missing_redirect_stub',
    'legacy_bad_redirect_prefix',
    'legacy_bad_redirect_target_name',
    'legacy_missing_redirect_target',
  ];

  const moderate = [
    'unknown_memory_filename_pattern',
    'missing_required_gpt_chat_today',
    'missing_required_gpt_chat_yesterday',
  ];

  for (const key of highRisk) {
    if (Number(errorMap[key] || 0) > 0) return 'P1';
  }
  for (const key of moderate) {
    if (Number(errorMap[key] || 0) > 0) return 'P2';
  }
  return 'P1';
}

function classifyVersionPosture(wslRun, winRun, wslVersion, winVersion) {
  if (!wslRun.ok && !winRun.ok) {
    return {
      status: 'fail',
      severity: 'P0',
      summary: 'OpenClaw CLI unavailable in both WSL and Windows contexts.',
      signatures: ['runtime_cli_dual_context_down'],
    };
  }

  if (!wslRun.ok || !winRun.ok) {
    return {
      status: 'fail',
      severity: 'P1',
      summary: 'OpenClaw CLI unavailable in one context (cross-context runtime skew).',
      signatures: ['runtime_cli_single_context_down'],
    };
  }

  if (wslVersion && winVersion && wslVersion !== winVersion) {
    return {
      status: 'fail',
      severity: 'P1',
      summary: 'WSL and Windows OpenClaw runtime versions are diverged.',
      signatures: ['cross_context_runtime_version_mismatch'],
    };
  }

  return {
    status: 'pass',
    severity: 'none',
    summary: 'Cross-context runtime versions are aligned.',
    signatures: [],
  };
}

function classifyGatewayPosture(wslRun, winRun) {
  if (!wslRun.ok && !winRun.ok) {
    return {
      status: 'fail',
      severity: 'P0',
      summary: 'Gateway unreachable in both contexts (critical service outage).',
      signatures: ['gateway_dual_context_down'],
    };
  }

  if (!wslRun.ok || !winRun.ok) {
    const signatures = [];
    if (!wslRun.ok && winRun.ok) signatures.push('gateway_windows_up_wsl_down');
    if (wslRun.ok && !winRun.ok) signatures.push('gateway_wsl_up_windows_down');
    return {
      status: 'fail',
      severity: 'P1',
      summary: 'Gateway healthy in one context and degraded in the other (cross-context degradation).',
      signatures,
    };
  }

  return {
    status: 'pass',
    severity: 'none',
    summary: 'Gateway reachable in both contexts.',
    signatures: [],
  };
}

function detectLauncherGuardDrift(stateDir) {
  const gatewayCmd = path.join(stateDir, 'gateway.cmd');
  const wrapperCmd = path.join(stateDir, 'gateway-wrapper.cmd');
  const preflight = path.join(stateDir, 'gateway-preflight.ps1');

  const cmdMarkers = [
    'if /I "%CD%"=="C:\\Windows\\System32" cd /d "%USERPROFILE%"',
    'title OpenClaw Gateway',
  ];
  const wrapperMarkers = [
    ...cmdMarkers,
    'set "GATEWAY_PREFLIGHT=%USERPROFILE%\\.openclaw\\gateway-preflight.ps1"',
  ];
  const preflightMarkers = ['Get-NetTCPConnection -LocalPort', 'Stop-Process -Id', 'preflight complete'];

  const misses = [
    ...listMissingMarkers(gatewayCmd, cmdMarkers),
    ...listMissingMarkers(wrapperCmd, wrapperMarkers),
    ...listMissingMarkers(preflight, preflightMarkers),
  ];

  return {
    stateDir,
    gatewayCmd,
    wrapperCmd,
    preflight,
    misses,
  };
}

function runRuntimeVersionsCrossContext(check, ctx) {
  const wsl = runBash('openclaw --version', ctx, 20000);
  const win = runCmdExe('openclaw --version', 20000);

  const wslVersion = extractVersion(`${wsl.stdout}\n${wsl.stderr}`);
  const winVersion = extractVersion(`${win.stdout}\n${win.stderr}`);

  const details = [
    `wsl: ${formatCommandResult(wsl)}`,
    `windows: ${formatCommandResult(win)}`,
  ];

  const posture = classifyVersionPosture(wsl, win, wslVersion, winVersion);
  if (posture.status === 'fail') {
    if (posture.signatures.includes('cross_context_runtime_version_mismatch')) {
      details.push(`version_mismatch: wsl=${wslVersion} windows=${winVersion}`);
    }
    return failResult(
      check,
      posture.severity,
      posture.summary,
      details,
      {
        signatures: posture.signatures,
        evidence_ref: ['openclaw --version (wsl + windows)'],
        raw: { wsl, windows: win, wslVersion, winVersion },
      },
    );
  }

  return passResult(
    check,
    `Cross-context OpenClaw runtime versions aligned (${wslVersion || 'unknown'}).`,
    details,
    {
      evidence_ref: ['openclaw --version (wsl + windows)'],
      raw: { wsl, windows: win, wslVersion, winVersion },
    },
  );
}

function runGatewayReachabilityCrossContext(check, ctx) {
  const wslProbe = runGatewayHealthProbe((command) => runBash(command, ctx, 30000));
  const winProbe = runGatewayHealthProbe((command) => runCmdExe(command, 30000));
  const wsl = wslProbe.best;
  const win = winProbe.best;

  const details = [
    `wsl: ${formatCommandResult(wsl)}`,
    `windows: ${formatCommandResult(win)}`,
  ];
  if (wslProbe.attempts.length > 1) {
    details.push(
      `wsl_probe_attempts: ${wslProbe.attempts.map((attempt) => `${attempt.mode}:${formatCommandResult(attempt.run)}`).join(' | ')}`,
    );
  }
  if (winProbe.attempts.length > 1) {
    details.push(
      `windows_probe_attempts: ${winProbe.attempts.map((attempt) => `${attempt.mode}:${formatCommandResult(attempt.run)}`).join(' | ')}`,
    );
  }

  const posture = classifyGatewayPosture(wsl, win);
  if (posture.status === 'fail') {
    return failResult(
      check,
      posture.severity,
      posture.summary,
      details,
      {
        signatures: posture.signatures,
        evidence_ref: ['openclaw gateway health (wsl + windows)'],
        raw: { wsl, windows: win, wslProbe, winProbe },
      },
    );
  }

  return passResult(
    check,
    'Gateway reachable in both WSL and Windows contexts.',
    details,
    {
      evidence_ref: ['openclaw gateway health (wsl + windows)'],
      raw: { wsl, windows: win, wslProbe, winProbe },
    },
  );
}

function runLauncherGuardIntegrity(check, ctx) {
  const stateDir = resolveOpenClawStateDir();
  const drift = detectLauncherGuardDrift(stateDir);
  const misses = drift.misses;

  const details = [
    `state_dir: ${toPosix(stateDir)}`,
    ...misses,
  ];

  if (misses.length > 0) {
    return failResult(
      check,
      'P1',
      'Gateway launcher guard integrity drift detected.',
      details,
      {
        signatures: ['launcher_guard_drift_detected'],
        evidence_ref: [
          toPosix(path.relative(ctx.root, drift.gatewayCmd)),
          toPosix(path.relative(ctx.root, drift.wrapperCmd)),
          toPosix(path.relative(ctx.root, drift.preflight)),
        ],
        raw: { stateDir, misses, drift },
      },
    );
  }

  return passResult(
    check,
    'Gateway launcher guard markers are intact.',
    [`state_dir: ${toPosix(stateDir)}`],
    {
      evidence_ref: [
        toPosix(path.relative(ctx.root, drift.gatewayCmd)),
        toPosix(path.relative(ctx.root, drift.wrapperCmd)),
        toPosix(path.relative(ctx.root, drift.preflight)),
      ],
    },
  );
}

function runRuntimePolicyAlignment(check, ctx) {
  const configPath = resolveOpenClawConfigPath(ctx);
  const details = [`config_path: ${toPosix(configPath)}`];

  if (!fs.existsSync(configPath)) {
    return failResult(check, 'P1', 'OpenClaw runtime config file not found.', details, {
      signatures: ['runtime_config_missing'],
      evidence_ref: [toPosix(path.relative(ctx.root, configPath))],
    });
  }

  let json;
  try {
    json = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    return failResult(check, 'P1', 'OpenClaw runtime config parse failed.', details, {
      signatures: ['runtime_config_parse_error'],
      evidence_ref: [toPosix(path.relative(ctx.root, configPath))],
      raw: { error: String(error && error.message ? error.message : error) },
    });
  }

  const defaults = (((json || {}).agents || {}).defaults || {});
  const primary = (((defaults.model || {}).primary) || '');
  const fallbacks = Array.isArray(((defaults.model || {}).fallbacks)) ? defaults.model.fallbacks : [];
  const thinkingDefault = String(defaults.thinkingDefault || '');
  const subModel = String(((defaults.subagents || {}).model) || '');
  const subThinking = String(((defaults.subagents || {}).thinking) || '');

  const issues = [];
  if (primary !== 'openai-codex/gpt-5.3-codex') issues.push(`primary_model_mismatch:${primary || '<missing>'}`);
  if (!fallbacks.includes('openai-codex/gpt-5.2')) issues.push('fallback_missing:openai-codex/gpt-5.2');
  if (!['high', 'xhigh'].includes(thinkingDefault)) issues.push(`thinking_default_mismatch:${thinkingDefault || '<missing>'}`);
  if (subModel !== 'openai-codex/gpt-5.3-codex') issues.push(`subagent_model_mismatch:${subModel || '<missing>'}`);
  if (!['high', 'xhigh'].includes(subThinking)) issues.push(`subagent_thinking_mismatch:${subThinking || '<missing>'}`);

  details.push(`primary: ${primary || '<missing>'}`);
  details.push(`fallbacks: ${fallbacks.join(',') || '<missing>'}`);
  details.push(`thinking_default: ${thinkingDefault || '<missing>'}`);
  details.push(`subagent_model: ${subModel || '<missing>'}`);
  details.push(`subagent_thinking: ${subThinking || '<missing>'}`);

  if (issues.length > 0) {
    return failResult(check, 'P1', 'Runtime config model/thinking alignment drift detected.', [...details, ...issues], {
      signatures: ['runtime_model_policy_drift'],
      evidence_ref: [toPosix(path.relative(ctx.root, configPath))],
      raw: { issues },
    });
  }

  return passResult(check, 'Runtime config model and thinking alignment is healthy.', details, {
    evidence_ref: [toPosix(path.relative(ctx.root, configPath))],
  });
}

function runGovernanceConformance(check, ctx) {
  const run = runNodeScript('System/automation/openclaw/validateGovernanceConformance.js', ctx, [], 180000);
  const details = [formatCommandResult(run)];
  if (!run.ok) {
    return failResult(check, 'P1', 'Governance conformance validator failed.', details, {
      evidence_ref: ['System/automation/openclaw/validateGovernanceConformance.js'],
      raw: run,
    });
  }
  return passResult(check, 'Governance conformance validator passed.', details, {
    evidence_ref: ['System/automation/openclaw/validateGovernanceConformance.js'],
    raw: run,
  });
}

function runWorkflowLint(check, ctx) {
  const run = runNodeScript('System/automation/razsoc/workflowLint.js', ctx, [], 180000);
  const details = [formatCommandResult(run)];
  if (!run.ok) {
    return failResult(check, 'P1', 'Workflow lint failed.', details, {
      evidence_ref: ['System/automation/razsoc/workflowLint.js'],
      raw: run,
    });
  }
  return passResult(check, 'Workflow lint passed.', details, {
    evidence_ref: ['System/automation/razsoc/workflowLint.js'],
    raw: run,
  });
}

function runReportingRequirementsLint(check, ctx) {
  const run = runNodeScript('System/automation/razsoc/reportingRequirementsLint.js', ctx, [], 120000);
  const details = [formatCommandResult(run)];
  if (!run.ok) {
    return failResult(check, 'P1', 'Reporting-requirements lint failed.', details, {
      evidence_ref: ['System/automation/razsoc/reportingRequirementsLint.js'],
      raw: run,
    });
  }
  return passResult(check, 'Reporting-requirements lint passed.', details, {
    evidence_ref: ['System/automation/razsoc/reportingRequirementsLint.js'],
    raw: run,
  });
}

function runInstructionEnforcementLint(check, ctx) {
  const run = runNodeScript('System/automation/razsoc/instructionEnforcementLint.js', ctx, [], 120000);
  const details = [formatCommandResult(run)];
  if (!run.ok) {
    return failResult(check, 'P1', 'Instruction-enforcement lint failed.', details, {
      evidence_ref: ['System/automation/razsoc/instructionEnforcementLint.js'],
      raw: run,
    });
  }
  return passResult(check, 'Instruction-enforcement lint passed.', details, {
    evidence_ref: ['System/automation/razsoc/instructionEnforcementLint.js'],
    raw: run,
  });
}

function runLayerStackParity(check, ctx) {
  const run = runNodeScript('System/automation/openclaw/validateOpenClawLayerStack.js', ctx, [], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    const text = `${run.stdout}\n${run.stderr}`;
    const signatures = [];
    if (/gateway launcher guard missing/i.test(text)) signatures.push('launcher_guard_drift_detected');
    return failResult(check, 'P1', 'OpenClaw layer-stack parity validator failed.', details, {
      signatures,
      evidence_ref: ['System/automation/openclaw/validateOpenClawLayerStack.js'],
      raw: run,
    });
  }

  return passResult(check, 'OpenClaw layer-stack parity validator passed.', details, {
    evidence_ref: ['System/automation/openclaw/validateOpenClawLayerStack.js'],
    raw: run,
  });
}

function runMemorySchemaContract(check, ctx) {
  const run = runPythonScript('System/automation/razsoc/validateMemorySchema.py', ctx, ['--strict'], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P0', 'Memory schema validation failed.', details, {
      signatures: ['memory_schema_contract_fail'],
      evidence_ref: ['System/automation/razsoc/validateMemorySchema.py --strict'],
      raw: run,
    });
  }

  return passResult(check, 'Memory schema validation passed.', details, {
    evidence_ref: ['System/automation/razsoc/validateMemorySchema.py --strict'],
    raw: run,
  });
}

function runMemoryNamingPolicy(check, ctx) {
  const run = runPythonScript('System/automation/razsoc/validateMemoryNaming.py', ctx, ['--strict'], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    const errorMap = readLatestMemoryNamingErrors(ctx);
    const severity = pickMemoryNamingSeverity(errorMap);
    const signatures = [];
    if (Number(errorMap.legacy_missing_redirect_stub || 0) > 0) {
      signatures.push('memory_legacy_missing_redirect_stub');
    }

    return failResult(check, severity, 'Memory naming policy validation failed.', details, {
      signatures,
      evidence_ref: ['System/automation/razsoc/validateMemoryNaming.py --strict'],
      raw: { run, error_map: errorMap },
    });
  }

  return passResult(check, 'Memory naming policy validation passed.', details, {
    evidence_ref: ['System/automation/razsoc/validateMemoryNaming.py --strict'],
    raw: run,
  });
}

function runMemoryDuplicatesTelemetry(check, ctx) {
  const run = runPythonScript('System/automation/razsoc/detectMemoryDuplicates.py', ctx, [], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P0', 'Duplicate-write telemetry detected memory integrity drift.', details, {
      signatures: ['memory_duplicate_groups_detected'],
      evidence_ref: ['System/automation/razsoc/detectMemoryDuplicates.py'],
      raw: run,
    });
  }

  return passResult(check, 'Duplicate-write telemetry is clear.', details, {
    evidence_ref: ['System/automation/razsoc/detectMemoryDuplicates.py'],
    raw: run,
  });
}

function runGoldRecallSuite(check, ctx) {
  const run = runPythonScript('System/automation/razsoc/runGoldRecallSuite.py', ctx, [], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P0', 'Gold recall suite below target threshold.', details, {
      signatures: ['gold_recall_hit_rate_below_target'],
      evidence_ref: ['System/automation/razsoc/runGoldRecallSuite.py'],
      raw: run,
    });
  }

  return passResult(check, 'Gold recall suite passed target threshold.', details, {
    evidence_ref: ['System/automation/razsoc/runGoldRecallSuite.py'],
    raw: run,
  });
}

function runPilotGuardrailStatus(check, ctx) {
  const run = runPythonScript('System/automation/razsoc/evaluatePilotGuardrails.py', ctx, ['--strict'], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P0', 'Pilot guardrail evaluator recommends fallback.', details, {
      signatures: ['pilot_guardrail_fallback_recommended'],
      evidence_ref: ['System/automation/razsoc/evaluatePilotGuardrails.py --strict'],
      raw: run,
    });
  }

  return passResult(check, 'Pilot guardrail evaluator reports healthy posture.', details, {
    evidence_ref: ['System/automation/razsoc/evaluatePilotGuardrails.py --strict'],
    raw: run,
  });
}

function runSecretPublishGuard(check, ctx) {
  const run = runPythonScript('System/automation/razsoc/secretPublishGuard.py', ctx, ['--strict'], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P0', 'Secret publish guard found token-like findings.', details, {
      signatures: ['secret_publish_guard_findings'],
      evidence_ref: ['System/automation/razsoc/secretPublishGuard.py --strict'],
      raw: run,
    });
  }

  return passResult(check, 'Secret publish guard passed (no findings).', details, {
    evidence_ref: ['System/automation/razsoc/secretPublishGuard.py --strict'],
    raw: run,
  });
}

function runMissionControlContract(check, ctx) {
  const run = runNodeScript('System/automation/razsoc/missionControlContractParity.js', ctx, [], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P1', 'Mission-control contract parity failed.', details, {
      signatures: ['mission_control_contract_drift'],
      evidence_ref: ['System/automation/razsoc/missionControlContractParity.js'],
      raw: run,
    });
  }

  return passResult(check, 'Mission-control contract parity passed.', details, {
    evidence_ref: ['System/automation/razsoc/missionControlContractParity.js'],
    raw: run,
  });
}

function runInsightCloseoutGate(check, ctx) {
  const run = runNodeScript('System/automation/razsoc/enforceInsightCloseoutGate.js', ctx, [], 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P1', 'Insight closeout gate failed (fail-closed).', details, {
      signatures: ['insight_closeout_gate_fail'],
      evidence_ref: ['System/automation/razsoc/enforceInsightCloseoutGate.js'],
      raw: run,
    });
  }

  return passResult(check, 'Insight closeout gate passed.', details, {
    evidence_ref: ['System/automation/razsoc/enforceInsightCloseoutGate.js'],
    raw: run,
  });
}

function runObsidianControlCenterDrift(check, ctx) {
  const run = runNodeScript('System/automation/openclaw/validateControlCenterDrift.js', ctx, [], 120000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P1', 'Obsidian control-center drift validator failed.', details, {
      signatures: ['control_center_drift_fail'],
      evidence_ref: ['System/automation/openclaw/validateControlCenterDrift.js'],
      raw: run,
    });
  }

  return passResult(check, 'Obsidian control-center drift validator passed.', details, {
    evidence_ref: ['System/automation/openclaw/validateControlCenterDrift.js'],
    raw: run,
  });
}

function runCommandCenterBasesPresence(check, ctx) {
  const commandCenter = path.join(ctx.root, 'Notes', 'RAZSOC', 'JOC - Command & Control Center.md');
  const baseFiles = [
    'System/Bases/RAZSOC Tasks.base',
    'System/Bases/RAZSOC Decisions.base',
    'System/Bases/RAZSOC Lessons.base',
    'System/Bases/RAZSOC Risks.base',
    'System/Bases/RAZSOC Sessions.base',
    'System/Bases/RAZSOC Approvals.base',
  ];

  const missing = [];
  if (!fs.existsSync(commandCenter)) {
    missing.push('Notes/RAZSOC/JOC - Command & Control Center.md');
  }

  for (const rel of baseFiles) {
    if (!fs.existsSync(path.join(ctx.root, rel))) missing.push(rel);
  }

  if (missing.length > 0) {
    return failResult(
      check,
      'P1',
      'Command-center note/Bases presence check failed.',
      missing.map((m) => `missing: ${m}`),
      {
        signatures: ['command_center_bases_missing'],
        evidence_ref: ['Notes/RAZSOC/JOC - Command & Control Center.md', ...baseFiles],
      },
    );
  }

  return passResult(check, 'Command-center note and Bases surfaces are present.', [], {
    evidence_ref: ['Notes/RAZSOC/JOC - Command & Control Center.md', ...baseFiles],
  });
}

function runTemplateSchemaContract(check, ctx) {
  const args = ctx.profile === 'hourly' ? [] : ['--strict'];
  const run = runPythonScript('System/automation/razsoc/validateTemplateSchema.py', ctx, args, 180000);
  const details = [formatCommandResult(run)];

  if (!run.ok) {
    return failResult(check, 'P0', 'Template schema validation failed.', details, {
      signatures: ['template_schema_contract_fail'],
      evidence_ref: ['System/automation/razsoc/validateTemplateSchema.py --strict'],
      raw: run,
    });
  }

  return passResult(check, 'Template schema validation passed.', details, {
    evidence_ref: ['System/automation/razsoc/validateTemplateSchema.py --strict'],
    raw: run,
  });
}

function runClipperJsonIntegrity(check, ctx) {
  const clipperRoot = path.join(ctx.root, 'System', 'WebClipperTemplates');
  if (!fs.existsSync(clipperRoot)) {
    return failResult(check, 'P1', 'WebClipper template directory missing.', [toPosix(path.relative(ctx.root, clipperRoot))], {
      signatures: ['web_clipper_templates_missing'],
      evidence_ref: ['System/WebClipperTemplates'],
    });
  }

  const files = fs.readdirSync(clipperRoot, { withFileTypes: true })
    .filter((ent) => ent.isFile() && ent.name.toLowerCase().endsWith('.json'))
    .map((ent) => path.join(clipperRoot, ent.name))
    .sort();

  const bad = [];
  for (const filePath of files) {
    try {
      JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      bad.push(`${toPosix(path.relative(ctx.root, filePath))}: ${String(error && error.message ? error.message : error)}`);
    }
  }

  if (bad.length > 0) {
    return failResult(check, 'P1', 'WebClipper JSON integrity check failed.', bad, {
      signatures: ['web_clipper_json_invalid'],
      evidence_ref: files.map((f) => toPosix(path.relative(ctx.root, f))),
      raw: { invalid_count: bad.length },
    });
  }

  return passResult(check, `WebClipper JSON integrity passed (${files.length} files).`, [], {
    evidence_ref: files.map((f) => toPosix(path.relative(ctx.root, f))),
  });
}

function runPkmNoteContract(check, ctx) {
  const run = runNodeScript('System/automation/razsoc/pkmNoteLint.js', ctx, [], 180000);

  const details = [formatCommandResult(run)];
  const payload = parseJsonFromStdout(run.stdout);

  if (!run.ok) {
    return failResult(check, 'P1', 'PKM note linter execution failed.', details, {
      evidence_ref: ['System/automation/razsoc/pkmNoteLint.js'],
      raw: run,
    });
  }

  if (!payload || typeof payload !== 'object') {
    return failResult(check, 'P2', 'PKM note linter output could not be parsed.', details, {
      signatures: ['pkm_note_lint_output_parse_fail'],
      evidence_ref: ['System/automation/razsoc/pkmNoteLint.js'],
      raw: run,
    });
  }

  const violations = Number(payload.violations || 0);
  if (!payload.ok || violations > 0) {
    details.push(`violations: ${violations}`);
    if (payload.reportPath) details.push(`report: ${payload.reportPath}`);
    return failResult(check, 'P2', 'PKM note linter found contract violations.', details, {
      signatures: ['pkm_note_contract_violations'],
      evidence_ref: ['System/automation/razsoc/pkmNoteLint.js', String(payload.reportPath || '').trim()].filter(Boolean),
      raw: payload,
    });
  }

  return passResult(check, 'PKM note linter passed.', details, {
    evidence_ref: ['System/automation/razsoc/pkmNoteLint.js', String(payload.reportPath || '').trim()].filter(Boolean),
    raw: payload,
  });
}

function parseWorkspaceHygieneReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return { missing: true, mirrorMissing: 0, nonCanonicalCount: 0, lines: [] };
  }
  const text = fs.readFileSync(reportPath, 'utf8');
  const lines = text.split(/\r?\n/);

  let mirrorMissing = 0;
  for (const line of lines) {
    if (/codex=missing|openclaw=missing/.test(line)) mirrorMissing += 1;
  }

  let nonCanonicalCount = 0;
  let inNonCanonicalSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## Non-Canonical Policy/Role File Copies')) {
      inNonCanonicalSection = true;
      continue;
    }
    if (trimmed.startsWith('## ') && inNonCanonicalSection) {
      inNonCanonicalSection = false;
    }
    if (inNonCanonicalSection && trimmed.startsWith('- ') && trimmed !== '- none') {
      nonCanonicalCount += 1;
    }
  }

  return { missing: false, mirrorMissing, nonCanonicalCount, lines };
}

function runSkillMirrorHygiene(check, ctx) {
  const scan = runBash('bash System/skills/openclaw-workspace-hygiene/scripts/workspace_hygiene_scan.sh', ctx, 180000);
  const reportPath = path.join(ctx.statusDir, 'workspace-hygiene-latest.md');
  const parsed = parseWorkspaceHygieneReport(reportPath);

  const details = [formatCommandResult(scan), `report: ${toPosix(path.relative(ctx.root, reportPath))}`];
  if (parsed.missing) {
    return failResult(check, 'P2', 'Workspace hygiene report missing after scan.', details, {
      signatures: ['workspace_hygiene_report_missing'],
      evidence_ref: ['System/skills/openclaw-workspace-hygiene/scripts/workspace_hygiene_scan.sh'],
      raw: scan,
    });
  }

  if (!scan.ok) {
    return failResult(check, 'P1', 'Workspace hygiene scan command failed.', details, {
      signatures: ['workspace_hygiene_scan_failed'],
      evidence_ref: ['System/skills/openclaw-workspace-hygiene/scripts/workspace_hygiene_scan.sh'],
      raw: scan,
    });
  }

  const issues = [];
  if (parsed.mirrorMissing > 0) issues.push(`mirror_missing_count:${parsed.mirrorMissing}`);
  if (parsed.nonCanonicalCount > 0) issues.push(`non_canonical_policy_role_copies:${parsed.nonCanonicalCount}`);

  if (issues.length > 0) {
    const signatures = [];
    if (parsed.mirrorMissing > 0) signatures.push('skill_mirror_drift');
    if (parsed.nonCanonicalCount > 0) signatures.push('noncanonical_policy_role_copies');

    return failResult(check, 'P2', 'Workspace hygiene drift detected.', [...details, ...issues], {
      signatures,
      evidence_ref: [
        'System/skills/openclaw-workspace-hygiene/scripts/workspace_hygiene_scan.sh',
        'System/Reports/Codex/status/workspace-hygiene-latest.md',
      ],
      auto_fix_context: {
        mirror_missing_count: parsed.mirrorMissing,
        non_canonical_count: parsed.nonCanonicalCount,
      },
      raw: { scan, parsed },
    });
  }

  return passResult(check, 'Workspace hygiene scan passed with no mirror/policy drift findings.', details, {
    evidence_ref: [
      'System/skills/openclaw-workspace-hygiene/scripts/workspace_hygiene_scan.sh',
      'System/Reports/Codex/status/workspace-hygiene-latest.md',
    ],
    raw: { scan, parsed },
  });
}

function runManagedSourceDailyLite(check, ctx) {
  const slas = (((ctx.contract || {}).freshness_slas || {}).managed_source_max_age_hours) || {};
  const managed = getManagedSourcePaths(ctx);

  const missing = [];
  const stale = [];
  const nowMs = Date.now();

  for (const [key, absPath] of Object.entries(managed)) {
    if (!fs.existsSync(absPath)) {
      missing.push(`${key}:missing:${toPosix(path.relative(ctx.root, absPath))}`);
      continue;
    }

    const stat = fs.statSync(absPath);
    const ageHours = (nowMs - stat.mtimeMs) / 3600000;
    const maxAge = Number(slas[key] || 168);
    if (ageHours > maxAge) {
      stale.push(`${key}:stale:${ageHours.toFixed(1)}h>${maxAge}h`);
    }
  }

  if (missing.length > 0) {
    return failResult(check, 'P1', 'Managed source directory missing.', missing, {
      signatures: ['managed_source_missing'],
      evidence_ref: Object.values(managed).map((p) => toPosix(path.relative(ctx.root, p))),
      raw: { managed, missing },
    });
  }

  if (stale.length > 0) {
    return warningResult(check, 'P2', 'Managed source freshness beyond SLA.', stale, {
      signatures: ['managed_source_stale'],
      evidence_ref: Object.values(managed).map((p) => toPosix(path.relative(ctx.root, p))),
      raw: { managed, stale },
    });
  }

  return passResult(check, 'Managed source daily-lite freshness check passed.', [], {
    evidence_ref: Object.values(managed).map((p) => toPosix(path.relative(ctx.root, p))),
    raw: managed,
  });
}

function runManagedSourceFullOptest(check, ctx) {
  const commands = [
    'bash System/automation/openclaw/openclawDeckManage.sh build',
    'bash System/automation/openclaw/arsContextaManage.sh smoke',
    'bash System/automation/openclaw/hyperAgentManage.sh smoke',
    'bash System/automation/openclaw/hyperAgentManage.sh build',
    'bash System/automation/openclaw/hyperAgentManage.sh ingest --url https://example.com --source-json System/automation/openclaw/fixtures/hyperagent-extract-sample.json --mode mock --dry-run',
  ];

  const runs = commands.map((cmd) => runBash(cmd, ctx, 1200000));
  const failed = runs.filter((r) => !r.ok);
  const details = runs.map((r) => formatCommandResult(r));

  if (failed.length > 0) {
    return failResult(check, 'P1', 'Managed-source mandatory optest failed.', details, {
      signatures: ['managed_source_mandatory_optest_fail'],
      evidence_ref: commands,
      raw: runs,
    });
  }

  return passResult(check, 'Managed-source mandatory optest passed.', details, {
    evidence_ref: commands,
    raw: runs,
  });
}

function runLatestAliasIntegrity(check, ctx) {
  const specs = collectReportAliasSpec();
  const missingLatest = [];
  const latestWithSource = [];

  for (const spec of specs) {
    const prefix = spec.prefix;

    if (spec.hasJson) {
      const latest = path.join(ctx.statusDir, `${prefix}-latest.json`);
      if (!fs.existsSync(latest)) {
        const source = findNewestStamped(ctx.statusDir, prefix, '.json');
        missingLatest.push(`missing:${toPosix(path.relative(ctx.root, latest))}`);
        if (source) {
          latestWithSource.push({ latest, source });
        }
      }
    }

    if (spec.hasMd) {
      const latest = path.join(ctx.statusDir, `${prefix}-latest.md`);
      if (!fs.existsSync(latest)) {
        const source = findNewestStamped(ctx.statusDir, prefix, '.md');
        missingLatest.push(`missing:${toPosix(path.relative(ctx.root, latest))}`);
        if (source) {
          latestWithSource.push({ latest, source });
        }
      }
    }
  }

  if (missingLatest.length > 0) {
    return failResult(check, 'P2', 'Latest-alias integrity drift detected.', missingLatest, {
      signatures: ['latest_alias_missing'],
      evidence_ref: ['System/Reports/Codex/status/*-latest.{json,md}'],
      auto_fix_context: { latest_with_source: latestWithSource },
      raw: { missingLatest, latestWithSource },
    });
  }

  return passResult(check, 'Latest-alias integrity check passed.', [], {
    evidence_ref: ['System/Reports/Codex/status/*-latest.{json,md}'],
  });
}

function findNewestStamped(statusDir, prefix, ext) {
  if (!fs.existsSync(statusDir)) return null;
  const rx = new RegExp(`^${escapeRegExp(prefix)}-(\\d{8}-\\d{6}|\\d{4}-\\d{2}-\\d{2}T[^.]+)\\${escapeRegExp(ext)}$`);
  const candidates = fs.readdirSync(statusDir)
    .filter((name) => rx.test(name))
    .sort();
  if (!candidates.length) return null;
  return path.join(statusDir, candidates[candidates.length - 1]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runArtifactFreshness(check, ctx) {
  const mapping = (((ctx.contract || {}).freshness_slas || {}).report_latest_max_age_hours) || {};
  const entries = Object.entries(mapping);

  const nowMs = Date.now();
  const details = [];
  const issues = [];

  for (const [relPath, maxAgeHours] of entries) {
    const absPath = path.join(ctx.root, relPath);
    const maxAge = Number(maxAgeHours || 24);

    if (!fs.existsSync(absPath)) {
      issues.push(`missing:${relPath}`);
      continue;
    }

    const stat = fs.statSync(absPath);
    const ageHours = (nowMs - stat.mtimeMs) / 3600000;
    details.push(`${relPath}: ${ageHours.toFixed(1)}h/${maxAge}h`);
    if (ageHours > maxAge) {
      issues.push(`stale:${relPath}:${ageHours.toFixed(1)}h>${maxAge}h`);
    }
  }

  if (issues.length > 0) {
    return failResult(check, 'P2', 'Status artifact freshness SLA breach detected.', [...details, ...issues], {
      signatures: ['status_artifact_freshness_sla_breach'],
      evidence_ref: entries.map(([rel]) => rel),
      raw: { issues },
    });
  }

  return passResult(check, 'Status artifact freshness SLAs are within thresholds.', details, {
    evidence_ref: entries.map(([rel]) => rel),
  });
}

function parseJsonFromStdout(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Best effort: parse last JSON-looking line
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i].trim();
      if (!(line.startsWith('{') && line.endsWith('}'))) continue;
      try {
        return JSON.parse(line);
      } catch {
        // continue
      }
    }
  }
  return null;
}

function resolveChecksForProfile(ctx) {
  const configured = ((((ctx.contract || {}).profiles || {})[ctx.profile] || {}).checks) || [];
  const selectedIds = Array.isArray(configured) ? configured : [];
  const byId = new Map(CHECK_REGISTRY.map((item) => [item.id, item]));

  const checks = [];
  for (const id of selectedIds) {
    const check = byId.get(String(id));
    if (check) checks.push(check);
  }
  return checks;
}

function remediationBlockedDraft(whyBlocked, safeAlternative, nextStep) {
  return {
    why_blocked: whyBlocked,
    safe_alternative: safeAlternative,
    next_step: nextStep,
  };
}

function isCheckAutoFixAllowlisted(checkId, allowlistMap) {
  return allowlistMap.has(checkId);
}

function tryRunAutoFix(check, result, ctx, allowlistMap) {
  const allow = allowlistMap.get(check.id);

  if (!allow) {
    return {
      attempted: false,
      status: 'not_allowlisted',
      notes: [],
      handler: null,
      blocked_short_draft: remediationBlockedDraft(
        'Auto-fix for this degradation signature is not in the safe allowlist.',
        `Run the failing check command manually and capture evidence in ${toPosix(path.relative(ctx.root, ctx.statusDir))}.`,
        `Add ${check.id} to degradation_diagnostics.safe_auto_fix_allowlist only after supervisor review.`,
      ),
    };
  }

  if (ctx.autoFix !== 'safe') {
    return {
      attempted: false,
      status: 'auto_fix_mode_off',
      notes: [],
      handler: allow.command || null,
      blocked_short_draft: remediationBlockedDraft(
        'Auto-fix mode is off.',
        `Re-run ${check.id} manually and log evidence.`,
        'For reversible fixes, rerun with --auto-fix safe.',
      ),
    };
  }

  if (allow.flag_required === 'allow_mirror_sync' && !ctx.allowMirrorSync) {
    return {
      attempted: false,
      status: 'flag_required',
      notes: [],
      handler: allow.command || null,
      blocked_short_draft: remediationBlockedDraft(
        'Mirror-sync remediation is allowlisted but currently flag-gated.',
        'Keep detection-only posture and remediate mirrors manually (copy missing only; no overwrite/delete).',
        'Re-run with --allow-mirror-sync to permit optional safe mirror sync.',
      ),
    };
  }

  if (check.id === 'gateway_reachability_cross_context') {
    const run = runNodeScript('System/automation/openclaw/remediateGatewayCrossContext.js', ctx, [], 240000);
    return {
      attempted: true,
      status: run.ok ? 'attempted' : 'failed',
      notes: [formatCommandResult(run)],
      handler: 'node System/automation/openclaw/remediateGatewayCrossContext.js',
      blocked_short_draft: null,
    };
  }

  if (check.id === 'launcher_guard_integrity') {
    const run = runNodeScript('System/automation/openclaw/remediateGatewayStartupGuards.js', ctx, [], 180000);
    return {
      attempted: true,
      status: run.ok ? 'attempted' : 'failed',
      notes: [formatCommandResult(run)],
      handler: 'node System/automation/openclaw/remediateGatewayStartupGuards.js',
      blocked_short_draft: null,
    };
  }

  if (check.id === 'memory_naming_policy') {
    const run = runPythonScript(
      'System/automation/razsoc/validateMemoryNaming.py',
      ctx,
      ['--strict', '--ensure-today-gpt'],
      180000,
    );
    return {
      attempted: true,
      status: run.ok ? 'attempted' : 'failed',
      notes: [formatCommandResult(run)],
      handler: 'python3 System/automation/razsoc/validateMemoryNaming.py --strict --ensure-today-gpt',
      blocked_short_draft: null,
    };
  }

  if (check.id === 'latest_alias_integrity') {
    const run = rebuildLatestAliases(ctx, result.auto_fix_context || {});
    return {
      attempted: true,
      status: run.ok ? 'attempted' : 'failed',
      notes: run.notes,
      handler: 'internal:rebuild_latest_aliases',
      blocked_short_draft: null,
    };
  }

  if (check.id === 'skill_mirror_hygiene') {
    const run = mirrorSyncMissingOnly(ctx);
    return {
      attempted: true,
      status: run.ok ? 'attempted' : 'failed',
      notes: run.notes,
      handler: 'internal:mirror_sync_missing_only',
      blocked_short_draft: null,
    };
  }

  return {
    attempted: false,
    status: 'unsupported_handler',
    notes: [`No auto-fix handler implemented for check ${check.id}.`],
    handler: allow.command || null,
    blocked_short_draft: remediationBlockedDraft(
      'Allowlist entry exists but no executable auto-fix handler is implemented.',
      'Run manual remediation with reversible steps and evidence capture.',
      'Implement internal handler parity before enabling auto-fix for this check.',
    ),
  };
}

function rebuildLatestAliases(ctx, autoFixContext) {
  const pairs = Array.isArray(autoFixContext.latest_with_source)
    ? autoFixContext.latest_with_source
    : [];

  const notes = [];
  if (pairs.length === 0) {
    return { ok: false, notes: ['No missing latest aliases with source candidates were provided.'] };
  }

  for (const pair of pairs) {
    if (!pair || !pair.latest || !pair.source) continue;
    if (!fs.existsSync(pair.source)) {
      notes.push(`source_missing:${toPosix(path.relative(ctx.root, pair.source))}`);
      continue;
    }
    ensureDir(path.dirname(pair.latest));
    fs.copyFileSync(pair.source, pair.latest);
    notes.push(`copied:${toPosix(path.relative(ctx.root, pair.source))} -> ${toPosix(path.relative(ctx.root, pair.latest))}`);
  }

  const ok = notes.some((line) => line.startsWith('copied:'));
  return { ok, notes };
}

function mirrorSyncMissingOnly(ctx) {
  const sourceRoot = path.join(ctx.root, 'System', 'skills');
  const codexRoot = path.join(ctx.root, '.codex', 'skills');
  const openclawRoot = resolveOpenClawSkillsDir();

  const stamp = nowStamp();
  const reportPath = path.join(ctx.statusDir, `workspace-hygiene-mirror-sync-${stamp}.md`);

  const notes = [];
  if (!fs.existsSync(sourceRoot)) {
    return { ok: false, notes: ['missing source root: System/skills'] };
  }

  ensureDir(codexRoot);
  ensureDir(openclawRoot);

  const skills = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((ent) => ent.isDirectory())
    .map((ent) => ent.name)
    .sort();

  let codexAdded = 0;
  let openclawAdded = 0;

  for (const skill of skills) {
    const src = path.join(sourceRoot, skill);

    const codexDst = path.join(codexRoot, skill);
    if (!fs.existsSync(codexDst)) {
      fs.cpSync(src, codexDst, { recursive: true, force: false });
      codexAdded += 1;
      notes.push(`codex_added:${toPosix(path.relative(ctx.root, codexDst))}`);
    }

    const openclawDst = path.join(openclawRoot, skill);
    if (!fs.existsSync(openclawDst)) {
      fs.cpSync(src, openclawDst, { recursive: true, force: false });
      openclawAdded += 1;
      notes.push(`openclaw_added:${toPosix(openclawDst)}`);
    }
  }

  const lines = [
    '---',
    'title: Workspace Hygiene Mirror Sync Report',
    `created_on: ${new Date().toISOString().slice(0, 10)}`,
    `updated_on: ${new Date().toISOString().slice(0, 10)}`,
    'status: active',
    'owner_role: N6',
    'decision_ref: DEC-2026-02-22-workspace-hygiene-mirror-sync',
    '---',
    '',
    '# Workspace Hygiene Mirror Sync',
    '',
    `- generated_at_utc: ${nowIso()}`,
    `- source_root: ${toPosix(path.relative(ctx.root, sourceRoot))}`,
    `- codex_root: ${toPosix(path.relative(ctx.root, codexRoot))}`,
    `- openclaw_root: ${toPosix(openclawRoot)}`,
    `- codex_added_count: ${codexAdded}`,
    `- openclaw_added_count: ${openclawAdded}`,
    '',
    '## Actions',
  ];

  if (!notes.length) {
    lines.push('- none');
  } else {
    for (const line of notes) lines.push(`- ${line}`);
  }

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
  notes.push(`report:${toPosix(path.relative(ctx.root, reportPath))}`);

  return { ok: true, notes };
}

function shouldFailStrict(summary, ctx) {
  const threshold = (((ctx.contract || {}).severity_thresholds) || {});
  const strictLevelsByProfile = threshold.strict_fail_levels_by_profile || {};
  const p2ByProfile = threshold.p2_fail_count_by_profile || {};

  const strictLevels = Array.isArray(strictLevelsByProfile[ctx.profile])
    ? strictLevelsByProfile[ctx.profile]
    : ['P0', 'P1'];

  for (const sev of strictLevels) {
    if (Number((summary.severity_counts || {})[sev] || 0) > 0) {
      return {
        fail: true,
        reason: `strict_severity_gate:${sev}`,
      };
    }
  }

  const p2Threshold = Number(p2ByProfile[ctx.profile]);
  if (Number.isFinite(p2Threshold)) {
    const p2Count = Number((summary.severity_counts || {}).P2 || 0);
    if (p2Count >= p2Threshold) {
      return {
        fail: true,
        reason: `strict_p2_threshold:count=${p2Count} threshold=${p2Threshold}`,
      };
    }
  }

  return { fail: false, reason: 'strict_gate_clear' };
}

function renderMarkdown(report) {
  const lines = [
    '# Degradation Diagnostics',
    '',
    `- timestamp: ${report.timestamp}`,
    `- profile: ${report.profile}`,
    `- strict: ${String(report.strict)}`,
    `- auto_fix: ${report.auto_fix}`,
    `- contract_version: ${report.contract_version}`,
    `- check_count: ${report.summary.check_count}`,
    `- pass_count: ${report.summary.pass_count}`,
    `- fail_count: ${report.summary.fail_count}`,
    `- warn_count: ${report.summary.warn_count}`,
    `- severity_counts: P0=${report.summary.severity_counts.P0 || 0}, P1=${report.summary.severity_counts.P1 || 0}, P2=${report.summary.severity_counts.P2 || 0}, P3=${report.summary.severity_counts.P3 || 0}`,
    `- strict_exit: ${report.summary.strict_exit}`,
    `- strict_reason: ${report.summary.strict_reason}`,
    `- remediations_attempted: ${report.summary.remediations_attempted}`,
    `- remediations_fixed: ${report.summary.remediations_fixed}`,
    `- blocked_remediations: ${report.summary.blocked_remediations}`,
    '',
    '## Baseline Signatures Detected',
  ];

  if (!report.summary.baseline_signatures.length) {
    lines.push('- none');
  } else {
    for (const sig of report.summary.baseline_signatures) lines.push(`- ${sig}`);
  }

  lines.push('');
  lines.push('## Checks');
  lines.push('| id | status | severity | domain | summary |');
  lines.push('| --- | --- | --- | --- | --- |');

  for (const check of report.checks) {
    lines.push(
      `| ${check.id} | ${check.status} | ${check.severity} | ${check.domain} | ${escapePipes(check.summary)} |`,
    );
  }

  lines.push('');
  lines.push('## Remediation Notes');
  const withRemediation = report.checks.filter((c) => c.remediation && (c.remediation.attempted || c.remediation.blocked_short_draft));
  if (!withRemediation.length) {
    lines.push('- none');
  } else {
    for (const check of withRemediation) {
      lines.push(`- ${check.id}: status=${check.remediation.status}`);
      if (check.remediation.handler) lines.push(`  - handler: ${check.remediation.handler}`);
      for (const note of check.remediation.notes || []) {
        lines.push(`  - note: ${note}`);
      }
      if (check.remediation.blocked_short_draft) {
        lines.push(`  - why_blocked: ${check.remediation.blocked_short_draft.why_blocked}`);
        lines.push(`  - safe_alternative: ${check.remediation.blocked_short_draft.safe_alternative}`);
        lines.push(`  - next_step: ${check.remediation.blocked_short_draft.next_step}`);
      }
    }
  }

  lines.push('');
  lines.push('## Failure Details');
  const failed = report.checks.filter((c) => c.status === 'fail' || c.status === 'warn');
  if (!failed.length) {
    lines.push('- none');
  } else {
    for (const check of failed) {
      lines.push(`- ${check.id} (${check.severity})`);
      for (const detail of check.details || []) {
        lines.push(`  - ${detail}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function escapePipes(input) {
  return String(input || '').replace(/\|/g, '\\|');
}

function finalizeReport(ctx, checks, warnings) {
  const sortedChecks = [...checks].sort((a, b) => a.id.localeCompare(b.id));

  const summary = {
    check_count: sortedChecks.length,
    pass_count: sortedChecks.filter((c) => c.status === 'pass').length,
    fail_count: sortedChecks.filter((c) => c.status === 'fail').length,
    warn_count: sortedChecks.filter((c) => c.status === 'warn').length,
    severity_counts: {
      P0: sortedChecks.filter((c) => c.severity === 'P0').length,
      P1: sortedChecks.filter((c) => c.severity === 'P1').length,
      P2: sortedChecks.filter((c) => c.severity === 'P2').length,
      P3: sortedChecks.filter((c) => c.severity === 'P3').length,
    },
    remediations_attempted: sortedChecks.filter((c) => c.remediation && c.remediation.attempted).length,
    remediations_fixed: sortedChecks.filter((c) => c.remediation && c.remediation.status === 'fixed').length,
    blocked_remediations: sortedChecks.filter((c) => c.remediation && c.remediation.blocked_short_draft).length,
    baseline_signatures: [...new Set(sortedChecks.flatMap((c) => c.signatures || []))].sort(),
    highest_severity: maxSeverity(sortedChecks),
    strict_exit: false,
    strict_reason: 'strict_not_enabled',
  };

  if (ctx.strict) {
    const strict = shouldFailStrict(summary, ctx);
    summary.strict_exit = strict.fail;
    summary.strict_reason = strict.reason;
  }

  const report = {
    timestamp: nowIso(),
    profile: ctx.profile,
    strict: ctx.strict,
    auto_fix: ctx.autoFix,
    contract_version: String((ctx.contract || {}).contract_version || 'unknown'),
    policy_file: 'System/Config/razsoc_policy.yaml',
    warnings,
    summary,
    checks: sortedChecks,
  };

  return report;
}

function writeReportArtifacts(ctx, report) {
  ensureDir(ctx.statusDir);

  const stamp = nowStamp();
  const jsonByStamp = path.join(ctx.statusDir, `degradation-diagnostics-${stamp}.json`);
  const mdByStamp = path.join(ctx.statusDir, `degradation-diagnostics-${stamp}.md`);
  const latestJson = path.join(ctx.statusDir, 'degradation-diagnostics-latest.json');
  const latestMd = path.join(ctx.statusDir, 'degradation-diagnostics-latest.md');

  const jsonPayload = `${JSON.stringify(report, null, 2)}\n`;
  const mdPayload = renderMarkdown(report);

  fs.writeFileSync(jsonByStamp, jsonPayload, 'utf8');
  fs.writeFileSync(mdByStamp, mdPayload, 'utf8');
  fs.writeFileSync(latestJson, jsonPayload, 'utf8');
  fs.writeFileSync(latestMd, mdPayload, 'utf8');

  return {
    jsonByStamp: toPosix(path.relative(ctx.root, jsonByStamp)),
    mdByStamp: toPosix(path.relative(ctx.root, mdByStamp)),
    latestJson: toPosix(path.relative(ctx.root, latestJson)),
    latestMd: toPosix(path.relative(ctx.root, latestMd)),
  };
}

function executeCheckWithAutoFix(check, ctx, allowlistMap) {
  let result = check.run(check, ctx);

  if (result.status === 'pass') {
    return result;
  }

  const remediation = tryRunAutoFix(check, result, ctx, allowlistMap);
  result.remediation = {
    eligible: isCheckAutoFixAllowlisted(check.id, allowlistMap),
    attempted: remediation.attempted,
    status: remediation.status,
    handler: remediation.handler || null,
    notes: remediation.notes || [],
    blocked_short_draft: remediation.blocked_short_draft || null,
  };

  if (!remediation.attempted || remediation.status === 'failed') {
    return result;
  }

  // verify by re-running check once
  const rerun = check.run(check, ctx);
  rerun.remediation = {
    eligible: true,
    attempted: true,
    status: rerun.status === 'pass' ? 'fixed' : 'failed_verify',
    handler: remediation.handler || null,
    notes: remediation.notes || [],
    blocked_short_draft: null,
  };

  if (rerun.status !== 'pass') {
    rerun.details = [
      ...(result.details || []),
      'post_auto_fix_rerun_failed',
      ...(rerun.details || []),
    ];
  }

  return rerun;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { policy, warnings } = loadPolicy(opts.root);
  const contract = resolveContract(policy);

  const ctx = {
    root: opts.root,
    statusDir: path.join(opts.root, 'System', 'Reports', 'Codex', 'status'),
    profile: opts.profile,
    strict: opts.strict,
    autoFix: opts.autoFix,
    allowMirrorSync: opts.allowMirrorSync,
    policy,
    contract,
  };

  const checks = resolveChecksForProfile(ctx);
  const allowlistMap = normalizeAllowlist(contract);

  const results = [];
  for (const check of checks) {
    const result = executeCheckWithAutoFix(check, ctx, allowlistMap);
    results.push(result);
  }

  const report = finalizeReport(ctx, results, warnings);
  const wrote = writeReportArtifacts(ctx, report);

  process.stdout.write('DEGRADATION_DIAGNOSTICS_COMPLETE\n');
  process.stdout.write(`- profile: ${ctx.profile}\n`);
  process.stdout.write(`- strict: ${String(ctx.strict)}\n`);
  process.stdout.write(`- auto_fix: ${ctx.autoFix}\n`);
  process.stdout.write(`- highest_severity: ${report.summary.highest_severity}\n`);
  process.stdout.write(`- strict_exit: ${String(report.summary.strict_exit)}\n`);
  process.stdout.write(`- strict_reason: ${report.summary.strict_reason}\n`);
  process.stdout.write(`- report_json: ${wrote.latestJson}\n`);
  process.stdout.write(`- report_md: ${wrote.latestMd}\n`);

  if (ctx.strict && report.summary.strict_exit) {
    process.exit(2);
  }

  process.exit(0);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const msg = String(error && error.message ? error.message : error);
    process.stderr.write(`runDegradationDiagnostics failed: ${msg}\n`);
    process.exit(1);
  }
}

module.exports = {
  extractVersion,
  classifyVersionPosture,
  classifyGatewayPosture,
  detectLauncherGuardDrift,
  pickMemoryNamingSeverity,
  parseWorkspaceHygieneReport,
  mirrorSyncMissingOnly,
  shouldFailStrict,
  runLatestAliasIntegrity,
  runArtifactFreshness,
  resolveContract,
  DEFAULT_CONTRACT,
};
