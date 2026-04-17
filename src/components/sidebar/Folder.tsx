import { useState } from 'react';
import type { FileNode } from '@/types/file';
import { FileTree } from './FileTree';
import styles from './Folder.module.css';

// Arrow SVG
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
  /** 是否以 DRAFTS/ARCHIVES 顶层分类样式渲染 */
  isSection?: boolean;
  renamingPath: string | null;
  onRenameConfirm: (file: FileNode, newName: string) => void;
  onRenameCancel: () => void;
}

export function Folder({
  folder,
  depth = 0,
  isSection = false,
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
}: Props) {
  const [open, setOpen] = useState(true);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.electronAPI?.contextMenu.show('file', {
      path: folder.path,
      isFolder: 'true',
    });
  };

  const children = folder.children ?? [];

  if (isSection) {
    return (
      <div className={styles.folder}>
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
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.folder}>
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
        />
      )}
    </div>
  );
}
