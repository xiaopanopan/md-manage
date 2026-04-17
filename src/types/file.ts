// ============================================================
// md-manage — 共享文件系统类型
// ============================================================

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  metadata?: FileMetadata;
  modifiedAt: string;
  size?: number;
}

export interface FileMetadata {
  title: string;
  created: string;
  modified: string;
  tags: string[];
  wordCount: number;
  readingTime: number;
}

export interface WorkspaceInfo {
  path: string;
  name: string;
  draftsDir: string;
  archivesDir: string;
  configDir: string;
}
