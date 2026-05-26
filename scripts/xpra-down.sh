#!/usr/bin/env bash
# Stop the Xpra server on :100
set -euo pipefail
DISPLAY_NUM=":100"
echo "[xpra] stopping ${DISPLAY_NUM}..."
xpra stop "${DISPLAY_NUM}" 2>&1 | tail -5 || true
