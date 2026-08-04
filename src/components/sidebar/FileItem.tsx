import { useEffect, useRef } from 'react';
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

  const isOpen = currentFile === file.path;
  const isRenaming = renamingPath === file.path;
  const itemRef = useRef<HTMLDivElement>(null);

  // 打开的文档滚动到可见区域，替代原来基于选中态的定位。
  useEffect(() => {
    if (isOpen) itemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isOpen]);

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
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
    window.desktopAPI?.contextMenu.show('file', {
      path: file.path,
      parentPath: file.parentPath,
      isFolder: 'false',
    });
  };

  const baseName = file.name.replace(/\.(md|markdown)$/i, '');

  return (
    <div
      ref={itemRef}
      title={file.name}
      className={`${styles.item} ${isOpen ? styles.open : ''}`}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
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
