import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  useUIActions,
  useSidebarVisible,
  useSettingsOpen,
  useViewMode,
  useCurrentFile,
  useIsDirty,
} from '@/hooks/useAppStore';
import type { Theme } from '@/types/state';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { EditorArea } from '@/components/editor/EditorArea';
import { MarkdownRenderer } from '@/components/reader/MarkdownRenderer';
import { ModeSwitch } from '@/components/editor/ModeSwitch';
import { flushCurrentDocument } from '@/services/documentSession';

// 主题应用到 <html> 的 data-theme 属性（带平滑过渡）
function applyTheme(theme: Theme, systemDark: boolean) {
  const resolved = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  if (current && current !== resolved) {
    root.classList.add('theme-transitioning');
    requestAnimationFrame(() => {
      root.setAttribute('data-theme', resolved);
      setTimeout(() => root.classList.remove('theme-transitioning'), 250);
    });
  } else {
    root.setAttribute('data-theme', resolved);
  }
}

function isSameOrDescendant(candidate: string, parent: string): boolean {
  return candidate === parent
    || candidate.startsWith(`${parent}/`)
    || candidate.startsWith(`${parent}\\`);
}

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const workspace = useAppStore((s) => s.workspace);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const setFiles = useAppStore((s) => s.setFiles);
  const sidebarVisible = useSidebarVisible();
  const settingsOpen = useSettingsOpen();
  const viewMode = useViewMode();
  const currentFile = useCurrentFile();
  const isDirty = useIsDirty();
  const { openSettings, switchMode } = useUIActions();

  // 监听系统深色模式
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(theme, mq.matches);

    const handler = (e: MediaQueryListEvent) => applyTheme(theme, e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // 恢复上次工作区
  useEffect(() => {
    async function restoreWorkspace() {
      if (!window.desktopAPI) return;
      try {
        const savedPath = await window.desktopAPI.workspace.get();
        if (savedPath && savedPath !== workspace) {
          setWorkspace(savedPath);
        }
        const targetPath = savedPath ?? workspace;
        if (targetPath) {
          const files = await window.desktopAPI.file.list(targetPath);
          setFiles(files);
        }
      } catch (err) {
        console.error('[App] workspace restore failed:', err);
      }
    }
    restoreWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听文件变更（Rust notify watcher 通过 Tauri event 推送）
  useEffect(() => {
    if (!window.desktopAPI) return;
    const unsubscribe = window.desktopAPI.onFileChanged(async () => {
      const target = workspace;
      if (!target) return;
      try {
        const files = await window.desktopAPI.file.list(target);
        setFiles(files);
      } catch (err) {
        console.error('[App] file refresh failed:', err);
      }
    });
    return unsubscribe;
  }, [workspace, setFiles]);

  // 全局快捷键
  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        if (!target?.closest('input, textarea, [contenteditable="true"], [role="dialog"]')) {
          useAppStore.getState().setSelectedEntry(null);
        }
        return;
      }

      // Cmd+, → 打开设置
      if (mod && e.key === ',') {
        e.preventDefault();
        openSettings();
        return;
      }

      // Cmd+E → 切换 READ/EDIT 模式
      if (mod && e.key === 'e') {
        e.preventDefault();
        if (!currentFile) return;
        if (viewMode === 'edit' && isDirty) {
          try {
            await flushCurrentDocument();
          } catch (err) {
            console.error('[App] save before mode switch failed:', err);
            window.alert('保存失败，无法切换到阅读模式。');
            return;
          }
        }
        switchMode(viewMode === 'edit' ? 'read' : 'edit');
        return;
      }

      // Cmd+Backspace / Cmd+Delete → 删除当前文件
      // 仅在焦点不在编辑器（CodeMirror）/输入框内时触发
      if (mod && (e.key === 'Backspace' || e.key === 'Delete')) {
        const target = e.target as HTMLElement | null;
        const inEditable =
          target?.closest('.cm-editor') ||
          target?.closest('input, textarea, [contenteditable="true"]');
        if (inEditable) return;
        const state = useAppStore.getState();
        const targetPath = state.selectedEntry?.path ?? currentFile;
        if (!targetPath) return;
        e.preventDefault();
        const label = targetPath.split(/[\\/]/).pop() ?? targetPath;
        if (!window.confirm(`确定将“${label}”移到废纸篓吗？`)) return;
        try {
          if (currentFile && isSameOrDescendant(currentFile, targetPath)) {
            await flushCurrentDocument();
          }
          await window.desktopAPI?.file.delete(targetPath);
          useAppStore.setState({
            selectedEntry: null,
            ...(currentFile && isSameOrDescendant(currentFile, targetPath)
              ? { currentFile: null, currentContent: '', isDirty: false }
              : {}),
          });
        } catch (err) {
          console.error('[App] delete failed:', err);
          window.alert('无法移到废纸篓，文件没有被删除。');
        }
        return;
      }

      // Enter → 重命名当前文件（仅在焦点不在编辑器/输入框时）
      if (!mod && e.key === 'Enter') {
        const target = e.target as HTMLElement | null;
        const inEditable =
          target?.closest('.cm-editor') ||
          target?.closest('input, textarea, [contenteditable="true"]') ||
          target?.tagName === 'BUTTON';
        if (inEditable) return;
        const targetPath = useAppStore.getState().selectedEntry?.path ?? currentFile;
        if (!targetPath) return;
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent('md-manage:rename', { detail: { path: targetPath } })
        );
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSettings, switchMode, viewMode, currentFile, isDirty]);

  // 与主进程进行关闭握手，确保 debounce 中的内容先写入磁盘。
  useEffect(() => {
    if (!window.desktopAPI?.onBeforeClose) return;
    return window.desktopAPI.onBeforeClose(async () => {
      try {
        await flushCurrentDocument();
        await window.desktopAPI.window.confirmClose();
      } catch (err) {
        console.error('[App] save before close failed:', err);
        const discard = window.confirm('保存失败。是否放弃未保存的修改并关闭窗口？');
        if (discard) await window.desktopAPI.window.confirmClose();
      }
    });
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {sidebarVisible && <Sidebar />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ModeSwitch />
        {viewMode === 'edit' ? <EditorArea /> : <MarkdownRenderer />}
      </div>

      {settingsOpen && <SettingsPanel />}
    </div>
  );
}
