#!/usr/bin/env node
/**
 * Validate 8-layer OpenClaw alignment across vault/templates/runtime.
 *
 * Usage:
 *   node System/automation/openclaw/validateOpenClawLayerStack.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REQUIRED_FILES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "IDENTITY.md",
  "USER.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
  "RESPONSE.md",
  "BRAIN.md",
  "MUSCLES.md",
  "BONES.md",
  "DNA.md",
  "EYES.md",
  "NERVES.md",
  "MISSION_CONTROL.md",
];
const OPTIONAL_ROOT_FILES = new Set(["BOOTSTRAP.md"]);

const findVaultRoot = () => {
  // Prefer deriving from this script location (works on Windows and WSL)
  const derived = path.resolve(__dirname, "..", "..", "..", "..");
  if (fs.existsSync(path.join(derived, "AGENTS.md"))) return derived;

  // Fallbacks for legacy paths
  const candidates = [
    process.env.OPENCLAW_WORKSPACE,
    process.env.JOC_ROOT,
    "/mnt/c/Users/aleks/OneDrive/JOC",
    "C:/Users/aleks/OneDrive/JOC",
  ].filter(Boolean);

  for (const c of candidates) {
    const p = path.resolve(String(c));
    if (fs.existsSync(path.join(p, "AGENTS.md"))) return p;
  }

  return derived; // best-effort
};

const userHome =
  process.env.USERPROFILE ||
  process.env.HOME ||
  (process.env.HOMEDRIVE && process.env.HOMEPATH
    ? path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)
    : undefined);

const vaultRoot = findVaultRoot();

const SURFACES = {
  root: vaultRoot,
  templates:
    process.platform === "win32"
      ? "C:/Users/aleks/AppData/Roaming/npm/node_modules/openclaw/docs/reference/templates"
      : "/mnt/c/Users/aleks/AppData/Roaming/npm/node_modules/openclaw/docs/reference/templates",
  probe:
    process.platform === "win32"
      ? "C:/Users/aleks/AppData/Local/Temp/openclaw-template-probe"
      : "/mnt/c/Users/aleks/AppData/Local/Temp/openclaw-template-probe",
  workspace:
    process.platform === "win32"
      ? "C:/Users/aleks/.openclaw/workspace"
      : "/mnt/c/Users/aleks/.openclaw/workspace",
};

const normalizeCrossPlatformPath = (p) => {
  const raw = String(p || "").trim();
  if (!raw) return "";
  if (process.platform === "win32" && raw.startsWith("/mnt/c/")) {
    return `C:/${raw.slice("/mnt/c/".length)}`;
  }
  if (process.platform !== "win32" && /^[A-Za-z]:\//.test(raw)) {
    const drive = raw[0].toLowerCase();
    return `/mnt/${drive}/${raw.slice(3)}`;
  }
  return raw;
};

const OPENCLAW_CONFIG_CANDIDATES = [
  process.env.OPENCLAW_CONFIG_PATH,
  userHome ? path.join(userHome, ".openclaw", "openclaw.json") : "",
  "/mnt/c/Users/aleks/.openclaw/openclaw.json",
  "C:/Users/aleks/.openclaw/openclaw.json",
]
  .map((v) => normalizeCrossPlatformPath(v))
  .filter(Boolean)
  .filter((v, idx, arr) => arr.indexOf(v) === idx);

const OPENCLAW_CONFIG =
  OPENCLAW_CONFIG_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ||
  OPENCLAW_CONFIG_CANDIDATES[0] ||
  normalizeCrossPlatformPath("C:/Users/aleks/.openclaw/openclaw.json");

const CANONICAL_WINDOWS_OPENCLAW_CONFIG = normalizeCrossPlatformPath(
  "C:/Users/aleks/.openclaw/openclaw.json"
);

const BOOT_MD = path.join(SURFACES.root, "BOOT.md");

const DEFAULT_BOOTSTRAP_MAX_CHARS = 20000;
const DEFAULT_BOOTSTRAP_TOTAL_MAX_CHARS = 150000;
const BOOTSTRAP_HEADROOM_THRESHOLD = 0.85;
const BOOTSTRAP_FILE_NAMES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "IDENTITY.md",
  "USER.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
  "MEMORY.md",
  "memory.md",
];
const SUBAGENT_MINIMAL_BOOTSTRAP_NAMES = new Set(["AGENTS.md", "TOOLS.md"]);
const GATEWAY_CMD_PATH = normalizeCrossPlatformPath("C:/Users/aleks/.openclaw/gateway.cmd");
const GATEWAY_WRAPPER_CMD_PATH = normalizeCrossPlatformPath(
  "C:/Users/aleks/.openclaw/gateway-wrapper.cmd"
);
const GATEWAY_PREFLIGHT_PS1_PATH = normalizeCrossPlatformPath(
  "C:/Users/aleks/.openclaw/gateway-preflight.ps1"
);

const normalizeNewlines = (s) => String(s).replace(/\r\n/g, "\n");
const sha256 = (input) => crypto.createHash("sha256").update(normalizeNewlines(input)).digest("hex");
const log = (...parts) => console.log(`[openclaw-validate] ${parts.join(" ")}`);

const errors = [];

const fail = (message) => {
  errors.push(message);
  console.error(`[openclaw-validate] ERROR ${message}`);
};

const readUtf8 = (filePath) => fs.readFileSync(filePath, "utf8");

const resolveBootstrapMaxChars = (cfg) => {
  const raw = cfg?.agents?.defaults?.bootstrapMaxChars;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return DEFAULT_BOOTSTRAP_MAX_CHARS;
};

const resolveBootstrapTotalMaxChars = (cfg) => {
  const raw = cfg?.agents?.defaults?.bootstrapTotalMaxChars;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return DEFAULT_BOOTSTRAP_TOTAL_MAX_CHARS;
};

const collectBootstrapFiles = (rootDir) =>
  BOOTSTRAP_FILE_NAMES.map((name) => ({
    name,
    filePath: path.join(rootDir, name),
  }))
    .filter((entry) => fs.existsSync(entry.filePath))
    .map((entry) => ({
      ...entry,
      chars: normalizeNewlines(readUtf8(entry.filePath)).length,
    }));

const validateBootstrapBudget = (cfg) => {
  const bootstrapMaxChars = resolveBootstrapMaxChars(cfg);
  const bootstrapTotalMaxChars = resolveBootstrapTotalMaxChars(cfg);
  const softHeadroomChars = Math.floor(bootstrapMaxChars * BOOTSTRAP_HEADROOM_THRESHOLD);
  const files = collectBootstrapFiles(SURFACES.root);

  if (files.length === 0) {
    fail("no bootstrap files found at vault root");
    return;
  }

  const totalChars = files.reduce((sum, file) => sum + file.chars, 0);
  for (const file of files) {
    if (file.chars > bootstrapMaxChars) {
      fail(
        `bootstrap truncation risk: ${file.name}=${file.chars} exceeds bootstrapMaxChars=${bootstrapMaxChars}; move net-new detail into layer files (BRAIN/MUSCLES/BONES/EYES/NERVES/RESPONSE) and keep AGENTS.md as the dispatcher`
      );
    } else if (file.chars >= softHeadroomChars) {
      fail(
        `bootstrap headroom low: ${file.name}=${file.chars} is >= ${BOOTSTRAP_HEADROOM_THRESHOLD * 100}% of bootstrapMaxChars=${bootstrapMaxChars}; prefer adding new directives to layer files instead of expanding AGENTS.md`
      );
    }
  }
  if (totalChars > bootstrapTotalMaxChars) {
    fail(
      `bootstrap total truncation risk: total=${totalChars} exceeds bootstrapTotalMaxChars=${bootstrapTotalMaxChars}`
    );
  }

  const subagentFiles = files.filter((file) => SUBAGENT_MINIMAL_BOOTSTRAP_NAMES.has(file.name));
  const subagentTotalChars = subagentFiles.reduce((sum, file) => sum + file.chars, 0);
  if (subagentTotalChars > bootstrapTotalMaxChars) {
    fail(
      `subagent bootstrap total risk: AGENTS+TOOLS=${subagentTotalChars} exceeds bootstrapTotalMaxChars=${bootstrapTotalMaxChars}`
    );
  }
  log(
    `bootstrap budget ok max=${bootstrapMaxChars} totalMax=${bootstrapTotalMaxChars} total=${totalChars} subagentTotal=${subagentTotalChars}`
  );
};

const validateFilesExist = () => {
  const optionalMissingAtRoot = new Set(
    [...OPTIONAL_ROOT_FILES].filter((file) => !fs.existsSync(path.join(SURFACES.root, file)))
  );

  for (const [surfaceName, surfacePath] of Object.entries(SURFACES)) {
    for (const file of REQUIRED_FILES) {
      // If an optional file is intentionally absent at root, it is optional on all mirrored surfaces.
      if (optionalMissingAtRoot.has(file)) continue;
      const full = path.join(surfacePath, file);
      if (surfaceName === "root" && OPTIONAL_ROOT_FILES.has(file) && !fs.existsSync(full)) continue;
      if (!fs.existsSync(full)) fail(`missing ${surfaceName}:${file}`);
    }
  }
};

const validateHashes = () => {
  const source = SURFACES.root;
  for (const file of REQUIRED_FILES) {
    const srcPath = path.join(source, file);
    if (!fs.existsSync(srcPath)) continue;
    const srcHash = sha256(readUtf8(srcPath));
    for (const [surfaceName, surfacePath] of Object.entries(SURFACES)) {
      if (surfaceName === "root") continue;
      const dstPath = path.join(surfacePath, file);
      if (!fs.existsSync(dstPath)) continue;
      const dstHash = sha256(readUtf8(dstPath));
      if (srcHash !== dstHash) fail(`hash mismatch ${file} root!=${surfaceName}`);
    }
  }
};

const validateMemoryNaming = () => {
  const stalePattern = /memory\/YYYY-MM-DD\.md/g;
  for (const [surfaceName, surfacePath] of Object.entries(SURFACES)) {
    const filesToScan = ["AGENTS.md", "MISSION_CONTROL.md", "TOOLS.md"];
    for (const file of filesToScan) {
      const full = path.join(surfacePath, file);
      if (!fs.existsSync(full)) continue;
      const content = readUtf8(full);
      if (stalePattern.test(content)) fail(`stale memory naming in ${surfaceName}:${file}`);
    }
  }
};

const validateHooksBootstrap = () => {
  // Upgrade-safe strategy: do NOT patch OpenClaw dist.
  // Instead, rely on supported hooks (boot-md) + a workspace BOOT.md.

  if (!fs.existsSync(BOOT_MD)) {
    fail(`missing root:BOOT.md (required for hooks-based bootstrap)`);
  }

  if (!fs.existsSync(OPENCLAW_CONFIG)) {
    fail(
      `openclaw config missing: ${OPENCLAW_CONFIG} (candidates: ${OPENCLAW_CONFIG_CANDIDATES.join(
        " | "
      )})`
    );
    return;
  }

  try {
    const cfg = JSON.parse(readUtf8(OPENCLAW_CONFIG));
    const hooksEnabled = cfg?.hooks?.enabled;
    const internalEnabled = cfg?.hooks?.internal?.enabled;
    const bootMdEnabled = cfg?.hooks?.internal?.entries?.["boot-md"]?.enabled;
    const defaultSessionKey = cfg?.hooks?.defaultSessionKey;

    if (!hooksEnabled) fail("hooks.enabled is not true");
    if (!internalEnabled) fail("hooks.internal.enabled is not true (boot-md requires internal hooks)");
    if (!bootMdEnabled) fail("hooks.internal.entries.boot-md.enabled is not true");
    if (!defaultSessionKey) fail("hooks.defaultSessionKey is not configured");
  } catch (err) {
    fail(`failed to parse openclaw config: ${err.message}`);
  }
};

const validateRuntimePolicy = () => {
  if (!fs.existsSync(OPENCLAW_CONFIG)) {
    fail(
      `openclaw config missing: ${OPENCLAW_CONFIG} (candidates: ${OPENCLAW_CONFIG_CANDIDATES.join(
        " | "
      )})`
    );
    return;
  }
  try {
    if (
      fs.existsSync(CANONICAL_WINDOWS_OPENCLAW_CONFIG) &&
      normalizeCrossPlatformPath(OPENCLAW_CONFIG) !== CANONICAL_WINDOWS_OPENCLAW_CONFIG
    ) {
      fail(
        `runtime config drift: resolved=${OPENCLAW_CONFIG} canonical=${CANONICAL_WINDOWS_OPENCLAW_CONFIG} (set OPENCLAW_CONFIG_PATH + OPENCLAW_STATE_DIR to canonical path in WSL shells)`
      );
    }

    const cfg = JSON.parse(readUtf8(OPENCLAW_CONFIG));
    const primary = cfg?.agents?.defaults?.model?.primary;
    const fallbacks = cfg?.agents?.defaults?.model?.fallbacks;
    const compactionMode = cfg?.agents?.defaults?.compaction?.mode;
    const thinkingDefault = cfg?.agents?.defaults?.thinkingDefault;
    const subagentModel = cfg?.agents?.defaults?.subagents?.model;
    const subagentThinking = cfg?.agents?.defaults?.subagents?.thinking;

    if (primary !== "openai-codex/gpt-5.3-codex") {
      fail(`unexpected primary model: ${String(primary || "<missing>")}`);
    }
    if (!Array.isArray(fallbacks) || !fallbacks.includes("openai-codex/gpt-5.2")) {
      fail("fallback model missing openai-codex/gpt-5.2");
    }
    if (compactionMode !== "safeguard") {
      fail(`unexpected compaction mode: ${String(compactionMode || "<missing>")}`);
    }
    if (!["high", "xhigh"].includes(String(thinkingDefault || ""))) {
      fail(`thinkingDefault must be high|xhigh (found: ${String(thinkingDefault || "<missing>")})`);
    }
    if (subagentModel !== "openai-codex/gpt-5.3-codex") {
      fail(`unexpected subagents.model: ${String(subagentModel || "<missing>")}`);
    }
    if (!["high", "xhigh"].includes(String(subagentThinking || ""))) {
      fail(`subagents.thinking must be high|xhigh (found: ${String(subagentThinking || "<missing>")})`);
    }

    validateBootstrapBudget(cfg);
  } catch (err) {
    fail(`failed to parse openclaw config: ${err.message}`);
  }
};

const validateGatewayLaunchGuards = () => {
  const baseMarkers = [
    'if /I "%CD%"=="C:\\Windows\\System32" cd /d "%USERPROFILE%"',
    "title OpenClaw Gateway",
  ];
  const wrapperMarkers = ['set "GATEWAY_PREFLIGHT=%USERPROFILE%\\.openclaw\\gateway-preflight.ps1"'];
  const preflightMarkers = [
    "Get-NetTCPConnection -LocalPort",
    "Stop-Process -Id",
    "preflight complete",
  ];

  const checkFile = (filePath, markers = baseMarkers) => {
    if (!fs.existsSync(filePath)) {
      fail(`gateway launcher missing: ${filePath}`);
      return;
    }
    const content = readUtf8(filePath);
    for (const marker of markers) {
      if (!content.includes(marker)) {
        fail(`gateway launcher guard missing in ${filePath}: ${marker}`);
      }
    }
  };

  checkFile(GATEWAY_CMD_PATH, baseMarkers);
  checkFile(GATEWAY_WRAPPER_CMD_PATH, [...baseMarkers, ...wrapperMarkers]);
  checkFile(GATEWAY_PREFLIGHT_PS1_PATH, preflightMarkers);
};

const main = () => {
  validateFilesExist();
  validateHashes();
  validateMemoryNaming();
  validateHooksBootstrap();
  validateRuntimePolicy();
  validateGatewayLaunchGuards();

  if (errors.length > 0) {
    log(`failed checks=${errors.length}`);
    process.exit(1);
  }

  log("all checks passed");
};

main();
