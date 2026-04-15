// ============================================================
// Digital Zen — 共享文件系统类型契约
// 维护者：Agent 1（Architecture Lead）
// 变更需通知所有 Agent
// ============================================================

export interface FileNode {
  name: string;           // 不含路径的文件名（含扩展名）
  path: string;           // 完整绝对路径
  type: 'file' | 'folder';
  children?: FileNode[];  // 仅 folder 有
  metadata?: FileMetadata;
  modifiedAt: string;     // ISO 8601
  size?: number;          // bytes，仅 file 有
}

export interface FileMetadata {
  title: string;
  created: string;        // ISO 8601（来自 Front Matter）
  modified: string;       // ISO 8601（来自 Front Matter）
  tags: string[];
  wordCount: number;
  readingTime: number;    // 分钟（ceil(wordCount / 300)）
}

export interface WorkspaceInfo {
  path: string;
  name: string;           // path.basename(path)
  draftsDir: string;      // path.join(path, 'DRAFTS')
  archivesDir: string;    // path.join(path, 'ARCHIVES')
  configDir: string;      // path.join(path, '.digitalzen')
}

export interface Version {
  id: string;
  filename: string;
  wordCount: number;
  summary: string;        // 首行内容前 50 字符
  createdAt: string;      // ISO 8601
}
