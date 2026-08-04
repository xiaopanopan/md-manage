import type { FileNode } from '@/types/file';

export function findNode(nodes: FileNode[], targetPath: string): FileNode | undefined {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    const nested = node.children ? findNode(node.children, targetPath) : undefined;
    if (nested) return nested;
  }
  return undefined;
}

export function findAncestorFolders(nodes: FileNode[], targetPath: string): string[] {
  for (const node of nodes) {
    if (node.path === targetPath) return [];
    if (node.children) {
      const nested = findAncestorFolders(node.children, targetPath);
      if (nested.length > 0 || node.children.some((child) => child.path === targetPath)) {
        return [node.path, ...nested];
      }
    }
  }
  return [];
}

/**
 * 工具栏新建的目标目录：当前打开文档所在目录，没有打开文档（或路径已失效）时回退到工作区根目录。
 * 目录来自 Rust 返回的 `parentPath`，不在渲染层拼接平台路径。
 */
export function resolveCreateDir(
  workspace: string,
  currentFile: string | null,
  nodes: FileNode[]
): string {
  if (!currentFile) return workspace;
  return findNode(nodes, currentFile)?.parentPath ?? workspace;
}

/** 目标目录下的直接子项。`dir` 为工作区根时按 parentPath 匹配顶层节点。 */
export function childrenOf(nodes: FileNode[], dir: string): FileNode[] {
  const node = findNode(nodes, dir);
  if (node?.type === 'folder') return node.children ?? [];
  return nodes.filter((entry) => entry.parentPath === dir);
}

/** candidate 是否等于 parent 或位于 parent 之下。兼容 POSIX 与 Windows 分隔符。 */
export function isSameOrDescendant(candidate: string, parent: string): boolean {
  if (candidate === parent) return true;
  return candidate.startsWith(`${parent}/`) || candidate.startsWith(`${parent}\\`);
}

/** 重命名/移动后把受影响的路径前缀替换为新路径。 */
export function remapPath(candidate: string, oldPath: string, newPath: string): string {
  if (!isSameOrDescendant(candidate, oldPath)) return candidate;
  return `${newPath}${candidate.slice(oldPath.length)}`;
}

export function suggestAvailableName(
  kind: 'file' | 'folder',
  targetDir: string,
  nodes: FileNode[]
): string {
  const existing = new Set(
    childrenOf(nodes, targetDir).map((node) => node.name.toLocaleLowerCase())
  );
  const base = kind === 'file' ? 'untitled' : '新文件夹';
  const suffix = kind === 'file' ? '.md' : '';
  let candidate = `${base}${suffix}`;
  for (let index = 2; existing.has(candidate.toLocaleLowerCase()); index += 1) {
    candidate = `${base} ${index}${suffix}`;
  }
  return candidate;
}

export function relativeDisplayPath(workspace: string, targetDir: string): string {
  if (workspace === targetDir) return '工作区根目录';
  const normalizedWorkspace = workspace.replace(/[\\/]+$/, '');
  const relative = targetDir.slice(normalizedWorkspace.length).replace(/^[\\/]+/, '');
  return relative || '工作区根目录';
}
