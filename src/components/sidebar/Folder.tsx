import type { FileNode } from '@/types/file';
import { FileTree } from './FileTree';
import { RenameDialog } from '@/components/dialogs/RenameDialog';
import { useAppStore } from '@/stores/appStore';
import { useExpandedPaths } from '@/hooks/useAppStore';
import styles from './Folder.module.css';

const Arrow = ({ open }: { open: boolean }) => (
  <svg
    className={`${styles.arrow} ${open ? styles.open : ''}`}
    viewBox="0 0 12 12"
    fill="currentColor"
  >
    <path d="M4 2.5l4 3.5-4 3.5V2.5z" />
  </svg>
);

const FolderIcon = ({ open }: { open: boolean }) => (
  <svg className={styles.folderIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    {open ? (
      <path d="M2 6h12l-1 7H3L2 6zM2 6V4h4l1 2" />
    ) : (
      <path d="M2 4h4l1 2h7v8H2V4z" />
    )}
  </svg>
);

interface Props {
  folder: FileNode;
  depth?: number;
  renamingPath: string | null;
  onRenameConfirm: (file: FileNode, newName: string) => void;
  onRenameCancel: () => void;
}

export function Folder({
  folder,
  depth = 0,
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
}: Props) {
  const expandedPaths = useExpandedPaths();
  const open = expandedPaths.includes(folder.path);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.desktopAPI?.contextMenu.show('file', {
      path: folder.path,
      parentPath: folder.parentPath,
      isFolder: 'true',
    });
  };

  const children = folder.children ?? [];
  const isRenaming = renamingPath === folder.path;

  return (
    <div className={styles.folder}>
      <div
        title={folder.name}
        className={styles.header}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={(event) => {
          event.stopPropagation();
          if (isRenaming) return;
          useAppStore.getState().setFolderExpanded(folder.path, !open);
        }}
        onContextMenu={handleContextMenu}
      >
        <Arrow open={open} />
        <FolderIcon open={open} />
        {isRenaming ? (
          <div className={styles.renameWrap} onClick={(e) => e.stopPropagation()}>
            <RenameDialog
              initialName={folder.name}
              onConfirm={(n) => onRenameConfirm(folder, n)}
              onCancel={onRenameCancel}
            />
          </div>
        ) : (
          <span className={styles.folderName}>{folder.name}</span>
        )}
      </div>
      {open && (
        <FileTree
          nodes={children}
          depth={depth + 1}
          renamingPath={renamingPath}
          onRenameConfirm={onRenameConfirm}
          onRenameCancel={onRenameCancel}
        />
      )}
    </div>
  );
}
