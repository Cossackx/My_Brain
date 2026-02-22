#!/usr/bin/env node
/**
 * Remediate OpenClaw gateway startup guard drift after upgrades.
 *
 * Ensures:
 * - ~/.openclaw/gateway.cmd contains startup base guards
 * - ~/.openclaw/gateway-preflight.ps1 matches canonical template
 * - ~/.openclaw/gateway-wrapper.cmd contains preflight hook block
 *
 * Usage:
 *   node System/automation/openclaw/remediateGatewayStartupGuards.js
 *   node System/automation/openclaw/remediateGatewayStartupGuards.js --dry-run
 *   node System/automation/openclaw/remediateGatewayStartupGuards.js --state-dir=/path/to/.openclaw
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const stateDirArg = args.find((arg) => arg.startsWith("--state-dir="));

const normalizeCrossPlatformPath = (inputPath) => {
  const raw = String(inputPath || "").trim();
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

const sha256 = (text) =>
  crypto.createHash("sha256").update(String(text).replace(/\r\n/g, "\n")).digest("hex");

const log = (...parts) => console.log(`[gateway-guard-remediate] ${parts.join(" ")}`);
const fail = (message) => {
  console.error(`[gateway-guard-remediate] ERROR ${message}`);
  process.exit(1);
};

const detectEol = (text) => (String(text).includes("\r\n") ? "\r\n" : "\n");

const resolveStateDir = () => {
  const candidates = [
    stateDirArg ? stateDirArg.slice("--state-dir=".length) : "",
    process.env.OPENCLAW_STATE_DIR,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".openclaw") : "",
    "C:/Users/aleks/.openclaw",
    "/mnt/c/Users/aleks/.openclaw",
  ]
    .map((entry) => normalizeCrossPlatformPath(entry))
    .filter(Boolean)
    .filter((entry, idx, arr) => arr.indexOf(entry) === idx);

  const existing = candidates.find((entry) => fs.existsSync(entry));
  if (existing) return path.resolve(existing);
  return path.resolve(candidates[0] || normalizeCrossPlatformPath("/mnt/c/Users/aleks/.openclaw"));
};

const scriptDir = __dirname;
const stateDir = resolveStateDir();
const gatewayCmdTargetPath = path.join(stateDir, "gateway.cmd");
const preflightTemplatePath = path.join(scriptDir, "templates", "gateway-preflight.ps1");
const preflightTargetPath = path.join(stateDir, "gateway-preflight.ps1");
const wrapperTargetPath = path.join(stateDir, "gateway-wrapper.cmd");
const backupDir = path.join(stateDir, "backups", "gateway-guard");

const baseCdGuard = 'if /I "%CD%"=="C:\\Windows\\System32" cd /d "%USERPROFILE%"';
const baseTitleGuard = "title OpenClaw Gateway";
const preflightMarker = 'set "GATEWAY_PREFLIGHT=%USERPROFILE%\\.openclaw\\gateway-preflight.ps1"';
const preflightBlock = [
  preflightMarker,
  'if exist "%GATEWAY_PREFLIGHT%" (',
  '  powershell -NoProfile -ExecutionPolicy Bypass -File "%GATEWAY_PREFLIGHT%" -Port 18789 -GatewayCmdPath "%USERPROFILE%\\.openclaw\\gateway.cmd"',
  ")",
];

const wrapperBaseline = [
  "@echo off",
  "setlocal EnableExtensions",
  "",
  "rem OpenClaw Gateway wrapper",
  "rem - If gateway is already reachable, exit 0 so Task Scheduler records success.",
  "rem - Otherwise, start the gateway via the standard OpenClaw gateway.cmd.",
  "",
  baseCdGuard,
  baseTitleGuard,
  "",
  ...preflightBlock,
  "",
  "powershell -NoProfile -ExecutionPolicy Bypass -Command ^",
  "  \"$u='http://127.0.0.1:18789/'; try { iwr -UseBasicParsing -TimeoutSec 2 $u | Out-Null; exit 0 } catch { exit 1 }\"",
  "",
  "if %errorlevel%==0 exit /b 0",
  "",
  'call "%USERPROFILE%\\.openclaw\\gateway.cmd"',
  "exit /b %errorlevel%",
].join("\r\n") + "\r\n";

const ensureDir = (dirPath) => {
  if (dryRun) return;
  fs.mkdirSync(dirPath, { recursive: true });
};

const writeFile = (filePath, content) => {
  if (dryRun) return;
  fs.writeFileSync(filePath, content, "utf8");
};

const backupFileIfPresent = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `${path.basename(filePath)}.bak-${stamp}`);
  ensureDir(backupDir);
  if (!dryRun) fs.copyFileSync(filePath, backupPath);
  return backupPath;
};

const ensurePreflightScript = () => {
  if (!fs.existsSync(preflightTemplatePath)) {
    fail(`missing canonical preflight template: ${preflightTemplatePath}`);
  }

  const desired = fs.readFileSync(preflightTemplatePath, "utf8");
  const current = fs.existsSync(preflightTargetPath)
    ? fs.readFileSync(preflightTargetPath, "utf8")
    : null;

  if (current !== null && sha256(current) === sha256(desired)) {
    log(`preflight ok ${preflightTargetPath}`);
    return { changed: false, backup: null };
  }

  const backup = backupFileIfPresent(preflightTargetPath);
  writeFile(preflightTargetPath, desired);
  log(`${dryRun ? "would_write" : "wrote"} preflight ${preflightTargetPath}`);
  if (backup) log(`backup ${backup}`);
  return { changed: true, backup };
};

const hasPreflightHook = (wrapperText) =>
  wrapperText.includes(preflightMarker) &&
  wrapperText.includes('powershell -NoProfile -ExecutionPolicy Bypass -File "%GATEWAY_PREFLIGHT%"');

const injectPreflightHook = (wrapperText) => {
  const eol = detectEol(wrapperText);
  const lines = wrapperText.replace(/\r\n/g, "\n").split("\n");
  const anchorIdx = lines.findIndex((line) => /^title\s+OpenClaw Gateway\s*$/i.test(line.trim()));
  const insertAt = anchorIdx >= 0 ? anchorIdx + 1 : 2;
  const block = ["", ...preflightBlock, ""];
  lines.splice(insertAt, 0, ...block);
  let output = lines.join("\n");
  if (!output.endsWith("\n")) output += "\n";
  if (eol === "\r\n") output = output.replace(/\n/g, "\r\n");
  return output;
};

const ensureGatewayCmdBaseGuards = () => {
  if (!fs.existsSync(gatewayCmdTargetPath)) {
    fail(`missing gateway launcher: ${gatewayCmdTargetPath}`);
  }

  const current = fs.readFileSync(gatewayCmdTargetPath, "utf8");
  const needsCd = !current.includes(baseCdGuard);
  const needsTitle = !current.includes(baseTitleGuard);

  if (!needsCd && !needsTitle) {
    log(`gateway cmd guards ok ${gatewayCmdTargetPath}`);
    return { changed: false, backup: null };
  }

  const eol = detectEol(current);
  const lines = current.replace(/\r\n/g, "\n").split("\n");
  let insertAt = 0;
  const echoIdx = lines.findIndex((line) => /^@echo\s+off$/i.test(line.trim()));
  if (echoIdx >= 0) insertAt = echoIdx + 1;
  const setlocalIdx = lines.findIndex((line, idx) => idx >= insertAt && /^setlocal/i.test(line.trim()));
  if (setlocalIdx >= 0) insertAt = setlocalIdx + 1;

  const inject = [];
  if (needsCd) inject.push(baseCdGuard);
  if (needsTitle) inject.push(baseTitleGuard);

  lines.splice(insertAt, 0, ...inject);
  let next = lines.join("\n");
  if (!next.endsWith("\n")) next += "\n";
  if (eol === "\r\n") next = next.replace(/\n/g, "\r\n");

  const backup = backupFileIfPresent(gatewayCmdTargetPath);
  writeFile(gatewayCmdTargetPath, next);
  log(`${dryRun ? "would_patch" : "patched"} gateway cmd ${gatewayCmdTargetPath}`);
  if (backup) log(`backup ${backup}`);
  return { changed: true, backup };
};

const ensureWrapperHook = () => {
  const current = fs.existsSync(wrapperTargetPath)
    ? fs.readFileSync(wrapperTargetPath, "utf8")
    : null;

  if (current === null) {
    writeFile(wrapperTargetPath, wrapperBaseline);
    log(`${dryRun ? "would_create" : "created"} wrapper ${wrapperTargetPath}`);
    return { changed: true, backup: null };
  }

  if (hasPreflightHook(current)) {
    log(`wrapper hook ok ${wrapperTargetPath}`);
    return { changed: false, backup: null };
  }

  const next = injectPreflightHook(current);
  const backup = backupFileIfPresent(wrapperTargetPath);
  writeFile(wrapperTargetPath, next);
  log(`${dryRun ? "would_patch" : "patched"} wrapper ${wrapperTargetPath}`);
  if (backup) log(`backup ${backup}`);
  return { changed: true, backup };
};

const main = () => {
  log(`state_dir=${stateDir}`);
  const gatewayCmd = ensureGatewayCmdBaseGuards();
  const preflight = ensurePreflightScript();
  const wrapper = ensureWrapperHook();
  const changed = gatewayCmd.changed || preflight.changed || wrapper.changed;
  log(`result ${changed ? "updated" : "unchanged"} dry_run=${dryRun ? "true" : "false"}`);
};

main();
