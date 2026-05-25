use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;

use once_cell::sync::Lazy;
use parking_lot::Mutex;
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

/// One PTY session: master writer + child handle (untuk explicit kill on drop).
struct Session {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    child: Arc<Mutex<Option<Box<dyn Child + Send + Sync>>>>,
    _reader_thread: std::thread::JoinHandle<()>,
}

impl Drop for Session {
    fn drop(&mut self) {
        // Pastikan child terminated saat session di-drop (app close / pty_kill).
        if let Some(mut child) = self.child.lock().take() {
            let _ = child.kill();
        }
    }
}

static SESSIONS: Lazy<Mutex<HashMap<String, Arc<Mutex<Session>>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Serialize, Clone)]
pub struct PtyDataEvent {
    pub id: String,
    pub data: String,
}

fn default_shell() -> (String, Vec<String>) {
    if cfg!(target_os = "windows") {
        if std::env::var("PSModulePath").is_ok() {
            return ("powershell.exe".to_string(), vec!["-NoLogo".to_string()]);
        }
        ("cmd.exe".to_string(), vec![])
    } else if cfg!(target_os = "macos") {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        (shell, vec!["-l".to_string()])
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        (shell, vec!["-l".to_string()])
    }
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    id: String,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    pty_kill_internal(&id);

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("openpty failed: {e}"))?;

    let (program, args) = default_shell();
    let mut cmd = CommandBuilder::new(program);
    for a in args {
        cmd.arg(a);
    }
    if let Some(cwd) = cwd {
        if !cwd.is_empty() {
            cmd.cwd(cwd);
        }
    } else if let Some(home) = dirs_home() {
        cmd.cwd(home);
    }
    cmd.env("TERM", "xterm-256color");

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("spawn failed: {e}"))?;
    let child_arc: Arc<Mutex<Option<Box<dyn Child + Send + Sync>>>> =
        Arc::new(Mutex::new(Some(child)));

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("clone reader failed: {e}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("take writer failed: {e}"))?;

    let app_clone = app.clone();
    let id_clone = id.clone();
    let child_for_thread = Arc::clone(&child_arc);
    let reader_thread = std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    let event = PtyDataEvent {
                        id: id_clone.clone(),
                        data: chunk,
                    };
                    let _ = app_clone.emit(&format!("pty://data/{}", id_clone), event);
                }
                Err(_) => break,
            }
        }
        let _ = app_clone.emit(
            &format!("pty://exit/{}", id_clone),
            PtyDataEvent {
                id: id_clone.clone(),
                data: String::new(),
            },
        );
        // Wait child supaya tidak zombie
        if let Some(mut child) = child_for_thread.lock().take() {
            let _ = child.wait();
        }
    });

    let session = Session {
        writer,
        master: pair.master,
        child: child_arc,
        _reader_thread: reader_thread,
    };
    SESSIONS.lock().insert(id, Arc::new(Mutex::new(session)));

    Ok(())
}

#[tauri::command]
pub fn pty_write(id: String, data: String) -> Result<(), String> {
    let map = SESSIONS.lock();
    let sess = map.get(&id).ok_or_else(|| "pty not found".to_string())?;
    let mut sess = sess.lock();
    sess.writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("write failed: {e}"))?;
    sess.writer.flush().map_err(|e| format!("flush failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn pty_resize(id: String, cols: u16, rows: u16) -> Result<(), String> {
    let map = SESSIONS.lock();
    let sess = map.get(&id).ok_or_else(|| "pty not found".to_string())?;
    let sess = sess.lock();
    sess.master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("resize failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn pty_kill(id: String) -> Result<(), String> {
    pty_kill_internal(&id);
    Ok(())
}

pub fn kill_all_sessions() {
    let mut map = SESSIONS.lock();
    map.clear();
}

fn pty_kill_internal(id: &str) {
    let mut map = SESSIONS.lock();
    map.remove(id);
}

fn dirs_home() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").ok()
    }
}
