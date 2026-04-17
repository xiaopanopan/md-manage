import { useEffect, useState, useCallback } from 'react';
import type { FileNode } from '@/types/file';
import type { MenuAction } from '@/types/ipc';
import { useFiles, useWorkspace } from '@/hooks/useAppStore';
import { useAppStore } from '@/stores/appStore';
import { Folder } from './Folder';
import { FileItem } from './FileItem';
import { CurrentFileInfo } from './CurrentFileInfo';
import styles from './Sidebar.module.css';

// ── 图标 ─────────────────────────────────────────────────────
const NewFileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 2h5.5L12 4.5V14H4V2z" />
    <path d="M9 2v3h3M8 8v4M6 10h4" />
  </svg>
);

const NewFolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 4h4l1 2h7v8H2V4z" />
    <path d="M8 8v4M6 10h4" />
  </svg>
);

const OpenFolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 4h4l1 2h7v8H2V4z" />
  </svg>
);

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13.5 8.5a5.5 5.5 0 01-7-7A5.5 5.5 0 108 14a5.5 5.5 0 005.5-5.5z" />
  </svg>
);

const AutoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 2v12" />
    <path d="M8 2a6 6 0 010 12" fill="currentColor" opacity="0.3" />
  </svg>
);

const SECTION_NAMES = ['DRAFTS', 'ARCHIVES'];

export function Sidebar() {
  const files = useFiles();
  const workspace = useWorkspace();
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const setFiles = useAppStore((s) => s.setFiles);
  const setCurrentFile = useAppStore((s) => s.setCurrentFile);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  // 响应右键菜单动作
  useEffect(() => {
    if (!window.electronAPI?.onMenuAction) return;
    const unsub = window.electronAPI.onMenuAction(async (action: MenuAction) => {
      const { type, payload } = action;
      const targetPath = payload.path ?? '';

      switch (type) {
        case 'openFile': {
          try {
            const content = await window.electronAPI.file.read(targetPath);
            setCurrentFile(targetPath, content);
          } catch (e) {
            console.error('[Sidebar] openFile failed:', e);
          }
          break;
        }
        case 'rename': {
          setRenamingPath(targetPath);
          break;
        }
        case 'delete': {
          if (window.confirm(`确认删除 "${targetPath.split('/').pop()}"？\n文件将移至废纸篓。`)) {
            try {
              await window.electronAPI.file.delete(targetPath);
              await refreshFiles();
            } catch (e) {
              console.error('[Sidebar] delete failed:', e);
            }
          }
          break;
        }
        case 'moveToArchives': {
          if (!workspace) break;
          const fileName = targetPath.split('/').pop() ?? '';
          const dest = `${workspace}/ARCHIVES/${fileName}`;
          try {
            await window.electronAPI.file.rename(targetPath, dest);
            await refreshFiles();
          } catch (e) {
            console.error('[Sidebar] moveToArchives failed:', e);
          }
          break;
        }
        case 'newFile': {
          const dir = targetPath; // targetPath is folder path for newFile
          const name = `untitled-${Date.now()}.md`;
          try {
            const newPath = await window.electronAPI.file.create(dir, name);
            await refreshFiles();
            setRenamingPath(newPath);
          } catch (e) {
            console.error('[Sidebar] newFile failed:', e);
          }
          break;
        }
      }
    });
    return unsub;
  }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshFiles = useCallback(async () => {
    if (!workspace || !window.electronAPI) return;
    try {
      const updated = await window.electronAPI.file.list(workspace);
      setFiles(updated);
    } catch (e) {
      console.error('[Sidebar] refreshFiles failed:', e);
    }
  }, [workspace, setFiles]);

  const handleRenameConfirm = useCallback(
    async (file: FileNode, newName: string) => {
      setRenamingPath(null);
      const dir = file.path.slice(0, file.path.length - file.name.length - 1);
      const newPath = `${dir}/${newName.endsWith('.md') ? newName : `${newName}.md`}`;
      try {
        await window.electronAPI?.file.rename(file.path, newPath);
        await refreshFiles();
      } catch (e) {
        console.error('[Sidebar] rename failed:', e);
      }
    },
    [refreshFiles]
  );

  const handleRenameCancel = useCallback(() => setRenamingPath(null), []);

  const handleOpenWorkspace = async () => {
    const ws = await window.electronAPI?.workspace.open();
    if (ws) {
      setWorkspace(ws);
      const updated = await window.electronAPI?.file.list(ws);
      if (updated) setFiles(updated);
    }
  };

  const handleNewFile = async () => {
    const draftsDir = workspace ? `${workspace}/DRAFTS` : null;
    if (!draftsDir || !window.electronAPI) return;
    const newPath = await window.electronAPI.file.create(draftsDir, `untitled-${Date.now()}`);
    await refreshFiles();
    setRenamingPath(newPath);
  };

  const handleNewFolder = async () => {
    if (!workspace || !window.electronAPI) return;
    const name = `新文件夹-${Date.now()}`;
    const dirPath = `${workspace}/DRAFTS/${name}`;
    await window.electronAPI.file.write(`${dirPath}/.gitkeep`, '');
    await refreshFiles();
  };

  const handleThemeToggle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
    setTheme(next);
  };

  const themeIcon = theme === 'light' ? <SunIcon /> : theme === 'dark' ? <MoonIcon /> : <AutoIcon />;
  const themeLabel = theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统';

  // 将 DRAFTS / ARCHIVES 提取为顶层分区，其余直接展示
  const sections = SECTION_NAMES
    .map((name) => files.find((f) => f.type === 'folder' && f.name === name))
    .filter(Boolean) as FileNode[];

  const otherNodes = files.filter(
    (f) => !(f.type === 'folder' && SECTION_NAMES.includes(f.name))
  );

  return (
    <aside className={styles.sidebar}>
      {/* macOS Traffic Lights 空间 */}
      <div className={styles.trafficArea} />

      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>
          {workspace ? workspace.split('/').pop() : 'Digital Zen'}
        </span>
        <div className={styles.toolbarActions}>
          <button
            className={styles.iconBtn}
            title={`切换主题 (当前: ${themeLabel})`}
            onClick={handleThemeToggle}
          >
            {themeIcon}
          </button>
          <button
            className={styles.iconBtn}
            title="新建文件"
            onClick={handleNewFile}
            disabled={!workspace}
          >
            <NewFileIcon />
          </button>
          <button
            className={styles.iconBtn}
            title="新建文件夹"
            onClick={handleNewFolder}
            disabled={!workspace}
          >
            <NewFolderIcon />
          </button>
          <button
            className={styles.iconBtn}
            title="打开工作区"
            onClick={handleOpenWorkspace}
          >
            <OpenFolderIcon />
          </button>
        </div>
      </div>

      {/* 文件列表 */}
      <div className={styles.fileList}>
        {!workspace ? (
          <div className={styles.emptyState}>
            <span>尚未选择工作区</span>
            <button className={styles.emptyBtn} onClick={handleOpenWorkspace}>
              选择文件夹
            </button>
          </div>
        ) : (
          <>
            {/* DRAFTS / ARCHIVES 分区 */}
            {sections.map((folder) => (
              <Folder
                key={folder.path}
                folder={folder}
                depth={0}
                isSection
                renamingPath={renamingPath}
                onRenameConfirm={handleRenameConfirm}
                onRenameCancel={handleRenameCancel}
              />
            ))}

            {/* 其他顶层文件/文件夹 */}
            {otherNodes.map((node) =>
              node.type === 'folder' ? (
                <Folder
                  key={node.path}
                  folder={node}
                  depth={0}
                  renamingPath={renamingPath}
                  onRenameConfirm={handleRenameConfirm}
                  onRenameCancel={handleRenameCancel}
                />
              ) : (
                <FileItem
                  key={node.path}
                  file={node}
                  depth={0}
                  renamingPath={renamingPath}
                  onRenameConfirm={handleRenameConfirm}
                  onRenameCancel={handleRenameCancel}
                />
              )
            )}
          </>
        )}
      </div>

      {/* 底部文件信息 */}
      <CurrentFileInfo />
    </aside>
  );
}
