mod commands;
mod error;
mod state;
mod workspace_guard;

use commands::*;
use percent_encoding::percent_decode_str;
use state::AppState;
use std::{fs, path::PathBuf};
use tauri::{http::Response, Manager};
use workspace_guard::resolve_workspace_path;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .register_uri_scheme_protocol("md-manage-resource", |context, request| {
            let state = context.app_handle().state::<AppState>();
            let encoded = request.uri().path().trim_start_matches('/');
            let decoded = percent_decode_str(encoded).decode_utf8_lossy();
            let result =
                resolve_workspace_path(&state, PathBuf::from(decoded.as_ref())).and_then(|path| {
                    let metadata = fs::metadata(&path)?;
                    if !metadata.is_file() {
                        return Err(error::AppError::OutsideWorkspace);
                    }
                    let mime = mime_guess::from_path(&path).first_or_octet_stream();
                    if !mime.type_().as_str().eq_ignore_ascii_case("image") {
                        return Err(error::AppError::OutsideWorkspace);
                    }
                    Ok((fs::read(path)?, mime.to_string()))
                });

            match result {
                Ok((body, mime)) => Response::builder()
                    .status(200)
                    .header("Content-Type", mime)
                    .header("Cache-Control", "no-store")
                    .body(body)
                    .unwrap(),
                Err(_) => Response::builder().status(404).body(Vec::new()).unwrap(),
            }
        })
        .invoke_handler(tauri::generate_handler![
            set_workspace,
            get_workspace,
            list_entries,
            read_document,
            write_document,
            create_document,
            create_folder,
            rename_entry,
            move_entry,
            trash_entry,
            save_image,
            import_paths,
            write_export,
            get_config,
            set_config,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let state = app.state::<AppState>();
            if let Err(error) = restore_workspace(app.handle(), &state) {
                log::warn!("failed to restore workspace: {error}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running md-manage");
}
