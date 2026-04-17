// ============================================================
// Digital Zen — ElectronAPI 接口契约
// 维护者：Agent 1（Architecture Lead）
// Agent 2 负责实现，其他 Agent 调用
// ============================================================

import type { FileNode, Version } from './file';

export interface FileAPI {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  list(dir: string): Promise<FileNode[]>;
  create(dir: string, name: string): Promise<string>;
}

export interface WorkspaceAPI {
  open(): Promise<string | null>;
  get(): Promise<string | null>;
  init(path: string): Promise<void>;
}

export interface ConfigAPI {
  get<T = unknown>(key?: string): Promise<T>;
  set(key: string, value: unknown): Promise<void>;
}

export interface ImageAPI {
  save(buffer: number[], ext: string): Promise<string>;
  getAbsPath(relativePath: string): Promise<string>;
}

export interface ExportAPI {
  pdf(htmlContent: string): Promise<void>;
  html(markdownContent: string): Promise<void>;
}

export interface ContextMenuAPI {
  show(type: 'file' | 'editor', data: Record<string, string>): Promise<void>;
}

export interface MenuAction {
  type: 'openFile' | 'rename' | 'delete' | 'moveToArchives' | 'newFile' | 'newFolder';
  payload: Record<string, string>;
}

export interface HistoryAPI {
  list(filePath: string): Promise<Version[]>;
  get(filePath: string, versionId: string): Promise<string>;
  restore(filePath: string, versionId: string): Promise<void>;
}

export interface ImportAPI {
  files(destDir?: string): Promise<string[]>;
  folder(destDir?: string): Promise<string[]>;
  drop(srcPaths: string[], destDir: string): Promise<string[]>;
}

export interface WindowAPI {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  setFullscreen(flag: boolean): Promise<void>;
  isFullscreen(): Promise<boolean>;
  isMaximized(): Promise<boolean>;
}

export interface ElectronAPI {
  file: FileAPI;
  workspace: WorkspaceAPI;
  config: ConfigAPI;
  image: ImageAPI;
  export: ExportAPI;
  import: ImportAPI;
  contextMenu: ContextMenuAPI;
  history: HistoryAPI;
  window: WindowAPI;
  onFileChanged(callback: (info: unknown) => void): () => void;
  onMenuAction(callback: (action: MenuAction) => void): () => void;
}

// 全局类型扩展
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
