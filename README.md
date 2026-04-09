# Mezame

> A focused productivity desktop app for macOS — notes, timers, and distraction blocking in one compact window.

![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Version](https://img.shields.io/badge/version-0.1.6-teal)
![License](https://img.shields.io/badge/license-MIT-green)
![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%20v2-blue)

---

## Features

- **Notes** — Full markdown editor with syntax highlighting, open any `.md` file on your filesystem, recent files sidebar
- **Pomodoro** — Work session timer with 4 presets, per-task time tracking, and automatic break transitions
- **Focus Restrictions** — Block distracting websites and apps during work sessions, integrated with the Pomodoro timer
- **Todo** — Lightweight reminder list with active/completed separation and bulk clear
- **Auto-updater** — Checks GitHub Releases on startup and installs updates in one click

---

## Installation

### Download (macOS)

Download the latest `.dmg` from the [Releases page](https://github.com/gabrieldocoutos/mezame/releases/latest), open it, and drag Mezame to your Applications folder.

### Build from source

**Prerequisites:** [Rust](https://rustup.rs), [Node.js](https://nodejs.org), [pnpm](https://pnpm.io)

```bash
git clone https://github.com/gabrieldocoutos/mezame
cd mezame
pnpm install
pnpm tauri build
```

The distributable app will be in `src-tauri/target/release/bundle/`.

---

## Usage

### Notes

A full markdown editor powered by **CodeMirror 6**, designed for plain-text files anywhere on your filesystem.

- **Open a file** — Click "Open" (⌘O) to open any `.md` file via the system file dialog
- **Create a new file** — Click "New" (⌘N) to pick a save location and filename
- **Save** — ⌘S saves the current file; an unsaved-changes indicator (`•`) appears in the toolbar
- **Recent files** — The sidebar tracks up to 20 recently opened files, sorted alphabetically; each entry has a remove button
- **Editor** — Syntax-highlighted markdown (headings, links, code blocks, comments), line numbers, bracket matching, search (⌘F), full undo/redo history, tab indentation

### Pomodoro

A work-session timer with integrated task tracking.

#### Timer Controls

| Element | Description |
|---------|-------------|
| Large countdown | MM:SS display, updates every second |
| Status pill | "Deep Focus Active" / "Ready to Focus" / "Break Time" |
| Round dots | 4 dots show progress through the current Pomodoro cycle |
| Start / Pause | Primary button (Space bar shortcut) |
| Reset | Resets timer to the start of the current mode |
| Skip | Appears during breaks — returns immediately to work mode |

#### Presets

| Preset | Work | Break |
|--------|------|-------|
| Standard | 25 min | 5 min |
| Deep Focus | 50 min | 10 min |
| Long Run | 90 min | 20 min |
| Micro | 15 min | 3 min |

Selecting a preset takes effect immediately (resets the timer to the new duration).

#### Tasks

Each task accumulates time only while the Pomodoro timer is running in work mode and that task is selected as "active".

- **Add** a task by typing in the input and pressing Enter
- **Select** a task by clicking it (click again to deselect)
- **Edit** the title by clicking the pencil icon, then Enter or click away to save
- **Reset time** via the rotate icon — sets that task's total back to zero
- **Delete** via the X icon

Time is displayed as `1h 30m`, `45m 30s`, or `—` (no time yet). A live session counter (`+MM:SS`) shows how much time the active task has accumulated in the current session.

Time is flushed to the database on pause, on task switch, and when a work session completes.

#### Notifications

A sound (`notification.wav`) plays when the timer transitions between work and break modes.

### Focus Restrictions

Blocks distracting websites and macOS apps during work sessions.

#### Domain Blocking

Domains are blocked by adding `0.0.0.0 domain.com` entries to `/etc/hosts`. Because this requires admin access, Mezame will prompt for your macOS password once per session (cached in memory, cleared on app quit).

- Type a domain (e.g. `twitter.com`) and press Enter or click "Add to Blocklist"
- Domains are stored in `{app_data_dir}/domains.txt`
- The actual block entries in `/etc/hosts` are written between `### nelson` / `### nelson end` markers

#### App Blocking

- Select the "App" entry type in the form
- Start typing an app name — an autocomplete dropdown shows installed apps from `/Applications/`
- Selected apps are killed via `pkill -x` every 3 seconds while Focus mode is active
- App list is stored in `{app_data_dir}/blocked_apps.txt`

#### Integration with Pomodoro

Focus mode activates and deactivates automatically alongside the Pomodoro timer:

1. You start the Pomodoro timer in work mode → Focus mode enables automatically
2. The work session ends or you stop the timer → Focus mode disables automatically
3. If you manually disable Focus mode during a session, it won't re-enable automatically until the next session

The Focus toggle in the header is disabled while the Pomodoro timer is running in work mode.

#### Views

The restricted items list can be displayed in **Grid** or **List** view. Only the first 4 items are shown by default; a "Load all" button reveals the rest.

### Todo

A simple two-state reminder list.

- **Add** a reminder by typing and pressing Enter or clicking "ADD"
- **Complete** a reminder by clicking its checkbox — it moves to the Completed section
- **Completed section** is collapsible; a count badge shows how many are completed
- **Delete** individual completed items or use "Clear all" to remove them all at once

---

## Keyboard Shortcuts

### Global

| Keys | Action |
|------|--------|
| ⌘ 1 | Switch to Notes tab |
| ⌘ 2 | Switch to Pomodoro tab |
| ⌘ 3 | Switch to Focus Restrictions tab |
| ⌘ 4 | Switch to Todo tab |
| ? | Toggle keyboard shortcut guide |
| Esc | Close modal or guide |

### Notes

| Keys | Action |
|------|--------|
| ⌘ S | Save current file |
| ⌘ N | Create new file |
| ⌘ O | Open file |
| ⌘ F | Search in editor |
| Tab | Insert spaces in editor |

### Pomodoro

| Keys | Action |
|------|--------|
| Space | Start / pause timer |
| Enter | Add task or confirm task edit |
| Esc | Cancel task edit |

### Focus Restrictions & Todo

| Keys | Action |
|------|--------|
| Enter | Add domain/app or add reminder |

---

## Architecture

Mezame is a **Tauri v2** desktop app with a static SvelteKit frontend and a Rust backend.

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (SvelteKit)               │
│                                                      │
│  src/routes/                                         │
│  ├── +page.svelte              Tab shell, modals     │
│  ├── Notes.svelte              Markdown editor       │
│  ├── Pomodoro.svelte           Timer + tasks         │
│  ├── FocusRestrictions.svelte  Domain/app blocking   │
│  ├── Todo.svelte               Reminders             │
│  └── UpdateChecker.svelte      Auto-updater          │
│                                                      │
│  build/ ──────────────────────────────────────────┐  │
└──────────────────────────────────────────────────┼──┘
                                                   │ frontendDist
┌──────────────────────────────────────────────────▼──┐
│                   Backend (Rust / Tauri)             │
│                                                      │
│  src-tauri/src/lib.rs                                │
│  ├── Tauri commands (#[tauri::command])              │
│  ├── PomodoroState  (Arc<Mutex>)                     │
│  ├── DbShared       (Arc<Mutex<Connection>>)         │
│  ├── Password cache (static Mutex<Option<String>>)   │
│  └── Background tokio task (1s tick loop)            │
└──────────────────────────────────────────────────────┘
```

### Background tick loop

A tokio async task runs every second and:
1. Decrements the timer if running
2. Accumulates elapsed seconds to the active task
3. Transitions work → break (or break → work) when the timer hits zero
4. Updates the macOS system tray title with the current timer
5. Emits a `pomodoro-tick` event to the frontend with the full timer state

### Frontend state

All state is local `$state` variables (Svelte 5 runes). There are no global stores. Data is fetched via `invoke()` and kept in sync through `pomodoro-tick` event listeners.

---

## Data & Storage

| Data | Format | Location |
|------|--------|----------|
| Note files | Plain text | Anywhere on the filesystem (user-chosen) |
| Recent files list | JSON array | `{app_data_dir}/recent_files.json` |
| Tasks | SQLite | `{app_data_dir}/tasks.db` — table `tasks` |
| Reminders | SQLite | `{app_data_dir}/tasks.db` — table `reminders` |
| Blocked domains list | Plain text | `{app_data_dir}/domains.txt` |
| Blocked apps list | Plain text | `{app_data_dir}/blocked_apps.txt` |
| Active domain blocks | System hosts file | `/etc/hosts` (requires admin) |
| Pomodoro timer state | In-memory | Resets on app quit |
| Admin password | In-memory | Session-only, never written to disk |

SQLite uses WAL journal mode. The database is created automatically on first launch.

---

## Development

```bash
pnpm tauri dev     # Start full app with hot-reload (Rust + Svelte)
pnpm dev           # Start frontend only (no Tauri shell)
pnpm check         # Run svelte-check + TypeScript validation
pnpm check:watch   # Watch mode type checking
pnpm tauri build   # Build distributable
```

No test runner is configured yet.

### Adding a Tauri command

1. Add a `#[tauri::command]` function in `src-tauri/src/lib.rs`
2. Register it in `tauri::generate_handler![...]` inside `run()`
3. Call it from Svelte via `invoke('command_name', { arg: value })`

### Adding a tab

1. Create `src/routes/NewFeature.svelte`
2. Add the tab name to the `activeTab` type in `+page.svelte`
3. Add a tab button and conditional render in `+page.svelte`
4. Add a `⌘N` keyboard shortcut in the `+page.svelte` keydown handler
5. Add a shortcut entry in `src/lib/shortcuts.ts`

---

## Platform Notes

- **Website blocking is macOS-only.** It uses `osascript` to run `sed` with admin privileges to modify `/etc/hosts`. The required password is cached in memory for the session so you only enter it once.
- **App blocking is macOS-only.** Apps are killed via `pkill -x` using the exact app name. Only apps installed in `/Applications/` are listed in the autocomplete.
- **Tray icon** shows the current timer countdown and provides a Quit menu item.
- **Window close** (⌘W or the red dot) shows a confirmation dialog before quitting.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 |
| Frontend framework | SvelteKit 2 + Svelte 5 |
| Language (frontend) | TypeScript 5.6 |
| Language (backend) | Rust (edition 2021) |
| Build tool | Vite 8 |
| Code editor | CodeMirror 6 |
| Icons | Lucide Svelte |
| Database | SQLite via rusqlite 0.32 (bundled) |
| Async runtime | tokio 1 |
| Serialization | serde + serde_json |

---

## License

MIT © Gabriel D. Couto
