#!/usr/bin/env bash
# Start Xpra virtual display :100 with HTML5 client on port 14500.
# Re-running this is safe — checks if server already running.
set -euo pipefail

DISPLAY_NUM=":100"
HTML_PORT="14500"
LOG_DIR="$HOME/.xpra"
mkdir -p "$LOG_DIR"

# Codespaces containers don't have /run/user/$UID. Provide our own.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$HOME/.xdg-runtime}"
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

if xpra list 2>/dev/null | grep -qE "LIVE session at ${DISPLAY_NUM}\b"; then
  echo "[xpra] already running on ${DISPLAY_NUM} (port ${HTML_PORT})"
  exit 0
fi

echo "[xpra] starting display ${DISPLAY_NUM} with HTML5 client on :${HTML_PORT}..."
xpra start "${DISPLAY_NUM}" \
  --bind-tcp="0.0.0.0:${HTML_PORT}" \
  --html=on \
  --daemon=yes \
  --mdns=no \
  --pulseaudio=no \
  --notifications=no \
  --systemd-run=no \
  --start-via-proxy=no \
  --log-dir="${LOG_DIR}" \
  --log-file="xpra-%DISPLAY%.log"

# Give it a moment to bind the port
sleep 2
if xpra list 2>/dev/null | grep -qE "LIVE session at ${DISPLAY_NUM}\b"; then
  echo "[xpra] ✅ up on DISPLAY=${DISPLAY_NUM}, browser → http://localhost:${HTML_PORT}"
else
  echo "[xpra] ❌ failed to start. Check ${LOG_DIR}/xpra-${DISPLAY_NUM#:}.log"
  exit 1
fi
