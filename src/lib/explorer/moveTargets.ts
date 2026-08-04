import type { FileNode } from '@/types/file';
import { childrenOf, isSameOrDescendant, relativeDisplayPath } from './tree';

export interface FolderOption {
  /** 绝对路径，直接传给 Rust `move_entry`。 */
  path: string;
  /** 显示名，配合 depth 缩进。 */
  name: string;
  /** 相对工作区的路径，用于筛选与 tooltip。 */
  relativePath: string;
  depth: number;
}

export type MoveTargetStatus =
  | 'ok'
  | 'same-parent'
  | 'into-self'
  | 'name-conflict';

/** 工作区根目录 + 递归收集的全部文件夹，按文件树展示顺序排列。 */
export function collectFolderOptions(workspace: string, nodes: FileNode[]): FolderOption[] {
  const options: FolderOption[] = [
    {
      path: workspace,
      name: relativeDisplayPath(workspace, workspace),
      relativePath: relativeDisplayPath(workspace, workspace),
      depth: 0,
    },
  ];

  const walk = (list: FileNode[], depth: number): void => {
    for (const node of list) {
      if (node.type !== 'folder') continue;
      options.push({
        path: node.path,
        name: node.name,
        relativePath: relativeDisplayPath(workspace, node.path),
        depth,
      });
      if (node.children) walk(node.children, depth + 1);
    }
  };
  walk(nodes, 1);

  return options;
}

/**
 * 目标目录是否可以接收 source。仅用于在弹窗里提前反馈和禁用选项；
 * Rust `move_entry` 仍然是最终权威（工作区边界、真实同名冲突）。
 */
export function validateMoveTarget(
  source: FileNode,
  destDir: string,
  nodes: FileNode[]
): MoveTargetStatus {
  if (destDir === source.parentPath) return 'same-parent';
  if (isSameOrDescendant(destDir, source.path)) return 'into-self';

  // 大小写不敏感比较，与 macOS APFS / Windows NTFS 的默认行为一致。
  const taken = childrenOf(nodes, destDir).some(
    (node) => node.name.toLocaleLowerCase() === source.name.toLocaleLowerCase()
  );
  return taken ? 'name-conflict' : 'ok';
}
