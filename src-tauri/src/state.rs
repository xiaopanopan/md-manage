use notify::RecommendedWatcher;
use std::{
    path::PathBuf,
    sync::{Mutex, RwLock},
};

#[derive(Clone, Debug)]
pub struct Workspace {
    pub configured_root: PathBuf,
    pub canonical_root: PathBuf,
}

#[derive(Default)]
pub struct AppState {
    pub workspace: RwLock<Option<Workspace>>,
    pub watcher: Mutex<Option<RecommendedWatcher>>,
}
