// ============================================================
// Digital Zen — AppState 全局状态类型契约
// 维护者：Agent 1（Architecture Lead）
// ============================================================

import type { FileNode } from './file';

export type ViewMode = 'read' | 'edit';
export type Theme = 'light' | 'dark' | 'auto';

export interface AppState {
  // ── 文件状态 ──
  currentFile: string | null;
  currentContent: string;
  isDirty: boolean;
  files: FileNode[];
  recentFiles: string[];      // 最近 10 个文件路径

  // ── UI 状态 ──
  viewMode: ViewMode;
  theme: Theme;
  sidebarVisible: boolean;
  searchOpen: boolean;
  historyOpen: boolean;
  settingsOpen: boolean;

  // ── 工作区 ──
  workspace: string | null;
}

export interface AppActions {
  // 文件操作
  setCurrentFile(path: string, content: string): void;
  setContent(content: string): void;
  markSaved(): void;
  markDirty(): void;
  setFiles(files: FileNode[]): void;
  addRecentFile(path: string): void;

  // UI 操作
  switchMode(mode: ViewMode): void;
  setTheme(theme: Theme): void;
  toggleSidebar(): void;
  setSidebarVisible(visible: boolean): void;
  openSearch(): void;
  closeSearch(): void;
  openHistory(): void;
  closeHistory(): void;
  openSettings(): void;
  closeSettings(): void;

  // 工作区
  setWorkspace(path: string): void;
}

export type AppStore = AppState & AppActions;
