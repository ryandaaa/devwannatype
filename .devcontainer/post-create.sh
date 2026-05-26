#!/usr/bin/env bash
# Auto-run after Codespace creation. Installs everything needed for full Tauri + Xpra.
set -euo pipefail

echo "[post-create] installing apt deps (Tauri + Xpra)..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  build-essential curl wget file pkg-config \
  libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
  libssl-dev libxdo-dev \
  xpra xvfb

echo "[post-create] installing bun..."
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
fi
export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"

echo "[post-create] bun install..."
bun install

echo "[post-create] ✅ done. Run ./scripts/tauri-dev-xpra.sh to start full Tauri."
