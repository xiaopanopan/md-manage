/**
 * Rust command 的稳定错误码 → 面向用户的中文文案。
 *
 * Rust 侧 `AppError` 序列化为 `{ code, message }`（见 `src-tauri/src/error.rs`）。
 * UI 只依赖 code，不解析平台错误字符串。
 */

const MESSAGES = {
  NO_WORKSPACE: '尚未选择工作区。',
  OUTSIDE_WORKSPACE: '目标不在当前工作区内，操作已取消。',
  INVALID_NAME: '名称不可用：不能为空，不能包含路径分隔符，也不能以点或空格结尾。',
  ALREADY_EXISTS: '目标位置已存在同名项目，没有做任何修改。',
  INVALID_MOVE: '不能把文件夹移动到它自己或它的子目录里。',
  INVALID_IMAGE_EXTENSION: '不支持这种图片格式。',
  INVALID_EXPORT_PATH: '导出路径不可用。',
  IO_ERROR: '文件系统操作失败，请检查文件是否被其他程序占用。',
} as const;

export type DesktopErrorCode = keyof typeof MESSAGES;

/** 从 invoke rejection 中安全取出错误码；无法识别时返回 null。 */
export function getDesktopErrorCode(error: unknown): DesktopErrorCode | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const code = (error as { code: unknown }).code;
  if (typeof code !== 'string' || !(code in MESSAGES)) return null;
  return code as DesktopErrorCode;
}

/** 把错误转成可直接展示的文案；无法识别时用调用方给的兜底文案。 */
export function describeDesktopError(error: unknown, fallback: string): string {
  const code = getDesktopErrorCode(error);
  return code ? MESSAGES[code] : fallback;
}
