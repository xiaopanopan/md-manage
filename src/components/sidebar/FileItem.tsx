import { useEffect, useRef } from 'react';
import type { FileNode } from '@/types/file';
import { useCurrentFile, useSelectedEntry } from '@/hooks/useAppStore';
import { useAppStore } from '@/stores/appStore';
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
  const selectedEntry = useSelectedEntry();

  const isOpen = currentFile === file.path;
  const isSelected = selectedEntry?.path === file.path;
  const isRenaming = renamingPath === file.path;
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) itemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isSelected]);

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isRenaming) return;
    useAppStore.getState().setSelectedEntry({ path: file.path, kind: 'file' });
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
    useAppStore.getState().setSelectedEntry({ path: file.path, kind: 'file' });
    window.desktopAPI?.contextMenu.show('file', {
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
      ref={itemRef}
      title={file.name}
      className={`${styles.item} ${isSelected ? styles.selected : ''} ${isOpen ? styles.open : ''}`}
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
