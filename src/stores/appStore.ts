import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { AppStore, ViewMode, Theme } from '@/types/state';
import type { FileNode } from '@/types/file';

const MAX_RECENT_FILES = 10;

export const useAppStore = create<AppStore>()(
  immer(
    persist(
      (set) => ({
        // ── 初始状态 ──
        currentFile: null,
        currentContent: '',
        isDirty: false,
        files: [],
        recentFiles: [],

        viewMode: 'edit' as ViewMode,
        theme: 'auto' as Theme,
        sidebarVisible: true,
        settingsOpen: false,

        workspace: null,

        // ── Actions ──
        setCurrentFile(path: string, content: string) {
          set((state) => {
            state.currentFile = path;
            state.currentContent = content;
            state.isDirty = false;
          });
        },

        setContent(content: string) {
          set((state) => {
            state.currentContent = content;
            state.isDirty = true;
          });
        },

        markSaved() {
          set((state) => { state.isDirty = false; });
        },

        markDirty() {
          set((state) => { state.isDirty = true; });
        },

        setFiles(files: FileNode[]) {
          set((state) => { state.files = files; });
        },

        addRecentFile(path: string) {
          set((state) => {
            const filtered = state.recentFiles.filter((p) => p !== path);
            state.recentFiles = [path, ...filtered].slice(0, MAX_RECENT_FILES);
          });
        },

        switchMode(mode: ViewMode) {
          set((state) => { state.viewMode = mode; });
        },

        setTheme(theme: Theme) {
          set((state) => { state.theme = theme; });
        },

        toggleSidebar() {
          set((state) => { state.sidebarVisible = !state.sidebarVisible; });
        },

        setSidebarVisible(visible: boolean) {
          set((state) => { state.sidebarVisible = visible; });
        },

        openSettings() {
          set((state) => { state.settingsOpen = true; });
        },

        closeSettings() {
          set((state) => { state.settingsOpen = false; });
        },

        setWorkspace(path: string) {
          set((state) => { state.workspace = path; });
        },
      }),
      {
        name: 'md-manage-ui-state',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          theme: state.theme,
          sidebarVisible: state.sidebarVisible,
          workspace: state.workspace,
          recentFiles: state.recentFiles,
        }),
      }
    )
  )
);
