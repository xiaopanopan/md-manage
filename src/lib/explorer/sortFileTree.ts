import type { FileNode } from '@/types/file';
import type { ExplorerSortMode, SortDirection } from '@/types/state';

const nameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function compareRaw(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compareNames(a: string, b: string): number {
  return nameCollator.compare(a, b) || compareRaw(a, b);
}

function extension(name: string): string {
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index + 1) : '';
}

function timestamp(value: string): number | null {
  const result = Date.parse(value);
  return Number.isNaN(result) ? null : result;
}

function compareByMode(a: FileNode, b: FileNode, mode: ExplorerSortMode): number {
  if (mode === 'modified') {
    const left = timestamp(a.modifiedAt);
    const right = timestamp(b.modifiedAt);
    if (left !== null && right !== null && left !== right) return left - right;
  }
  if (mode === 'type' && a.type === 'file' && b.type === 'file') {
    const byExtension = compareNames(extension(a.name), extension(b.name));
    if (byExtension !== 0) return byExtension;
  }
  return compareNames(a.name, b.name);
}

export function sortFileTree(
  nodes: FileNode[],
  mode: ExplorerSortMode,
  direction: SortDirection
): FileNode[] {
  const factor = direction === 'asc' ? 1 : -1;
  return nodes
    .map((node) => ({
      ...node,
      children: node.children ? sortFileTree(node.children, mode, direction) : undefined,
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      if (mode === 'modified') {
        const left = timestamp(a.modifiedAt);
        const right = timestamp(b.modifiedAt);
        if (left === null && right !== null) return 1;
        if (left !== null && right === null) return -1;
      }
      const primary = compareByMode(a, b, mode);
      if (primary !== 0) return primary * factor;
      return compareRaw(a.name, b.name) || compareRaw(a.path, b.path);
    });
}
