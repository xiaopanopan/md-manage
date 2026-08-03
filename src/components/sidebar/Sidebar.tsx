import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FileNode } from '@/types/file';
import type { MenuAction } from '@/types/ipc';
import {
    useExplorerSort,
    useFiles,
    useSelectedEntry,
    useWorkspace,
} from '@/hooks/useAppStore';
import { useAppStore } from '@/stores/appStore';
import { Folder } from './Folder';
import { FileItem } from './FileItem';
import { flushCurrentDocument, openDocument } from '@/services/documentSession';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { sortFileTree } from '@/lib/explorer/sortFileTree';
import {
    findAncestorFolders,
    findNode,
    relativeDisplayPath,
    resolveCreateTarget,
    suggestAvailableName,
} from '@/lib/explorer/tree';
import styles from './Sidebar.module.css';

function isSameOrDescendant(candidate: string, parent: string): boolean {
    if (candidate === parent) return true;
    return candidate.startsWith(`${parent}/`) || candidate.startsWith(`${parent}\\`);
}

function remapPath(candidate: string, oldPath: string, newPath: string): string {
    if (!isSameOrDescendant(candidate, oldPath)) return candidate;
    return `${newPath}${candidate.slice(oldPath.length)}`;
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

const SortIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 4h7M3 8h5M3 12h3M11 7v6M9 11l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
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
    const selectedEntry = useSelectedEntry();
    const explorerSort = useExplorerSort();

    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [rootDragOver, setRootDragOver] = useState(false);
    const [creating, setCreating] = useState<{
        kind: 'file' | 'folder';
        targetDir: string;
    } | null>(null);
    const [lastMove, setLastMove] = useState<{
        newPath: string;
        oldParent: string;
        label: string;
    } | null>(null);

    const sortedFiles = useMemo(
        () => sortFileTree(files, explorerSort.mode, explorerSort.direction),
        [files, explorerSort.mode, explorerSort.direction]
    );

    // 拖拽全局结束 → 清除根目录高亮
    useEffect(() => {
        const clear = () => setRootDragOver(false);
        window.addEventListener('dragend', clear);
        return () => window.removeEventListener('dragend', clear);
    }, []);

    useEffect(() => {
        if (!lastMove) return;
        const timer = setTimeout(() => setLastMove(null), 6000);
        return () => clearTimeout(timer);
    }, [lastMove]);

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
            const isRoot = payload.isRoot === 'true';
            useAppStore.getState().setSelectedEntry(
                isRoot ? null : { path: targetPath, kind: isFolder ? 'folder' : 'file' }
            );
            // 目标所在的目录（右键文件 → 文件父目录，右键文件夹 → 该文件夹）
            const contextDir = isFolder
                ? targetPath
                : payload.parentPath;

            switch (type) {
                case 'delete': {
                    const label = targetPath.split(/[\\/]/).pop() ?? targetPath;
                    if (!window.confirm(`确定将“${label}”移到废纸篓吗？`)) break;
                    try {
                        const opened = useAppStore.getState().currentFile;
                        if (opened && isSameOrDescendant(opened, targetPath)) {
                            await flushCurrentDocument();
                        }
                        await window.desktopAPI.file.delete(targetPath);
                        if (opened && isSameOrDescendant(opened, targetPath)) {
                            useAppStore.setState({ currentFile: null, currentContent: '', isDirty: false });
                        }
                        useAppStore.getState().setSelectedEntry(null);
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
                    setCreating({ kind: 'file', targetDir: contextDir });
                    break;
                }
                case 'newFolder': {
                    setCreating({ kind: 'folder', targetDir: contextDir });
                    break;
                }
            }
        });
        return unsub;
    }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshFiles = useCallback(async () => {
        if (!workspace || !window.desktopAPI) return [] as FileNode[];
        try {
            const updated = await window.desktopAPI.file.list(workspace);
            setFiles(updated);
            return updated;
        } catch (e) {
            console.error('[Sidebar] refreshFiles failed:', e);
            return [] as FileNode[];
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
                    selectedEntry: state.selectedEntry
                        ? { ...state.selectedEntry, path: remapPath(state.selectedEntry.path, file.path, newPath) }
                        : null,
                    expandedPaths: state.expandedPaths.map((p) => remapPath(p, file.path, newPath)),
                });
                const updated = await refreshFiles();
                useAppStore.getState().revealEntry(newPath, findAncestorFolders(updated, newPath));
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

            const source = findNode(files, srcPath);
            if (!source || source.parentPath === destDir) return;
            const destinationName = destDir === workspace
                ? '工作区根目录'
                : findNode(files, destDir)?.name ?? destDir.split(/[\\/]/).pop() ?? destDir;
            if (!window.confirm(`确定将“${source.name}”移动到“${destinationName}”吗？`)) return;

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
                    selectedEntry: state.selectedEntry
                        ? { ...state.selectedEntry, path: remapPath(state.selectedEntry.path, srcPath, newPath) }
                        : null,
                    expandedPaths: state.expandedPaths.map((p) => remapPath(p, srcPath, newPath)),
                });
                const updated = await refreshFiles();
                useAppStore.getState().revealEntry(newPath, findAncestorFolders(updated, newPath));
                setLastMove({ newPath, oldParent: source.parentPath, label: source.name });
            } catch (err) {
                console.error('[Sidebar] move failed:', err);
                window.alert('移动失败：目标位置可能已有同名项目。');
            }
        },
        [files, refreshFiles, workspace]
    );

    const handleUndoMove = useCallback(async () => {
        if (!lastMove) return;
        try {
            const state = useAppStore.getState();
            const current = state.currentFile;
            if (current && isSameOrDescendant(current, lastMove.newPath)) {
                await flushCurrentDocument();
            }
            const restoredPath = await window.desktopAPI.file.move(lastMove.newPath, lastMove.oldParent);
            useAppStore.setState({
                currentFile: current ? remapPath(current, lastMove.newPath, restoredPath) : null,
                recentFiles: state.recentFiles.map((p) => remapPath(p, lastMove.newPath, restoredPath)),
                selectedEntry: state.selectedEntry
                    ? { ...state.selectedEntry, path: remapPath(state.selectedEntry.path, lastMove.newPath, restoredPath) }
                    : null,
                expandedPaths: state.expandedPaths.map((p) => remapPath(p, lastMove.newPath, restoredPath)),
            });
            const updated = await refreshFiles();
            useAppStore.getState().revealEntry(restoredPath, findAncestorFolders(updated, restoredPath));
            setLastMove(null);
        } catch (error) {
            console.error('[Sidebar] undo move failed:', error);
            window.alert('撤销移动失败：原位置可能已有同名项目。');
        }
    }, [lastMove, refreshFiles]);

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
            useAppStore.setState({
                currentFile: null,
                currentContent: '',
                isDirty: false,
                selectedEntry: null,
                expandedPaths: [],
            });
            const updated = await window.desktopAPI.file.list(ws);
            if (updated) setFiles(updated);
        }
    };

    const handleNewFile = () => {
        if (!workspace || !window.desktopAPI) return;
        const targetDir = resolveCreateTarget(workspace, selectedEntry, files);
        setCreating({ kind: 'file', targetDir });
    };

    const handleNewFolder = () => {
        if (!workspace || !window.desktopAPI) return;
        const targetDir = resolveCreateTarget(workspace, selectedEntry, files);
        setCreating({ kind: 'folder', targetDir });
    };

    const handleCreateConfirm = async (name: string) => {
        if (!creating) return;
        let newPath: string;
        if (creating.kind === 'file') {
            newPath = await window.desktopAPI.file.create(creating.targetDir, name);
            const updated = await refreshFiles();
            useAppStore.getState().revealEntry(newPath, findAncestorFolders(updated, newPath));
            await openDocument(newPath);
        } else {
            newPath = await window.desktopAPI.file.createFolder(creating.targetDir, name);
            const updated = await refreshFiles();
            useAppStore.getState().revealEntry(newPath, findAncestorFolders(updated, newPath));
        }
        setCreating(null);
    };

    const handleThemeToggle = () => {
        const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
        setTheme(next);
    };

    const themeIcon = theme === 'light' ? <SunIcon /> : theme === 'dark' ? <MoonIcon /> : <AutoIcon />;
    const themeLabel = theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统';

    return (
        <aside className={styles.sidebar}>
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
                    <label className={styles.sortControl} data-tooltip="文件排序">
                        <SortIcon />
                        <select
                            aria-label="文件排序"
                            value={`${explorerSort.mode}:${explorerSort.direction}`}
                            onChange={(event) => {
                                const [mode, direction] = event.target.value.split(':') as [
                                    'name' | 'modified' | 'type',
                                    'asc' | 'desc',
                                ];
                                useAppStore.getState().setExplorerSort(mode, direction);
                            }}
                        >
                            <option value="name:asc">名称升序</option>
                            <option value="name:desc">名称降序</option>
                            <option value="modified:desc">最近修改</option>
                            <option value="type:asc">文件类型</option>
                        </select>
                    </label>
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
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        useAppStore.getState().setSelectedEntry(null);
                    }
                }}
                onContextMenu={(event) => {
                    if (!workspace || event.target !== event.currentTarget) return;
                    event.preventDefault();
                    window.desktopAPI.contextMenu.show('file', {
                        path: workspace,
                        parentPath: workspace,
                        isFolder: 'true',
                        isRoot: 'true',
                    });
                }}
                onDragOver={(e) => {
                    if (!workspace) return;
                    if (e.target !== e.currentTarget) return;
                    if (!e.dataTransfer.types.includes('application/x-file-path')) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (!rootDragOver) setRootDragOver(true);
                }}
                onDragLeave={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setRootDragOver(false);
                }}
                onDrop={(e) => {
                    if (e.target !== e.currentTarget) return;
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
                        {sortedFiles.map((node) =>
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
            {creating && (
                <CreateDialog
                    kind={creating.kind}
                    initialName={suggestAvailableName(creating.kind, creating.targetDir, files)}
                    targetLabel={relativeDisplayPath(workspace ?? '', creating.targetDir)}
                    onConfirm={handleCreateConfirm}
                    onCancel={() => setCreating(null)}
                />
            )}
            {lastMove && (
                <div className={styles.toast} role="status">
                    <span>已移动“{lastMove.label}”</span>
                    <button type="button" onClick={handleUndoMove}>撤销</button>
                </div>
            )}
        </aside>
    );
}
