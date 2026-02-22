param(
  [int]$Port = 18789,
  [string]$GatewayCmdPath = "$env:USERPROFILE\.openclaw\gateway.cmd",
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$stateDir = Join-Path $env:USERPROFILE '.openclaw'
$logDir = Join-Path $stateDir 'logs'
$logPath = Join-Path $logDir 'gateway-preflight.log'

function Ensure-LogDir {
  if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  }
}

function Write-Log {
  param([string]$Message)
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $line = "[$ts] $Message"
  try {
    Add-Content -Path $logPath -Value $line -ErrorAction Stop
  } catch {
    try {
      [System.IO.File]::AppendAllText($logPath, "$line`r`n")
    } catch {
      # Logging must never block preflight execution.
    }
  }
}

function Get-ExpectedGatewaySignature {
  param(
    [string]$CmdPath,
    [int]$DefaultPort
  )

  $signature = @{
    Entry = "openclaw\\dist\\index.js"
    Port = $DefaultPort
  }

  if (-not (Test-Path $CmdPath)) {
    return $signature
  }

  $candidate = Get-Content -Path $CmdPath -ErrorAction SilentlyContinue |
    Where-Object { $_ -match 'openclaw[\\/]+dist[\\/]+index\.js' -and $_ -match 'gateway\s+run' } |
    Select-Object -Last 1

  if (-not $candidate) {
    return $signature
  }

  if ($candidate -match '"?(?<entry>[A-Za-z]:[\\/][^" ]*openclaw[\\/]+dist[\\/]+index\.js)"?') {
    $signature.Entry = $matches.entry
  }

  if ($candidate -match '--port\s+(?<port>\d+)') {
    $signature.Port = [int]$matches.port
  }

  return $signature
}

function Get-ListenerPids {
  param([int]$TargetPort)

  try {
    $listeners = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction Stop
    if (-not $listeners) {
      return @()
    }
    return @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
  } catch {
    return @()
  }
}

function Get-ProcessCommandLine {
  param([int]$ProcessId)

  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
    return [string]$proc.CommandLine
  } catch {
    return $null
  }
}

function Test-IsCanonicalGatewayProcess {
  param(
    [string]$CommandLine,
    [hashtable]$Signature
  )

  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return $false
  }

  $cmd = $CommandLine.ToLowerInvariant()
  $expectedPort = [string]$Signature.Port
  $hasGatewayRun = $cmd -match 'gateway\s+run'
  $hasPort = $cmd -match ("--port\s+" + [regex]::Escape($expectedPort))

  $entry = [string]$Signature.Entry
  $hasEntry = $false
  if ([string]::IsNullOrWhiteSpace($entry)) {
    $hasEntry = $cmd -match 'openclaw[\\/]+dist[\\/]+index\.js'
  } elseif ($entry -match '^[A-Za-z]:') {
    $hasEntry = $cmd -match [regex]::Escape($entry.ToLowerInvariant())
  } else {
    $hasEntry = $cmd -match 'openclaw[\\/]+dist[\\/]+index\.js'
  }

  return $hasEntry -and $hasGatewayRun -and $hasPort
}

function Format-CommandPreview {
  param([string]$CommandLine)

  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return "<missing>"
  }

  $singleLine = $CommandLine.Replace("`r", " ").Replace("`n", " ").Trim()
  if ($singleLine.Length -gt 240) {
    return $singleLine.Substring(0, 240) + "..."
  }
  return $singleLine
}

Ensure-LogDir

try {
  $signature = Get-ExpectedGatewaySignature -CmdPath $GatewayCmdPath -DefaultPort $Port
  $pids = Get-ListenerPids -TargetPort $Port

  if ($pids.Count -eq 0) {
    Write-Log ("preflight clear: no listener on port {0}" -f $Port)
    exit 0
  }

  $kept = 0
  $stopped = 0
  foreach ($listenerPid in $pids) {
    if ($listenerPid -le 4) {
      Write-Log ("skipped reserved pid={0} on port {1}" -f $listenerPid, $Port)
      continue
    }

    $commandLine = Get-ProcessCommandLine -ProcessId $listenerPid
    $preview = Format-CommandPreview -CommandLine $commandLine
    if (Test-IsCanonicalGatewayProcess -CommandLine $commandLine -Signature $signature) {
      $kept++
      Write-Log ("kept canonical listener pid={0} port={1} cmd={2}" -f $listenerPid, $Port, $preview)
      continue
    }

    if ($DryRun) {
      $stopped++
      Write-Log ("dry-run stale listener pid={0} port={1} cmd={2}" -f $listenerPid, $Port, $preview)
      continue
    }

    try {
      Stop-Process -Id $listenerPid -Force -ErrorAction Stop
      $stopped++
      Write-Log ("stopped stale listener pid={0} port={1} cmd={2}" -f $listenerPid, $Port, $preview)
    } catch {
      Write-Log ("failed stopping stale listener pid={0} port={1} err={2}" -f $listenerPid, $Port, $_.Exception.Message)
    }
  }

  Write-Log ("preflight complete port={0} kept={1} stopped={2}" -f $Port, $kept, $stopped)
} catch {
  Write-Log ("preflight error port={0} err={1}" -f $Port, $_.Exception.Message)
}

exit 0
