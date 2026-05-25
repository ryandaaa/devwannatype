use std::process::Command;

/// Ambil branch git aktif dari `cwd`. Empty string jika tidak ada git repo.
#[tauri::command]
pub fn git_current_branch(cwd: Option<String>) -> String {
    let cwd = cwd
        .or_else(|| std::env::current_dir().ok().map(|p| p.to_string_lossy().to_string()))
        .unwrap_or_default();
    if cwd.is_empty() {
        return String::new();
    }
    let out = Command::new("git")
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .current_dir(&cwd)
        .output();
    match out {
        Ok(o) if o.status.success() => {
            String::from_utf8_lossy(&o.stdout).trim().to_string()
        }
        _ => String::new(),
    }
}
