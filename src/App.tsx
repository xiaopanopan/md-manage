import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useUIActions, useSidebarVisible, useSettingsOpen } from '@/hooks/useAppStore';
import type { Theme } from '@/types/state';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { EditorArea } from '@/components/editor/EditorArea';

// 主题应用到 <html> 的 data-theme 属性
function applyTheme(theme: Theme, systemDark: boolean) {
  const resolved = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const workspace = useAppStore((s) => s.workspace);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const setFiles = useAppStore((s) => s.setFiles);
  const sidebarVisible = useSidebarVisible();
  const settingsOpen = useSettingsOpen();
  const { openSettings } = useUIActions();

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
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Cmd+, → 打开设置
      if (mod && e.key === ',') {
        e.preventDefault();
        openSettings();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSettings]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* 侧边栏 */}
      {sidebarVisible && <Sidebar />}

      {/* 编辑器主区域 */}
      <EditorArea />

      {/* 设置面板（全屏遮罩） */}
      {settingsOpen && <SettingsPanel />}
    </div>
  );
}
