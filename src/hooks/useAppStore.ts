/**
 * 细粒度 selector hooks — 避免组件因无关状态变化重渲染
 */
import { useAppStore as useStore } from '@/stores/appStore';

// ── 文件状态 ──
export const useCurrentFile = () => useStore((s) => s.currentFile);
export const useCurrentContent = () => useStore((s) => s.currentContent);
export const useIsDirty = () => useStore((s) => s.isDirty);
export const useFiles = () => useStore((s) => s.files);
export const useRecentFiles = () => useStore((s) => s.recentFiles);

// ── UI 状态 ──
export const useViewMode = () => useStore((s) => s.viewMode);
export const useTheme = () => useStore((s) => s.theme);
export const useSidebarVisible = () => useStore((s) => s.sidebarVisible);
export const useSettingsOpen = () => useStore((s) => s.settingsOpen);

// ── 工作区 ──
export const useWorkspace = () => useStore((s) => s.workspace);

// ── Actions ──
export const useFileActions = () =>
  useStore((s) => ({
    setCurrentFile: s.setCurrentFile,
    setContent: s.setContent,
    markSaved: s.markSaved,
    markDirty: s.markDirty,
    setFiles: s.setFiles,
    addRecentFile: s.addRecentFile,
  }));

export const useUIActions = () =>
  useStore((s) => ({
    switchMode: s.switchMode,
    setTheme: s.setTheme,
    toggleSidebar: s.toggleSidebar,
    setSidebarVisible: s.setSidebarVisible,
    openSettings: s.openSettings,
    closeSettings: s.closeSettings,
  }));

export const useWorkspaceActions = () =>
  useStore((s) => ({ setWorkspace: s.setWorkspace }));

export { useStore as useAppStore };
