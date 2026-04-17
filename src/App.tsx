import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  useUIActions,
  useSidebarVisible,
  useSettingsOpen,
  useViewMode,
  useCurrentFile,
  useCurrentContent,
  useIsDirty,
} from '@/hooks/useAppStore';
import type { Theme } from '@/types/state';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { EditorArea } from '@/components/editor/EditorArea';
import { MarkdownRenderer } from '@/components/reader/MarkdownRenderer';
import { SearchModal } from '@/components/search/SearchModal';
import { HistoryPanel } from '@/components/history/HistoryPanel';

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

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const workspace = useAppStore((s) => s.workspace);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const setFiles = useAppStore((s) => s.setFiles);
  const sidebarVisible = useSidebarVisible();
  const settingsOpen = useSettingsOpen();
  const viewMode = useViewMode();
  const currentFile = useCurrentFile();
  const currentContent = useCurrentContent();
  const isDirty = useIsDirty();
  const { openSettings, switchMode } = useUIActions();
  const markSaved = useAppStore((s) => s.markSaved);
  const openSearch = useAppStore((s) => s.openSearch);
  const openHistory = useAppStore((s) => s.openHistory);

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
      if (!window.electronAPI) return;
      try {
        const savedPath = await window.electronAPI.workspace.get();
        if (savedPath && savedPath !== workspace) {
          setWorkspace(savedPath);
        }
        const targetPath = savedPath ?? workspace;
        if (targetPath) {
          const files = await window.electronAPI.file.list(targetPath);
          setFiles(files);
        }
      } catch (err) {
        console.error('[App] workspace restore failed:', err);
      }
    }
    restoreWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听文件变更（主进程 chokidar 推送）
  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubscribe = window.electronAPI.onFileChanged(async () => {
      const target = workspace;
      if (!target) return;
      try {
        const files = await window.electronAPI.file.list(target);
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

      // Cmd+, → 打开设置
      if (mod && e.key === ',') {
        e.preventDefault();
        openSettings();
        return;
      }

      // Cmd+P → 快速搜索
      if (mod && e.key === 'p') {
        e.preventDefault();
        openSearch();
        return;
      }

      // Cmd+Shift+H → 版本历史
      if (mod && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        if (currentFile) openHistory();
        return;
      }

      // Cmd+E → 切换 READ/EDIT 模式
      if (mod && e.key === 'e') {
        e.preventDefault();
        if (!currentFile) return;
        // 切换到阅读模式前先保存
        if (viewMode === 'edit' && isDirty) {
          try {
            await window.electronAPI?.file.write(currentFile, currentContent);
            markSaved();
          } catch (err) {
            console.error('[App] save before mode switch failed:', err);
          }
        }
        switchMode(viewMode === 'edit' ? 'read' : 'edit');
        return;
      }

      // Cmd+Shift+E → 导出（在阅读模式下触发 PDF 导出）
      if (mod && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        // ExportBar 内部处理
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSettings, openSearch, openHistory, switchMode, viewMode, currentFile, currentContent, isDirty, markSaved]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* 侧边栏 */}
      {sidebarVisible && <Sidebar />}

      {/* 主内容区：按模式切换编辑器/阅读器 */}
      {viewMode === 'edit' ? <EditorArea /> : <MarkdownRenderer />}

      {/* 设置面板（全屏遮罩） */}
      {settingsOpen && <SettingsPanel />}

      {/* 搜索弹窗 */}
      <SearchModal />

      {/* 版本历史侧边抽屉 */}
      <HistoryPanel />
    </div>
  );
}
