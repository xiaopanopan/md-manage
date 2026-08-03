import { useEffect, useRef, useState } from 'react';
import type { FileNode } from '@/types/file';
import { FileTree } from './FileTree';
import { RenameDialog } from '@/components/dialogs/RenameDialog';
import { useAppStore } from '@/stores/appStore';
import { useExpandedPaths, useSelectedEntry } from '@/hooks/useAppStore';
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
  onMoveFile: (srcPath: string, destDir: string) => void;
}

export function Folder({
  folder,
  depth = 0,
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
  onMoveFile,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const expandTimer = useRef<ReturnType<typeof setTimeout>>();
  const headerRef = useRef<HTMLDivElement>(null);
  const selectedEntry = useSelectedEntry();
  const expandedPaths = useExpandedPaths();
  const open = expandedPaths.includes(folder.path);
  const isSelected = selectedEntry?.path === folder.path;

  useEffect(() => {
    if (isSelected) headerRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isSelected]);

  // 拖拽全局结束 → 清除高亮（dragend 一定会在 source 上触发并冒泡）
  useEffect(() => {
    const clear = () => {
      setIsDragOver(false);
      clearTimeout(expandTimer.current);
      expandTimer.current = undefined;
    };
    window.addEventListener('dragend', clear);
    return () => {
      window.removeEventListener('dragend', clear);
      clearTimeout(expandTimer.current);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    useAppStore.getState().setSelectedEntry({ path: folder.path, kind: 'folder' });
    window.desktopAPI?.contextMenu.show('file', {
      path: folder.path,
      parentPath: folder.parentPath,
      isFolder: 'true',
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-file-path')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
    if (!open && !expandTimer.current) {
      expandTimer.current = setTimeout(() => {
        useAppStore.getState().setFolderExpanded(folder.path, true);
        expandTimer.current = undefined;
      }, 600);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
    clearTimeout(expandTimer.current);
    expandTimer.current = undefined;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    clearTimeout(expandTimer.current);
    expandTimer.current = undefined;
    const srcPath = e.dataTransfer.getData('application/x-file-path');
    if (!srcPath) return;
    // 拒绝拖到自身
    if (srcPath === folder.path) return;
    onMoveFile(srcPath, folder.path);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/x-file-path', folder.path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const children = folder.children ?? [];
  const isRenaming = renamingPath === folder.path;

  return (
    <div className={styles.folder}>
      <div
        ref={headerRef}
        title={folder.name}
        className={`${styles.header} ${isSelected ? styles.selected : ''} ${isDragOver ? styles.dropTarget : ''}`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={(event) => {
          event.stopPropagation();
          if (isRenaming) return;
          useAppStore.getState().setSelectedEntry({ path: folder.path, kind: 'folder' });
          useAppStore.getState().setFolderExpanded(folder.path, !open);
        }}
        onContextMenu={handleContextMenu}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
          onMoveFile={onMoveFile}
        />
      )}
    </div>
  );
}
