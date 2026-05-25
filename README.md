<div align="center">

# devwannatype

**a quiet, fast, local-first notes workspace for developers**

[![Version](https://img.shields.io/badge/version-1.0.0-white?style=flat-square&labelColor=141312)](#)
[![License](https://img.shields.io/badge/license-MIT-white?style=flat-square&labelColor=141312)](LICENSE)
[![Tauri](https://img.shields.io/badge/tauri-v2-white?style=flat-square&labelColor=141312)](https://tauri.app)
[![Built with](https://img.shields.io/badge/built%20with-bun-white?style=flat-square&labelColor=141312)](https://bun.sh)

no account · no cloud · no AI assistant · just write

</div>

---

## what it is

devwannatype is a desktop notes app for developers who want to **write, store, search, and export technical notes, code snippets, shell commands, markdown drafts, and small project references** — all locally, in a single SQLite file.

it is **not** a Notion clone. it is **not** an IDE. it is **not** a SaaS. it is **not** a terminal cosplay.

it is a small, monospace, dark-by-default workspace that opens in a second and stays out of your way.

## features

### writing
- **CodeMirror 6** editor with syntax highlighting for 12+ languages (JS/TS/JSX/TSX, Python, Rust, Go, SQL, JSON, HTML, CSS, YAML, Bash)
- **markdown** with split preview, GFM tables, task lists, and code fence highlighting
- **markdown formatting toolbar** with icons (bold, italic, underline, strikethrough, headings, lists, blockquote, code, link, hr) — works on selection or at cursor
- **Word-style keyboard shortcuts** — Ctrl+B/I/U/K/1–6/Shift+L/O/.
- **autosave** every 400ms (configurable), instant `Ctrl+S` flush from anywhere
- **find in note** via `Ctrl+F`
- **`[[wiki link]]`** to other notes, with **backlinks** panel
- **interactive checkboxes** in preview — toggle source from rendered view
- **outline panel** (table of contents) for markdown ≥ 2 headings, click to scroll
- **language auto-detect** for snippets via shebang and signature heuristics

### organize
- **5 views**: Notes (Inbox), Pinned, Snippets, Archive, Trash
- **3 note types**: markdown, snippet (with language), command (shell recipes)
- **tags** — cross-note, inline editor, click chip in list to filter
- **bulk select** — `Ctrl+Click` toggle, `Shift+Click` range, then archive / trash / pin in one DB call
- **soft delete** — trash with restore + permanent delete (with confirmation)
- **search** — substring on title and tags from middle column
- **`Ctrl+K` command palette** — fuzzy search notes + run commands

### file workflow
- **drag & drop** `.md` / `.txt` files anywhere into the window
- **`Ctrl+O`** open file dialog
- **double-click `.md` / `.txt`** in File Explorer → opens in devwannatype (file association)
- **export per-note** with extension matching type or snippet language
- **export entire workspace** to a folder (Settings → Storage)
- **paste image** (`Ctrl+V`) saves to vault and inserts markdown link

### terminal
- **real local PTY** (`portable-pty`) at the bottom, default shell per OS (PowerShell / zsh / bash)
- **git branch chip** that auto-refreshes
- **run code blocks** — `▷` button on bash/sh code in preview pipes content to terminal
- **auto-respawn** when shell exits

### app
- **6 themes**: dark, light, pink, rose-pine, solarized-light, nord (Settings → Appearance)
- **rounded window** with flat custom chrome — no native title bar, hamburger toggle in TopAppBar
- **window state persist** — size + position remembered across launches
- **zen mode** (`F11`) — editor only
- **single-instance** — open new file → routes to existing window
- **toast notifications** for export, import, errors
- **cheatsheet** (`?`) — all shortcuts in one modal
- **workspace stats** in Settings — total / per-type / per-language / activity

## screenshots

## Theme

<table>
  <tr>
    <td align="center" width="50%">
      <b>dark</b><br><br>
      <img src="https://github.com/user-attachments/assets/3a201fc6-83f8-40c3-9ccf-5bfc6e08af8c" width="100%" />
    </td>
    <td align="center" width="50%">
      <b>light</b><br><br>
      <img src="https://github.com/user-attachments/assets/fb1528b5-e6c6-4543-80ec-b5803f88cede" width="100%" />
    </td>
  </tr>

  <tr>
    <td align="center" width="50%">
      <b>pink</b><br><br>
      <img src="https://github.com/user-attachments/assets/9e2faa8c-4e3e-429f-9129-1adb45db23fc" width="100%" />
    </td>
    <td align="center" width="50%">
      <b>rose-pine</b><br><br>
      <img src="https://github.com/user-attachments/assets/6481e930-a106-43d6-8955-afcf87c4d6d8" width="100%" />
    </td>
  </tr>

  <tr>
    <td align="center" width="50%">
      <b>solarized</b><br><br>
      <img src="https://github.com/user-attachments/assets/486db473-3fd8-427f-b9f9-fa448b3d796d" width="100%" />
    </td>
    <td align="center" width="50%">
      <b>nord</b><br><br>
      <img src="https://github.com/user-attachments/assets/491329d8-a56a-4701-a7bc-b5310f87ad73" width="100%" />
    </td>
  </tr>
</table>
## install

### download a release
go to **[Releases](https://github.com/ryandaaa/devwannatype/releases)** and grab the right artefact for your OS:

- **Windows** — `devwannatype_1.0.0_x64-setup.exe` (recommended, ~3 MB) or `devwannatype_1.0.0_x64_en-US.msi`
- **macOS / Linux** — coming via CI matrix build (see [building from source](#build-from-source))

double-click the installer, follow the wizard. file association for `.md`, `.markdown`, `.txt` will be registered automatically.

### Windows SmartScreen warning

the installer is **not code-signed** (signing certs are paid; this is a personal open-source project). Windows will show **"Windows protected your PC"** on first run. it is **not** a virus warning — it just means the publisher is unverified.

to bypass safely:

1. browser flags download → click the arrow → **Keep**
2. blue prompt **"Windows protected your PC"** appears → click **More info** → **Run anyway**
3. continue with the install wizard

verify the binary against published SHA256 in the [release notes](https://github.com/ryandaaa/devwannatype/releases/latest):

```powershell
# Windows PowerShell
Get-FileHash devwannatype_1.0.0_x64-setup.exe -Algorithm SHA256
```

```bash
# macOS / Linux
shasum -a 256 devwannatype_1.0.0_x64-setup.exe
```

compare against the hash on the Releases page. if they match, the file is intact.

### keyboard shortcuts at a glance
| shortcut | action |
| --- | --- |
| `Ctrl+N` | new note |
| `Ctrl+O` | open file… |
| `Ctrl+W` | close note |
| `Ctrl+S` | flush save |
| `Ctrl+Z` / `Ctrl+Y` | undo / redo |
| `Ctrl+F` | find in note |
| `Ctrl+K` | command palette / link in editor |
| `Ctrl+B` | sidebar / **bold** in editor |
| `Ctrl+I` | italic |
| `Ctrl+U` | underline |
| `Ctrl+1`…`Ctrl+6` | heading level |
| `Ctrl+J` | toggle terminal |
| `Ctrl+\` | toggle markdown preview |
| `F11` | zen mode |
| `?` | cheatsheet |

## build from source

### prereq

- **Rust** (stable, 1.77+) — install via [rustup](https://rustup.rs)
- **Visual Studio Build Tools 2022** with `MSVC v143` + Windows 11 SDK (Windows only)
- **Bun** ≥ 1.3 — install via [bun.sh](https://bun.sh)
- **Git**

### clone & run

```bash
git clone https://github.com/ryandaaa/devwannatype
cd devwannatype
bun install
bun run tauri:dev
```

first build downloads ~ 600 Rust crates and compiles them — takes 5–10 minutes. subsequent runs are fast.

### produce installer

```bash
bun run tauri:build
```

artefacts land in `src-tauri/target/release/bundle/`:
- `msi/devwannatype_1.0.0_x64_en-US.msi` (Windows MSI)
- `nsis/devwannatype_1.0.0_x64-setup.exe` (Windows NSIS)
- `dmg/...` (macOS)
- `deb/...` `appimage/...` `rpm/...` (Linux)

> cross-platform note: each platform must build on its own host. for cross-OS releases, set up GitHub Actions matrix on `windows-latest`, `ubuntu-latest`, `macos-latest`.

## stack

| layer | tech |
| --- | --- |
| shell | [Tauri 2](https://tauri.app) — Rust + WebView |
| frontend | React 19 + TypeScript 5 + Vite 8 |
| styling | Tailwind 3 with CSS variables (theme system) |
| editor | [CodeMirror 6](https://codemirror.net) (markdown, lang packs, search, history, autocomplete) |
| markdown render | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| state | [Zustand](https://github.com/pmndrs/zustand) for UI + [TanStack Query](https://tanstack.com/query) for DB cache |
| storage | SQLite via [`tauri-plugin-sql`](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/sql) |
| terminal | [`portable-pty`](https://crates.io/crates/portable-pty) (Rust) + [xterm.js](https://xtermjs.org) (frontend) |
| fonts | [Geist Mono](https://vercel.com/font), [Material Symbols Outlined](https://fonts.google.com/icons) |
| package | bun (replaces Node + npm) |

## project structure

```
devwannatype/
├── src/                              # React + TS frontend
│   ├── app/                          # bootstrap, providers, root layout
│   ├── db/                           # SQLite singleton + schema types
│   ├── components/                   # Icon, Overlay, ContextMenu, ToastViewport, ConfirmDialog, ErrorBoundary
│   ├── features/
│   │   ├── editor/                   # CodeMirror, format bar, markdown actions, save bus
│   │   ├── importexport/             # drag-drop, paste, file import/export
│   │   ├── layout/                   # TopAppBar, ResizeHandle, WindowControls, layout store
│   │   ├── nav/                      # SideNavBar
│   │   ├── notes/                    # NoteList, hooks, useCreateAndSelectNote, useRecentNotes
│   │   ├── palette/                  # CommandPalette, Cheatsheet
│   │   ├── preview/                  # MarkdownPreview, OutlinePanel
│   │   ├── seed/                     # welcome note
│   │   ├── settings/                 # SettingsModal, theme/autosave settings, stats
│   │   ├── shortcuts/                # global keymap
│   │   ├── tags/                     # TagEditor
│   │   └── terminal/                 # xterm.js + PTY bridge, terminal store
│   ├── lib/                          # id, date, debounce
│   └── styles/                       # global CSS + theme tokens
└── src-tauri/
    ├── src/
    │   ├── lib.rs                    # tauri::Builder, plugin registration, single-instance
    │   ├── pty.rs                    # portable-pty wrapper, lifecycle
    │   └── git.rs                    # git_current_branch helper
    ├── migrations/0001_init.sql      # SQLite schema
    ├── capabilities/default.json     # Tauri 2 capabilities
    ├── icons/                        # app icons + source.png
    ├── Cargo.toml
    └── tauri.conf.json               # window, file associations, NSIS/WiX config
```

## data location

devwannatype stores everything in a single SQLite file at:

| OS | path |
| --- | --- |
| Windows | `%APPDATA%\dev.wannatype.app\devwannatype.db` |
| macOS | `~/Library/Application Support/dev.wannatype.app/devwannatype.db` |
| Linux | `~/.local/share/dev.wannatype.app/devwannatype.db` |

backup = copy this file. migrate = move this file. nothing else.

pasted images live in the `images/` subfolder of the same directory.

## roadmap

next stuff that would be nice (not committed):

- [ ] note templates (bash script, python script, TODO, incident report)
- [ ] tag autocomplete in tag editor
- [ ] note history / version snapshots with diff & restore
- [ ] note duplicate (`Ctrl+D`)
- [ ] vim mode (toggle in settings)
- [ ] global hotkey for quick capture
- [ ] system tray
- [ ] markdown frontmatter on export & import
- [ ] linux + macos release artefacts via CI
- [ ] subset Material Symbols font (currently 485 KB)

PRs welcome for any of these. open an issue first to align on scope.

## contributing

- this is a small project. open an issue, discuss, then PR.
- code style: TypeScript strict, no `any`, prefer pure functions, hooks discipline
- run `bun run build` (does `tsc --noEmit` + Vite build) before pushing
- visual style: stay flat, monospace, no shadow / no gradient / no glassmorphism. if your idea conflicts with the existing aesthetic, that's fine — discuss in an issue.

## acknowledgements

built with the open source stack listed above. design language inspired by Material 3 dark surfaces, Bear, Linear, and the desire for a calmer dev environment.

## license

MIT — see [LICENSE](LICENSE).

---

<div align="center">
made by <a href="https://github.com/ryandaaa">ryandaaa</a>
</div>
