import type { FileNode } from '@/types/file';
import { FileItem } from './FileItem';
import { Folder } from './Folder';

interface Props {
  nodes: FileNode[];
  depth?: number;
  renamingPath: string | null;
  onRenameConfirm: (file: FileNode, newName: string) => void;
  onRenameCancel: () => void;
}

export function FileTree({
  nodes,
  depth = 0,
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
}: Props) {
  return (
    <>
      {nodes.map((node) =>
        node.type === 'folder' ? (
          <Folder
            key={node.path}
            folder={node}
            depth={depth}
            renamingPath={renamingPath}
            onRenameConfirm={onRenameConfirm}
            onRenameCancel={onRenameCancel}
          />
        ) : (
          <FileItem
            key={node.path}
            file={node}
            depth={depth}
            renamingPath={renamingPath}
            onRenameConfirm={onRenameConfirm}
            onRenameCancel={onRenameCancel}
          />
        )
      )}
    </>
  );
}
