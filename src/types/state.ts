// ============================================================
// md-manage — AppState 全局状态类型
// ============================================================

import type { FileNode } from './file';

export type ViewMode = 'read' | 'edit';
export type Theme = 'light' | 'dark' | 'auto';
export type ExplorerSortMode = 'name' | 'modified' | 'type';
export type SortDirection = 'asc' | 'desc';

export interface ExplorerSelection {
  path: string;
  kind: 'file' | 'folder';
}

export interface AppState {
  // ── 文件状态 ──
  currentFile: string | null;
  currentContent: string;
  isDirty: boolean;
  files: FileNode[];
  recentFiles: string[];
  selectedEntry: ExplorerSelection | null;
  expandedPaths: string[];

  // ── UI 状态 ──
  viewMode: ViewMode;
  theme: Theme;
  sidebarVisible: boolean;
  settingsOpen: boolean;
  explorerSortMode: ExplorerSortMode;
  explorerSortDirection: SortDirection;

  // ── 工作区 ──
  workspace: string | null;
}

export interface AppActions {
  setCurrentFile(path: string, content: string): void;
  setContent(content: string): void;
  markSaved(): void;
  markDirty(): void;
  setFiles(files: FileNode[]): void;
  addRecentFile(path: string): void;
  setSelectedEntry(entry: ExplorerSelection | null): void;
  setFolderExpanded(path: string, expanded: boolean): void;
  revealEntry(path: string, ancestors: string[]): void;

  switchMode(mode: ViewMode): void;
  setTheme(theme: Theme): void;
  toggleSidebar(): void;
  setSidebarVisible(visible: boolean): void;
  openSettings(): void;
  closeSettings(): void;
  setExplorerSort(mode: ExplorerSortMode, direction: SortDirection): void;

  setWorkspace(path: string): void;
}

export type AppStore = AppState & AppActions;
