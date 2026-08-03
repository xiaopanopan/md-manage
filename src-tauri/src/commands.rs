use crate::{
    error::{AppError, Result},
    state::{AppState, Workspace},
    workspace_guard::{current_workspace, resolve_workspace_path},
};
use chrono::{DateTime, Utc};
use notify::{RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    name: String,
    path: String,
    parent_path: String,
    #[serde(rename = "type")]
    node_type: String,
    children: Option<Vec<FileNode>>,
    modified_at: String,
    size: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileChangeEvent {
    pub kind: String,
    pub path: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppConfig {
    workspace: Option<String>,
    #[serde(default)]
    values: Map<String, Value>,
}

fn config_path(app: &AppHandle) -> Result<PathBuf> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|err| AppError::Io(err.to_string()))?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("config.json"))
}

fn load_config(app: &AppHandle) -> Result<AppConfig> {
    let path = config_path(app)?;
    let source = if path.exists() {
        path
    } else {
        // Electron used `<platform config>/md-manage/config.json`. Keep the old
        // file untouched so users can roll back after the one-time import.
        let legacy = path
            .parent()
            .and_then(Path::parent)
            .map(|parent| parent.join("md-manage/config.json"));
        match legacy {
            Some(legacy) if legacy.exists() => legacy,
            _ => return Ok(AppConfig::default()),
        }
    };
    let raw = fs::read_to_string(source)?;
    serde_json::from_str(&raw).map_err(|err| AppError::Io(err.to_string()))
}

fn save_config(app: &AppHandle, config: &AppConfig) -> Result<()> {
    let path = config_path(app)?;
    let data = serde_json::to_vec_pretty(config).map_err(|err| AppError::Io(err.to_string()))?;
    fs::write(path, data)?;
    Ok(())
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| MARKDOWN_EXTENSIONS.contains(&value.to_ascii_lowercase().as_str()))
}

fn validate_name(name: &str) -> Result<()> {
    let lower = name.to_ascii_lowercase();
    let stem = lower.split('.').next().unwrap_or_default();
    let reserved = matches!(stem, "con" | "prn" | "aux" | "nul")
        || (stem.len() == 4
            && (stem.starts_with("com") || stem.starts_with("lpt"))
            && stem.as_bytes()[3].is_ascii_digit()
            && stem.as_bytes()[3] != b'0');
    if name.is_empty()
        || matches!(name, "." | "..")
        || name.contains(['/', '\\', '\0'])
        || name.ends_with(['.', ' '])
        || reserved
    {
        return Err(AppError::InvalidName);
    }
    Ok(())
}

fn assert_available(path: &Path) -> Result<()> {
    if path.exists() {
        Err(AppError::AlreadyExists(path.display().to_string()))
    } else {
        Ok(())
    }
}

fn modified_at(metadata: &fs::Metadata) -> String {
    metadata
        .modified()
        .map(DateTime::<Utc>::from)
        .map(|value| value.to_rfc3339())
        .unwrap_or_else(|_| Utc::now().to_rfc3339())
}

fn list_dir(dir: &Path, depth: usize) -> Result<Vec<FileNode>> {
    if depth > 10 {
        return Ok(Vec::new());
    }
    let mut nodes = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path)?;
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_dir() {
            nodes.push(FileNode {
                name,
                path: path.to_string_lossy().to_string(),
                parent_path: dir.to_string_lossy().to_string(),
                node_type: "folder".into(),
                children: Some(list_dir(&path, depth + 1)?),
                modified_at: modified_at(&metadata),
                size: None,
            });
        } else if metadata.is_file() && is_markdown(&path) {
            nodes.push(FileNode {
                name,
                path: path.to_string_lossy().to_string(),
                parent_path: dir.to_string_lossy().to_string(),
                node_type: "file".into(),
                children: None,
                modified_at: modified_at(&metadata),
                size: Some(metadata.len()),
            });
        }
    }
    // Keep filesystem responses deterministic. User-facing natural sorting is
    // applied in the renderer so presentation preferences stay out of Rust.
    nodes.sort_by(|a, b| {
        let a_rank = if a.node_type == "folder" { 0 } else { 1 };
        let b_rank = if b.node_type == "folder" { 0 } else { 1 };
        a_rank
            .cmp(&b_rank)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
            .then_with(|| a.name.cmp(&b.name))
    });
    Ok(nodes)
}

fn start_watcher(app: &AppHandle, state: &AppState, root: &Path) -> Result<()> {
    let handle = app.clone();
    let mut watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        let Ok(event) = event else { return };
        for path in event.paths {
            let relevant = path.is_dir() || is_markdown(&path);
            if !relevant {
                continue;
            }
            let _ = handle.emit(
                "workspace:file-changed",
                FileChangeEvent {
                    kind: format!("{:?}", event.kind),
                    path: path.to_string_lossy().to_string(),
                },
            );
        }
    })
    .map_err(|err| AppError::Io(err.to_string()))?;
    watcher
        .watch(root, RecursiveMode::Recursive)
        .map_err(|err| AppError::Io(err.to_string()))?;
    *state
        .watcher
        .lock()
        .map_err(|_| AppError::Io("watcher lock poisoned".into()))? = Some(watcher);
    Ok(())
}

pub fn register_workspace(app: &AppHandle, state: &AppState, root: PathBuf) -> Result<String> {
    if !root.is_dir() {
        return Err(AppError::OutsideWorkspace);
    }
    let canonical_root = root.canonicalize()?;
    fs::create_dir_all(root.join(".md-manage/images"))?;
    *state
        .workspace
        .write()
        .map_err(|_| AppError::Io("workspace lock poisoned".into()))? = Some(Workspace {
        configured_root: root.clone(),
        canonical_root,
    });
    start_watcher(app, state, &root)?;
    let mut config = load_config(app)?;
    config.workspace = Some(root.to_string_lossy().to_string());
    save_config(app, &config)?;
    Ok(root.to_string_lossy().to_string())
}

pub fn restore_workspace(app: &AppHandle, state: &AppState) -> Result<Option<String>> {
    let config = load_config(app)?;
    match config.workspace {
        Some(path) if Path::new(&path).is_dir() => {
            register_workspace(app, state, path.into()).map(Some)
        }
        _ => Ok(None),
    }
}

#[tauri::command]
pub fn set_workspace(app: AppHandle, state: State<'_, AppState>, path: String) -> Result<String> {
    register_workspace(&app, &state, PathBuf::from(path))
}

#[tauri::command]
pub fn get_workspace(state: State<'_, AppState>) -> Result<Option<String>> {
    let guard = state
        .workspace
        .read()
        .map_err(|_| AppError::Io("workspace lock poisoned".into()))?;
    Ok(guard
        .as_ref()
        .map(|workspace| workspace.configured_root.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn list_entries(state: State<'_, AppState>, path: String) -> Result<Vec<FileNode>> {
    let path = resolve_workspace_path(&state, path)?;
    list_dir(&path, 0)
}

#[tauri::command]
pub fn read_document(state: State<'_, AppState>, path: String) -> Result<String> {
    let path = resolve_workspace_path(&state, path)?;
    Ok(fs::read_to_string(path)?)
}

#[tauri::command]
pub fn write_document(state: State<'_, AppState>, path: String, content: String) -> Result<()> {
    let path = resolve_workspace_path(&state, path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, content)?;
    Ok(())
}

#[tauri::command]
pub fn create_document(state: State<'_, AppState>, dir: String, name: String) -> Result<String> {
    validate_name(&name)?;
    let dir = resolve_workspace_path(&state, dir)?;
    let final_name = if is_markdown(Path::new(&name)) {
        name
    } else {
        format!("{name}.md")
    };
    let path = resolve_workspace_path(&state, dir.join(final_name))?;
    assert_available(&path)?;
    fs::write(&path, [])?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_folder(state: State<'_, AppState>, dir: String, name: String) -> Result<String> {
    validate_name(&name)?;
    let dir = resolve_workspace_path(&state, dir)?;
    let path = resolve_workspace_path(&state, dir.join(name))?;
    assert_available(&path)?;
    fs::create_dir(&path)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn rename_entry(state: State<'_, AppState>, path: String, new_name: String) -> Result<String> {
    validate_name(&new_name)?;
    let source = resolve_workspace_path(&state, path)?;
    let target = resolve_workspace_path(
        &state,
        source
            .parent()
            .ok_or(AppError::OutsideWorkspace)?
            .join(new_name),
    )?;
    assert_available(&target)?;
    fs::rename(source, &target)?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn move_entry(state: State<'_, AppState>, path: String, destination: String) -> Result<String> {
    let source = resolve_workspace_path(&state, path)?;
    let destination = resolve_workspace_path(&state, destination)?;
    if destination.starts_with(&source) {
        return Err(AppError::InvalidMove);
    }
    let target = resolve_workspace_path(
        &state,
        destination.join(source.file_name().ok_or(AppError::InvalidMove)?),
    )?;
    if source == target {
        return Ok(target.to_string_lossy().to_string());
    }
    assert_available(&target)?;
    fs::rename(source, &target)?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn trash_entry(state: State<'_, AppState>, path: String) -> Result<()> {
    let path = resolve_workspace_path(&state, path)?;
    trash::delete(path).map_err(|err| AppError::Io(err.to_string()))
}

#[tauri::command]
pub fn save_image(state: State<'_, AppState>, bytes: Vec<u8>, extension: String) -> Result<String> {
    let extension = extension.trim_start_matches('.').to_ascii_lowercase();
    if !matches!(
        extension.as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "apng"
    ) {
        return Err(AppError::InvalidImageExtension);
    }
    let workspace = current_workspace(&state)?;
    let relative = format!(".md-manage/images/{}.{extension}", Uuid::new_v4());
    let path = resolve_workspace_path(&state, workspace.configured_root.join(&relative))?;
    fs::write(path, bytes)?;
    Ok(relative)
}

fn conflict_free_path(path: PathBuf) -> Result<PathBuf> {
    if !path.exists() {
        return Ok(path);
    }
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("document");
    for index in 1..1000 {
        let name = if extension.is_empty() {
            format!("{stem}_{index}")
        } else {
            format!("{stem}_{index}.{extension}")
        };
        let candidate = path.with_file_name(name);
        if !candidate.exists() {
            return Ok(candidate);
        }
    }
    Err(AppError::Io("too many duplicate files".into()))
}

fn import_source(source: &Path, destination: &Path, imported: &mut Vec<String>) -> Result<()> {
    if source.is_dir() {
        let folder = destination.join(source.file_name().ok_or(AppError::InvalidName)?);
        for entry in fs::read_dir(source)? {
            let entry = entry?;
            if entry.file_name().to_string_lossy().starts_with('.') {
                continue;
            }
            import_source(&entry.path(), &folder, imported)?;
        }
    } else if source.is_file() && is_markdown(source) {
        fs::create_dir_all(destination)?;
        let target =
            conflict_free_path(destination.join(source.file_name().ok_or(AppError::InvalidName)?))?;
        fs::copy(source, &target)?;
        imported.push(target.to_string_lossy().to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn import_paths(
    state: State<'_, AppState>,
    source_paths: Vec<String>,
    destination: String,
) -> Result<Vec<String>> {
    let destination = resolve_workspace_path(&state, destination)?;
    let mut imported = Vec::new();
    for source in source_paths {
        import_source(Path::new(&source), &destination, &mut imported)?;
    }
    Ok(imported)
}

#[tauri::command]
pub fn write_export(path: String, content: String) -> Result<()> {
    let path = PathBuf::from(path);
    if !path.is_absolute() || path.file_name().is_none() {
        return Err(AppError::InvalidExportPath);
    }
    fs::write(path, content)?;
    Ok(())
}

#[tauri::command]
pub fn get_config(app: AppHandle, key: Option<String>) -> Result<Value> {
    let config = load_config(&app)?;
    Ok(match key {
        Some(key) => config.values.get(&key).cloned().unwrap_or(Value::Null),
        None => Value::Object(config.values),
    })
}

#[tauri::command]
pub fn set_config(app: AppHandle, key: String, value: Value) -> Result<()> {
    let mut config = load_config(&app)?;
    config.values.insert(key, value);
    save_config(&app, &config)
}
