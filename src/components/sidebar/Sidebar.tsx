import { useEffect, useState, useCallback } from 'react';
import type { FileNode } from '@/types/file';
import type { MenuAction } from '@/types/ipc';
import { useFiles, useWorkspace, useCurrentFile } from '@/hooks/useAppStore';
import { useAppStore } from '@/stores/appStore';
import { Folder } from './Folder';
import { FileItem } from './FileItem';
import { flushCurrentDocument, openDocument } from '@/services/documentSession';
import styles from './Sidebar.module.css';

function isSameOrDescendant(candidate: string, parent: string): boolean {
    if (candidate === parent) return true;
    return candidate.startsWith(`${parent}/`) || candidate.startsWith(`${parent}\\`);
}

function remapPath(candidate: string, oldPath: string, newPath: string): string {
    if (!isSameOrDescendant(candidate, oldPath)) return candidate;
    return `${newPath}${candidate.slice(oldPath.length)}`;
}

function findFile(nodes: FileNode[], targetPath: string): FileNode | undefined {
    for (const node of nodes) {
        if (node.path === targetPath) return node;
        const found = node.children ? findFile(node.children, targetPath) : undefined;
        if (found) return found;
    }
    return undefined;
}

function requestName(message: string, initialValue: string): string | null {
    const value = window.prompt(message, initialValue)?.trim();
    return value || null;
}

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

const SettingsIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M6 6a2 2 0 114 0c0 1.2-1.5 1.5-2 2.5" strokeLinecap="round" />
        <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </svg>
);


export function Sidebar() {
    const files = useFiles();
    const workspace = useWorkspace();
    const setWorkspace = useAppStore((s) => s.setWorkspace);
    const setFiles = useAppStore((s) => s.setFiles);
    const theme = useAppStore((s) => s.theme);
    const setTheme = useAppStore((s) => s.setTheme);
    const openSettings = useAppStore((s) => s.openSettings);

    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [rootDragOver, setRootDragOver] = useState(false);

    const currentFile = useCurrentFile();
    // 活动目录：当前打开文件所在目录；否则工作区根目录
    const activeDir = currentFile
        ? findFile(files, currentFile)?.parentPath ?? workspace
        : workspace;

    // 拖拽全局结束 → 清除根目录高亮
    useEffect(() => {
        const clear = () => setRootDragOver(false);
        window.addEventListener('dragend', clear);
        return () => window.removeEventListener('dragend', clear);
    }, []);

    // 全局 Enter 键触发重命名（由 App.tsx 派发）
    useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent<{ path: string }>;
            if (custom.detail?.path) setRenamingPath(custom.detail.path);
        };
        window.addEventListener('md-manage:rename', handler);
        return () => window.removeEventListener('md-manage:rename', handler);
    }, []);

    // 响应右键菜单动作
    useEffect(() => {
        if (!window.desktopAPI?.onMenuAction) return;
        const unsub = window.desktopAPI.onMenuAction(async (action: MenuAction) => {
            const { type, payload } = action;
            const targetPath = payload.path ?? '';
            const isFolder = payload.isFolder === 'true';
            // 目标所在的目录（右键文件 → 文件父目录，右键文件夹 → 该文件夹）
            const contextDir = isFolder
                ? targetPath
                : payload.parentPath;

            switch (type) {
                case 'delete': {
                    try {
                        const opened = useAppStore.getState().currentFile;
                        if (opened && isSameOrDescendant(opened, targetPath)) {
                            await flushCurrentDocument();
                        }
                        await window.desktopAPI.file.delete(targetPath);
                        if (opened && isSameOrDescendant(opened, targetPath)) {
                            useAppStore.setState({ currentFile: null, currentContent: '', isDirty: false });
                        }
                        await refreshFiles();
                    } catch (e) {
                        console.error('[Sidebar] delete failed:', e);
                        window.alert('无法移到废纸篓，文件没有被删除。');
                    }
                    break;
                }
                case 'rename': {
                    setRenamingPath(targetPath);
                    break;
                }
                case 'newFile': {
                    const name = requestName('新建 Markdown 文件', 'untitled.md');
                    if (!name) break;
                    try {
                        const newPath = await window.desktopAPI.file.create(contextDir, name);
                        await refreshFiles();
                        await openDocument(newPath);
                    } catch (e) {
                        console.error('[Sidebar] newFile failed:', e);
                        window.alert('创建失败：名称可能已存在或不可用。');
                    }
                    break;
                }
                case 'newFolder': {
                    const name = requestName('新建文件夹', '新文件夹');
                    if (!name) break;
                    try {
                        await window.desktopAPI.file.createFolder(contextDir, name);
                        await refreshFiles();
                    } catch (e) {
                        console.error('[Sidebar] newFolder failed:', e);
                        window.alert('创建失败：名称可能已存在或不可用。');
                    }
                    break;
                }
            }
        });
        return unsub;
    }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshFiles = useCallback(async () => {
        if (!workspace || !window.desktopAPI) return;
        try {
            const updated = await window.desktopAPI.file.list(workspace);
            setFiles(updated);
        } catch (e) {
            console.error('[Sidebar] refreshFiles failed:', e);
        }
    }, [workspace, setFiles]);

    const handleRenameConfirm = useCallback(
        async (file: FileNode, newName: string) => {
            setRenamingPath(null);
            const trimmed = newName.trim();
            if (!trimmed || trimmed === file.name) return;

            // 文件夹不追加扩展名；文件自动补 .md
            const finalName =
                file.type === 'folder'
                    ? trimmed
                    : /\.(md|markdown)$/i.test(trimmed)
                        ? trimmed
                        : `${trimmed}.md`;
            try {
                const state = useAppStore.getState();
                const current = state.currentFile;
                if (current && isSameOrDescendant(current, file.path)) {
                    await flushCurrentDocument();
                }
                const newPath = await window.desktopAPI.file.rename(file.path, finalName);
                useAppStore.setState({
                    currentFile: current ? remapPath(current, file.path, newPath) : null,
                    recentFiles: state.recentFiles.map((p) => remapPath(p, file.path, newPath)),
                });
                await refreshFiles();
            } catch (e) {
                console.error('[Sidebar] rename failed:', e);
                window.alert('重命名失败：目标名称可能已存在或不可用。');
            }
        },
        [refreshFiles]
    );

    const handleRenameCancel = useCallback(() => setRenamingPath(null), []);

    const handleMoveFile = useCallback(
        async (srcPath: string, destDir: string) => {
            // 验证：不能拖到自身（文件夹）
            if (srcPath === destDir) return;
            // 验证：不能移动到自己的子目录（避免循环）
            if (isSameOrDescendant(destDir, srcPath)) return;

            try {
                const state = useAppStore.getState();
                const current = state.currentFile;
                if (current && isSameOrDescendant(current, srcPath)) {
                    await flushCurrentDocument();
                }
                const newPath = await window.desktopAPI.file.move(srcPath, destDir);
                useAppStore.setState({
                    currentFile: current ? remapPath(current, srcPath, newPath) : null,
                    recentFiles: state.recentFiles.map((p) => remapPath(p, srcPath, newPath)),
                });
                await refreshFiles();
            } catch (err) {
                console.error('[Sidebar] move failed:', err);
                window.alert('移动失败：目标位置可能已有同名项目。');
            }
        },
        [refreshFiles]
    );

    const handleOpenWorkspace = async () => {
        try {
            await flushCurrentDocument();
        } catch (err) {
            console.error('[Sidebar] save before workspace switch failed:', err);
            window.alert('当前文件保存失败，无法切换工作区。');
            return;
        }
        const ws = await window.desktopAPI.workspace.open();
        if (ws) {
            setWorkspace(ws);
            useAppStore.setState({ currentFile: null, currentContent: '', isDirty: false });
            const updated = await window.desktopAPI.file.list(ws);
            if (updated) setFiles(updated);
        }
    };

    const handleNewFile = async () => {
        if (!workspace || !window.desktopAPI) return;
        const targetDir = activeDir ?? workspace;
        const name = requestName('新建 Markdown 文件', 'untitled.md');
        if (!name) return;
        try {
            const newPath = await window.desktopAPI.file.create(targetDir, name);
            await refreshFiles();
            await openDocument(newPath);
        } catch (err) {
            console.error('[Sidebar] create file failed:', err);
            window.alert('创建失败：名称可能已存在或不可用。');
        }
    };

    const handleNewFolder = async () => {
        if (!workspace || !window.desktopAPI) return;
        const targetDir = activeDir ?? workspace;
        const name = requestName('新建文件夹', '新文件夹');
        if (!name) return;
        try {
            await window.desktopAPI.file.createFolder(targetDir, name);
            await refreshFiles();
        } catch (err) {
            console.error('[Sidebar] create folder failed:', err);
            window.alert('创建失败：名称可能已存在或不可用。');
        }
    };

    const handleThemeToggle = () => {
        const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
        setTheme(next);
    };

    const themeIcon = theme === 'light' ? <SunIcon /> : theme === 'dark' ? <MoonIcon /> : <AutoIcon />;
    const themeLabel = theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统';

    return (
        <aside className={styles.sidebar}>
            {/* macOS Traffic Lights 空间 */}
            <div className={styles.trafficArea} />

            {/* 工具栏 */}
            <div className={styles.toolbar}>
                <span className={styles.toolbarTitle}>
                    {workspace ? workspace.split('/').pop() : '简记'}
                </span>
                <div className={styles.toolbarActions}>
                    <button
                        className={styles.iconBtn}
                        data-tooltip="使用说明 / 设置 (⌘,)"
                        onClick={openSettings}
                    >
                        <SettingsIcon />
                    </button>
                    <button
                        className={styles.iconBtn}
                        data-tooltip={`切换主题 (${themeLabel})`}
                        onClick={handleThemeToggle}
                    >
                        {themeIcon}
                    </button>
                    <button
                        className={styles.iconBtn}
                        data-tooltip="新建文件"
                        onClick={handleNewFile}
                        disabled={!workspace}
                    >
                        <NewFileIcon />
                    </button>
                    <button
                        className={styles.iconBtn}
                        data-tooltip="新建文件夹"
                        onClick={handleNewFolder}
                        disabled={!workspace}
                    >
                        <NewFolderIcon />
                    </button>
                    <button
                        className={styles.iconBtn}
                        data-tooltip="打开工作区"
                        onClick={handleOpenWorkspace}
                    >
                        <OpenFolderIcon />
                    </button>
                </div>
            </div>

            {/* 文件列表（也是根目录 drop zone） */}
            <div
                className={`${styles.fileList} ${rootDragOver ? styles.rootDropTarget : ''}`}
                onDragOver={(e) => {
                    if (!workspace) return;
                    if (!e.dataTransfer.types.includes('application/x-file-path')) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (!rootDragOver) setRootDragOver(true);
                }}
                onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setRootDragOver(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setRootDragOver(false);
                    if (!workspace) return;
                    const srcPath = e.dataTransfer.getData('application/x-file-path');
                    if (srcPath) handleMoveFile(srcPath, workspace);
                }}
            >
                {!workspace ? (
                    <div className={styles.emptyState}>
                        <span>尚未选择工作区</span>
                        <button className={styles.emptyBtn} onClick={handleOpenWorkspace}>
                            选择文件夹
                        </button>
                    </div>
                ) : (
                    <>
                        {files.map((node) =>
                            node.type === 'folder' ? (
                                <Folder
                                    key={node.path}
                                    folder={node}
                                    depth={0}
                                    renamingPath={renamingPath}
                                    onRenameConfirm={handleRenameConfirm}
                                    onRenameCancel={handleRenameCancel}
                                    onMoveFile={handleMoveFile}
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
        </aside>
    );
}
