import { useState, useEffect } from 'react';
import type { FileNode } from '@/types/file';
import { FileTree } from './FileTree';
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
  isSection?: boolean;
  renamingPath: string | null;
  onRenameConfirm: (file: FileNode, newName: string) => void;
  onRenameCancel: () => void;
  onMoveFile: (srcPath: string, destDir: string) => void;
}

export function Folder({
  folder,
  depth = 0,
  isSection = false,
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
  onMoveFile,
}: Props) {
  const [open, setOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  // 拖拽全局结束 → 清除高亮（dragend 一定会在 source 上触发并冒泡）
  useEffect(() => {
    const clear = () => setIsDragOver(false);
    window.addEventListener('dragend', clear);
    return () => window.removeEventListener('dragend', clear);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.electronAPI?.contextMenu.show('file', {
      path: folder.path,
      isFolder: 'true',
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-file-path')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const srcPath = e.dataTransfer.getData('application/x-file-path');
    if (!srcPath) return;
    onMoveFile(srcPath, folder.path);
  };

  const children = folder.children ?? [];

  if (isSection) {
    return (
      <div
        className={`${styles.folder} ${isDragOver ? styles.dropTarget : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={styles.sectionLabel}
          onClick={() => setOpen((v) => !v)}
          onContextMenu={handleContextMenu}
        >
          <Arrow open={open} />
          <span>{folder.name}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.4, fontSize: '10px' }}>
            {children.filter((c) => c.type === 'file').length}
          </span>
        </div>
        {open && (
          <FileTree
            nodes={children}
            depth={depth + 1}
            renamingPath={renamingPath}
            onRenameConfirm={onRenameConfirm}
            onRenameCancel={onRenameCancel}
            onMoveFile={onMoveFile}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`${styles.folder} ${isDragOver ? styles.dropTarget : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={styles.header}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={() => setOpen((v) => !v)}
        onContextMenu={handleContextMenu}
      >
        <Arrow open={open} />
        <FolderIcon open={open} />
        <span className={styles.folderName}>{folder.name}</span>
      </div>
      {open && (
        <FileTree
          nodes={children}
          depth={depth + 1}
          renamingPath={renamingPath}
          onRenameConfirm={onRenameConfirm}
          onRenameCancel={onRenameCancel}
          onMoveFile={onMoveFile}
        />
      )}
    </div>
  );
}
