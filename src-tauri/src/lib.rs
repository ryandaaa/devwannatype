mod git;
mod pty;

use std::sync::Mutex;

use tauri::{Emitter, Manager, State};
use tauri_plugin_sql::{Migration, MigrationKind};

/// Antrian path file yang menunggu di-import (dari argv saat first launch
/// atau saat single-instance trigger oleh second invocation via file assoc).
struct PendingFiles(Mutex<Vec<String>>);

#[tauri::command]
fn take_pending_files(state: State<'_, PendingFiles>) -> Vec<String> {
    let mut v = state.0.lock().unwrap();
    let out = v.clone();
    v.clear();
    out
}

fn collect_file_args(args: &[String]) -> Vec<String> {
    args.iter()
        .skip(1) // skip exe path
        .filter(|a| !a.starts_with('-')) // skip flags
        .filter(|a| {
            // hanya file yang bisa di-import
            let lower = a.to_ascii_lowercase();
            lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".txt")
        })
        .cloned()
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_args: Vec<String> = std::env::args().collect();
    let initial_files = collect_file_args(&initial_args);

    let migrations = vec![Migration {
        version: 1,
        description: "create initial schema",
        sql: include_str!("../migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }];

    let mut builder = tauri::Builder::default()
        .manage(PendingFiles(Mutex::new(initial_files)))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:devwannatype.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_kill,
            git::git_current_branch,
            take_pending_files,
        ]);

    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let new_files = collect_file_args(&args);
            if !new_files.is_empty() {
                if let Some(state) = app.try_state::<PendingFiles>() {
                    let mut v = state.0.lock().unwrap();
                    for p in new_files {
                        if !v.contains(&p) {
                            v.push(p);
                        }
                    }
                }
                let _ = app.emit("dwt://pending-files-changed", ());
            }
            // Restore window
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }));
    }

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                pty::kill_all_sessions();
            }
        });
}
