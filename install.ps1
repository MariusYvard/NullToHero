# NullToHero — Manual installer for Windows (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1 [-Target claude|codex|kimi|agents|all]
# Requires: Claude Code CLI, Git

param([ValidateSet("claude","codex","kimi","agents","all")][string]$Target = "claude")

$ErrorActionPreference = "Stop"

$REPO      = "MariusYvard/NullToHero"
$PLUGIN_DIR = Join-Path $env:USERPROFILE ".claude\plugins"
$INSTALL_NAME = "null-to-hero"
$PLUGIN_VERSION = "4.0.0"   # pinned release tag for the manual-clone fallback

function Log   { param($msg) Write-Host "[NullToHero] $msg" -ForegroundColor Cyan }
function Ok    { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Err   { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# ─── Portable targets: Codex and Kimi ─────────────────────────────────────────
#
#   -Target codex   copies dist\codex  into %USERPROFILE%\.agents\skills
#   -Target kimi    copies dist\kimi   into %USERPROFILE%\.kimi-code\skills
#   -Target agents  copies dist\agents into %USERPROFILE%\.agents\skills
#   -Target all     codex and kimi
#
# The Codex and Kimi directories are kept apart because Codex needs the short
# descriptions and Kimi carries the long ones; one shared copy would have to
# lose one.
#
# `agents` is the package for every other host that reads the Agent Skills
# format: Cursor, GitHub Copilot, VS Code, Gemini CLI, opencode and the rest. It
# carries no sub-agents, because the standard defines none. It lands in the same
# directory as `codex`, so the two exclude one another and the installer refuses
# rather than overwriting.

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$NTH_ROOT_ABS = Join-Path $SCRIPT_DIR "null-to-hero"

function Install-Portable {
    param([string]$HostName)

    $src = Join-Path $SCRIPT_DIR "dist\$HostName"
    if (-not (Test-Path $src)) {
        Err "dist\$HostName not found. Run: node null-to-hero\tools\build-dist.mjs"
    }
    if (-not (Test-Path (Join-Path $NTH_ROOT_ABS ".claude-plugin\plugin.json"))) {
        Err "This script must run from a NullToHero checkout; $NTH_ROOT_ABS is missing."
    }

    # `.kimi-code`, pas `.kimi` : c'est le dossier que le lancement observé du
    # 19 août 2026 a montré, et celui que build-dist.mjs déclare. Ce script
    # écrivait ailleurs, donc son installation Kimi n'était jamais lue.
    $skillsDir = if ($HostName -eq "kimi") { Join-Path $env:USERPROFILE ".kimi-code\skills" }
                 else { Join-Path $env:USERPROFILE ".agents\skills" }
    New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null

    foreach ($skill in Get-ChildItem (Join-Path $src "skills") -Directory) {
        $dest = Join-Path $skillsDir $skill.Name
        if ((Test-Path $dest) -and -not (Test-Path (Join-Path $dest ".nth-installed"))) {
            Warn "Skipping $dest : it exists and was not installed by NullToHero."
            continue
        }
        # `codex` et `agents` visent le même dossier : refuser plutôt que
        # d'écraser l'un par l'autre en silence.
        $skillFile = Join-Path $dest "SKILL.md"
        if ((Test-Path $skillFile) -and -not (Select-String -Path $skillFile -Pattern "^  host: $HostName$" -Quiet)) {
            $other = (Select-String -Path $skillFile -Pattern "^  host: (.+)$").Matches[0].Groups[1].Value
            Err "$dest holds the $other package. It and $HostName share this directory. Remove .agents\skills\nth-* first, or install the other target."
        }
        if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
        Copy-Item $skill.FullName $dest -Recurse

        # Resolve the root token to this checkout. Tools and assets are read from
        # the checkout, they are not copied.
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        Get-ChildItem $dest -Recurse -File -Include *.md,*.mjs,*.py | ForEach-Object {
            $text = [System.IO.File]::ReadAllText($_.FullName)
            if ($text.Contains('${NTH_ROOT}')) {
                [System.IO.File]::WriteAllText($_.FullName, $text.Replace('${NTH_ROOT}', $NTH_ROOT_ABS), $utf8)
            }
        }
        Set-Content -Path (Join-Path $dest ".nth-installed") -Value (Get-Date -Format o) -Encoding utf8
        Ok "$($skill.Name) -> $dest"
    }

    # Le paquet neutre n'a pas de sous-agents : le standard n'en définit pas.
    if (Test-Path (Join-Path $src "agents")) {
        $agentsDest = if ($HostName -eq "kimi") { Join-Path $env:USERPROFILE ".kimi-code\agents" }
                      else { Join-Path $env:USERPROFILE ".codex\agents" }
        New-Item -ItemType Directory -Path $agentsDest -Force | Out-Null
        Copy-Item (Join-Path $src "agents\*") $agentsDest -Recurse -Force
        Ok "sub-agents -> $agentsDest"
    } else {
        Log "No sub-agents in this package: the Agent Skills standard defines none."
    }
    Log "Read dist\VERIFY.md: three claims about these hosts come from their"
    Log "documentation and have never been observed running."
}

switch ($Target) {
    "codex"  { Install-Portable "codex"; exit 0 }
    "kimi"   { Install-Portable "kimi";  exit 0 }
    "agents" { Install-Portable "agents"; exit 0 }
    "all"    { Install-Portable "codex"; Install-Portable "kimi"; exit 0 }
}

# ─── Check dependencies ───────────────────────────────────────────────────────

Log "Checking dependencies..."

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Err "Claude Code CLI not found. Install it from: https://claude.ai/claude-code"
}

$claudeVersion = claude --version 2>$null | Select-Object -First 1
Log "Claude Code version: $claudeVersion"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Err "git is required. Install Git from: https://git-scm.com"
}

Ok "Dependencies satisfied."

# ─── Preferred path: plugin marketplace ───────────────────────────────────────

Log "Attempting marketplace install (recommended)..."

$marketplaceOk = $false
try {
    claude plugin marketplace add $REPO
    if ($LASTEXITCODE -eq 0) {
        claude plugin install "${INSTALL_NAME}@null-to-hero-marketplace"
        if ($LASTEXITCODE -eq 0) { $marketplaceOk = $true }
    }
} catch {}

if ($marketplaceOk) {
    Ok "Installed via marketplace. Auto-updates enabled."
    Ok "Run /siteasy, /seo, /inspect, or /audit in Claude to get started."
    exit 0
}

Warn "Marketplace install failed or not supported. Falling back to manual install."

# ─── Fallback: manual git clone ───────────────────────────────────────────────

$tempDir = Join-Path $env:TEMP "NullToHero-install-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    Log "Cloning repository (pinned to v$PLUGIN_VERSION)..."
    git clone --depth 1 --branch "v$PLUGIN_VERSION" "https://github.com/$REPO.git" "$tempDir\NullToHero" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Warn "Tag v$PLUGIN_VERSION not found; falling back to default branch."
        git clone --depth 1 "https://github.com/$REPO.git" "$tempDir\NullToHero"
    }

    Log "Installing plugin manually..."
    if (-not (Test-Path $PLUGIN_DIR)) {
        New-Item -ItemType Directory -Path $PLUGIN_DIR -Force | Out-Null
    }

    # What is cloned is the marketplace: its manifest sits at the repository root
    # and the plugin itself is in null-to-hero\. It must not occupy the directory
    # name Claude Code uses for the installed plugin.
    $dest = Join-Path $PLUGIN_DIR "$INSTALL_NAME-marketplace"
    if (Test-Path $dest) {
        Warn "Existing installation found at $dest. Removing before reinstall."
        Remove-Item $dest -Recurse -Force
    }

    Copy-Item "$tempDir\NullToHero" $dest -Recurse -Force
    Ok "Marketplace copied to $dest (plugin in $dest\$INSTALL_NAME)"

    # Register the local copy as a marketplace, then install from it
    try {
        claude plugin marketplace add $dest
        if ($LASTEXITCODE -eq 0) {
            claude plugin install "${INSTALL_NAME}@null-to-hero-marketplace"
        }
        if ($LASTEXITCODE -eq 0) {
            Ok "Plugin registered with Claude Code."
        } else {
            Warn "Could not auto-register. Run 'claude plugin marketplace add `"$dest`"' manually, then restart Claude Code."
        }
    } catch {
        Warn "Could not auto-register. Run 'claude plugin marketplace add `"$dest`"' manually, then restart Claude Code."
    }

} finally {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# ─── Node.js check ────────────────────────────────────────────────────────────

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Warn "Node.js not found. /inspect preview and /inspect detect require Node.js."
    Warn "Install Node.js from: https://nodejs.org"
} else {
    $nodeVersion = node --version
    Ok "Node.js $nodeVersion found. /inspect commands will work."
}

# ─── Done ─────────────────────────────────────────────────────────────────────

Write-Host ""
Ok "NullToHero installed successfully!"
Write-Host ""
Write-Host "  Skills available:" -ForegroundColor Cyan
Write-Host "    /siteasy  — Design, UX, motion, accessibility" -ForegroundColor Green
Write-Host "    /seo      — Full SEO toolkit (19 commands)" -ForegroundColor Green
Write-Host "    /inspect  — Anti-pattern detection, browser preview" -ForegroundColor Green
Write-Host "    /audit    — Whole-site audit, 13 parallel sub-agents" -ForegroundColor Green
Write-Host ""
Write-Host "  If a short name collides with another plugin, use the namespaced form:" -ForegroundColor Cyan
Write-Host "    /null-to-hero:seo · /null-to-hero:siteasy · /null-to-hero:inspect · /null-to-hero:audit"
Write-Host ""
Write-Host "  Quick start:" -ForegroundColor Cyan
Write-Host "    /seo audit https://yoursite.com"
Write-Host "    /siteasy setup"
Write-Host "    /inspect detect index.html"
Write-Host ""
Write-Host "  To update later:" -ForegroundColor Cyan
Write-Host "    powershell -ExecutionPolicy Bypass -File install.ps1"
