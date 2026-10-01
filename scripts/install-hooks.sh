#!/usr/bin/env bash
# Run once after cloning: points git at the repo's shared hooks.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
chmod +x .githooks/*
git config core.hooksPath .githooks
echo " Git hooks installed (commit-msg, pre-push)."
