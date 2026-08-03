import type { FileNode } from '@/types/file';
import type { ExplorerSelection } from '@/types/state';

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

export function resolveCreateTarget(
  workspace: string,
  selection: ExplorerSelection | null,
  nodes: FileNode[]
): string {
  if (!selection) return workspace;
  const selected = findNode(nodes, selection.path);
  if (!selected) return workspace;
  return selected.type === 'folder' ? selected.path : selected.parentPath;
}

export function suggestAvailableName(
  kind: 'file' | 'folder',
  targetDir: string,
  nodes: FileNode[]
): string {
  const target = findNode(nodes, targetDir);
  const children = target?.type === 'folder'
    ? target.children ?? []
    : nodes.filter((node) => node.parentPath === targetDir);
  const existing = new Set(children.map((node) => node.name.toLocaleLowerCase()));
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
