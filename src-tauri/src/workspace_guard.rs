use crate::{
    error::{AppError, Result},
    state::{AppState, Workspace},
};
use path_clean::PathClean;
use std::path::{Path, PathBuf};

fn nearest_existing_path(path: &Path) -> Result<PathBuf> {
    let mut candidate = path.to_path_buf();
    loop {
        if candidate.exists() {
            return Ok(candidate);
        }
        if !candidate.pop() {
            return Err(AppError::OutsideWorkspace);
        }
    }
}

pub fn current_workspace(state: &AppState) -> Result<Workspace> {
    state
        .workspace
        .read()
        .map_err(|_| AppError::Io("workspace lock poisoned".into()))?
        .clone()
        .ok_or(AppError::NoWorkspace)
}

pub fn resolve_workspace_path(state: &AppState, input: impl AsRef<Path>) -> Result<PathBuf> {
    let workspace = current_workspace(state)?;
    resolve_with_workspace(&workspace, input)
}

pub fn resolve_with_workspace(workspace: &Workspace, input: impl AsRef<Path>) -> Result<PathBuf> {
    let input = input.as_ref();
    let target = if input.is_absolute() {
        input.to_path_buf().clean()
    } else {
        workspace.configured_root.join(input).clean()
    };

    let configured_root = workspace.configured_root.clean();
    if !target.starts_with(&configured_root) {
        return Err(AppError::OutsideWorkspace);
    }

    let existing = nearest_existing_path(&target)?;
    let real_existing = existing.canonicalize()?;
    if !real_existing.starts_with(&workspace.canonical_root) {
        return Err(AppError::OutsideWorkspace);
    }

    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn fixture() -> (PathBuf, Workspace) {
        let root = std::env::temp_dir().join(format!("md-manage-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(root.join("docs")).unwrap();
        let workspace = Workspace {
            configured_root: root.clone(),
            canonical_root: root.canonicalize().unwrap(),
        };
        (root, workspace)
    }

    #[test]
    fn accepts_paths_inside_workspace() {
        let (root, workspace) = fixture();
        let result = resolve_with_workspace(&workspace, root.join("docs/new.md")).unwrap();
        assert_eq!(result, root.join("docs/new.md"));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_parent_escape() {
        let (root, workspace) = fixture();
        let result = resolve_with_workspace(&workspace, root.join("../outside.md"));
        assert!(matches!(result, Err(AppError::OutsideWorkspace)));
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlink_escape() {
        use std::os::unix::fs::symlink;
        let (root, workspace) = fixture();
        let outside = std::env::temp_dir().join(format!("outside-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&outside).unwrap();
        symlink(&outside, root.join("linked")).unwrap();
        let result = resolve_with_workspace(&workspace, root.join("linked/file.md"));
        assert!(matches!(result, Err(AppError::OutsideWorkspace)));
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(outside).unwrap();
    }
}
