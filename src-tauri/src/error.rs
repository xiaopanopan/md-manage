use serde::Serialize;
use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("no workspace configured")]
    NoWorkspace,
    #[error("path is outside the current workspace")]
    OutsideWorkspace,
    #[error("invalid file name")]
    InvalidName,
    #[error("target already exists: {0}")]
    AlreadyExists(String),
    #[error("invalid move")]
    InvalidMove,
    #[error("unsupported image extension")]
    InvalidImageExtension,
    #[error("invalid export path")]
    InvalidExportPath,
    #[error("I/O error: {0}")]
    Io(String),
}

impl From<io::Error> for AppError {
    fn from(value: io::Error) -> Self {
        Self::Io(value.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        #[derive(Serialize)]
        struct Payload<'a> {
            code: &'a str,
            message: String,
        }

        let code = match self {
            Self::NoWorkspace => "NO_WORKSPACE",
            Self::OutsideWorkspace => "OUTSIDE_WORKSPACE",
            Self::InvalidName => "INVALID_NAME",
            Self::AlreadyExists(_) => "ALREADY_EXISTS",
            Self::InvalidMove => "INVALID_MOVE",
            Self::InvalidImageExtension => "INVALID_IMAGE_EXTENSION",
            Self::InvalidExportPath => "INVALID_EXPORT_PATH",
            Self::Io(_) => "IO_ERROR",
        };
        Payload {
            code,
            message: self.to_string(),
        }
        .serialize(serializer)
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
