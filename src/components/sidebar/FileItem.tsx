import type { FileNode } from '@/types/file';
import { useCurrentFile } from '@/hooks/useAppStore';
import { RenameDialog } from '@/components/dialogs/RenameDialog';
import { openDocument } from '@/services/documentSession';
import styles from './FileItem.module.css';

// SVG icons (inline, no external dependency)
const FileIcon = () => (
  <svg className={styles.icon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 2h5.5L12 4.5V14H4V2z" />
    <path d="M9 2v3h3" />
  </svg>
);

interface Props {
  file: FileNode;
  depth?: number;
  renamingPath: string | null;
  onRenameConfirm: (file: FileNode, newName: string) => void;
  onRenameCancel: () => void;
}

export function FileItem({
  file,
  depth = 0,
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
}: Props) {
  const currentFile = useCurrentFile();

  const isActive = currentFile === file.path;
  const isRenaming = renamingPath === file.path;

  const handleClick = async () => {
    if (isRenaming) return;
    try {
      await openDocument(file.path);
    } catch (err) {
      console.error('[FileItem] read failed:', err);
      window.alert('无法打开文件。当前文件的修改已保留，请检查文件权限后重试。');
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.electronAPI?.contextMenu.show('file', {
      path: file.path,
      parentPath: file.parentPath,
      isFolder: 'false',
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-file-path', file.path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const baseName = file.name.replace(/\.(md|markdown)$/i, '');

  return (
    <div
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
    >
      <FileIcon />
      {isRenaming ? (
        <div className={styles.renameWrap}>
          <RenameDialog
            initialName={baseName}
            onConfirm={(n) => onRenameConfirm(file, n)}
            onCancel={onRenameCancel}
          />
        </div>
      ) : (
        <span className={styles.name}>{baseName}</span>
      )}
    </div>
  );
}
