/**
 * 细粒度 selector hooks — 避免组件因无关状态变化重渲染
 * 用法：import { useCurrentFile, useViewMode } from '@/hooks/useAppStore'
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
export const useSearchOpen = () => useStore((s) => s.searchOpen);
export const useHistoryOpen = () => useStore((s) => s.historyOpen);
export const useSettingsOpen = () => useStore((s) => s.settingsOpen);

// ── 工作区 ──
export const useWorkspace = () => useStore((s) => s.workspace);

// ── Actions（稳定引用，不触发重渲染）──
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
    openSearch: s.openSearch,
    closeSearch: s.closeSearch,
    openHistory: s.openHistory,
    closeHistory: s.closeHistory,
    openSettings: s.openSettings,
    closeSettings: s.closeSettings,
  }));

export const useWorkspaceActions = () =>
  useStore((s) => ({ setWorkspace: s.setWorkspace }));

// 重新导出原始 store hook 供需要完整访问的场景使用
export { useStore as useAppStore };
