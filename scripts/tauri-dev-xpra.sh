#!/usr/bin/env bash
# Launch `bun run tauri:dev` inside xpra display :100.
# Auto-starts xpra if not running.
set -euo pipefail
cd "$(dirname "$0")/.."

# Ensure xpra is up
./scripts/xpra-up.sh

# Ensure PATH includes bun + cargo (in case running fresh shell)
export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"
export DISPLAY=":100"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$HOME/.xdg-runtime}"
mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"
# Disable GDK acceleration that can crash on Xvfb-style display
export WEBKIT_DISABLE_COMPOSITING_MODE=1

echo "[tauri] DISPLAY=${DISPLAY} → bun run tauri:dev"
echo "[tauri] open browser tab → http://localhost:14500 to see the window"
exec bun run tauri:dev
