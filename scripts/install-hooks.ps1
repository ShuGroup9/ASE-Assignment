# Run once after cloning: points git at the repo's shared hooks.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\install-hooks.ps1
# Required: Git for Windows.

$ErrorActionPreference = 'Stop'
$root = git rev-parse --show-toplevel

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git -C $root config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Git hooks installed (commit-msg, pre-push)."
