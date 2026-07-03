# NullToHero — Manual installer for Windows (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1
# Requires: Claude Code CLI, Git

$ErrorActionPreference = "Stop"

$REPO      = "MariusYvard/NullToHero"
$PLUGIN_DIR = Join-Path $env:USERPROFILE ".claude\plugins"
$INSTALL_NAME = "null-to-hero"
$PLUGIN_VERSION = "1.21.0"   # pinned release tag for the manual-clone fallback

function Log   { param($msg) Write-Host "[NullToHero] $msg" -ForegroundColor Cyan }
function Ok    { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Err   { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

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

    $dest = Join-Path $PLUGIN_DIR $INSTALL_NAME
    if (Test-Path $dest) {
        Warn "Existing installation found at $dest. Removing before reinstall."
        Remove-Item $dest -Recurse -Force
    }

    Copy-Item "$tempDir\NullToHero" $dest -Recurse -Force
    Ok "Files copied to $dest"

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
