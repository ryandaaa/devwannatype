# Running devwannatype in GitHub Codespaces (Full Tauri via Xpra)

This project is a Tauri desktop app, so it normally needs a graphical
display. In a headless Linux container (Codespaces) we use **Xpra** to
provide a virtual X display and stream the app window to your browser
via Xpra's HTML5 client.

> ⚠️ Note: WebKit2GTK + CPU-only encoding will feel laggier than a
> native desktop. For UI work where typing speed matters, prefer
> `bun run dev` (frontend-only) and access via Codespaces port
> forwarding to `:1420`. Full Tauri here is best for testing
> SQLite / PTY / file dialogs / window controls.

## One-time setup (already done if you cloned a fresh codespace)

1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal`
3. Install system deps:
   ```bash
   sudo apt-get install -y build-essential pkg-config curl wget file \
     libwebkit2gtk-4.1-dev libsoup-3.0-dev libgtk-3-dev \
     libayatana-appindicator3-dev librsvg2-dev libssl-dev libxdo-dev \
     xpra xvfb
   ```
4. `bun install`

## Daily workflow

### Start full Tauri (with HTML5 window in browser)

```bash
./scripts/tauri-dev-xpra.sh
```

This will:
1. Start Xpra display `:100` with HTML5 client on port **14500**.
2. Run `bun run tauri:dev` with `DISPLAY=:100`.
3. First compile takes ~10–15 min (~600 Rust crates), subsequent
   incremental builds are ~5–30s.

Once you see Vite log + Tauri build complete, open the **Ports** tab in
Codespaces (or VS Code Desktop) and click the forwarded URL for port
**14500**. The browser tab loads Xpra's HTML5 client, which renders
the Tauri window.

### Stop everything

```bash
./scripts/xpra-down.sh
pkill -f "tauri dev"
```

### Frontend-only mode (faster for UI work)

```bash
bun run dev
```

Open the forwarded URL for port **1420**. Tauri APIs (SQLite, PTY,
file dialog) won't work — the app will probably crash unless we add
shims. Tell me if you want this path set up.

## Troubleshooting

- **Xpra fails to start with `XDG_RUNTIME_DIR` error**: the script
  exports `XDG_RUNTIME_DIR=$HOME/.xdg-runtime` automatically. If you
  run xpra commands manually, set this env var first.
- **Window blank / WebKit crashes**: try `WEBKIT_DISABLE_COMPOSITING_MODE=1`
  (already set in script) or `WEBKIT_DISABLE_DMABUF_RENDERER=1`.
- **OOM during compile**: 2-core / 8GB is mepet. Stop other processes,
  or upgrade machine type to 4-core/16GB in Codespaces settings.
- **Port not forwarded**: Codespaces auto-forwards on first `LISTEN`.
  Manually expose via VS Code "Ports" tab if needed.
- **Idle timeout kills xpra**: re-run `./scripts/xpra-up.sh`.

## Logs

- Xpra: `~/.xpra/xpra-100.log`
- Tauri dev: `tauri-dev.log` (project root)
