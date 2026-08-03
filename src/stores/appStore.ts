import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  AppStore,
  ExplorerSelection,
  ExplorerSortMode,
  SortDirection,
  ViewMode,
  Theme,
} from '@/types/state';
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
        selectedEntry: null,
        expandedPaths: [],

        viewMode: 'edit' as ViewMode,
        theme: 'auto' as Theme,
        sidebarVisible: true,
        settingsOpen: false,
        explorerSortMode: 'name' as ExplorerSortMode,
        explorerSortDirection: 'asc' as SortDirection,

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
          set((state) => {
            state.files = files;
            if (state.selectedEntry && !findNode(files, state.selectedEntry.path)) {
              state.selectedEntry = null;
            }
          });
        },

        addRecentFile(path: string) {
          set((state) => {
            const filtered = state.recentFiles.filter((p) => p !== path);
            state.recentFiles = [path, ...filtered].slice(0, MAX_RECENT_FILES);
          });
        },

        setSelectedEntry(entry: ExplorerSelection | null) {
          set((state) => { state.selectedEntry = entry; });
        },

        setFolderExpanded(path: string, expanded: boolean) {
          set((state) => {
            const values = new Set(state.expandedPaths);
            if (expanded) values.add(path);
            else values.delete(path);
            state.expandedPaths = Array.from(values);
          });
        },

        revealEntry(path: string, ancestors: string[]) {
          set((state) => {
            const values = new Set(state.expandedPaths);
            for (const ancestor of ancestors) values.add(ancestor);
            state.expandedPaths = Array.from(values);
            const node = findNode(state.files, path);
            state.selectedEntry = node ? { path, kind: node.type } : null;
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

        setExplorerSort(mode: ExplorerSortMode, direction: SortDirection) {
          set((state) => {
            state.explorerSortMode = mode;
            state.explorerSortDirection = direction;
          });
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
          explorerSortMode: state.explorerSortMode,
          explorerSortDirection: state.explorerSortDirection,
        }),
      }
    )
  )
);

function findNode(nodes: FileNode[], targetPath: string): FileNode | undefined {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    const nested = node.children ? findNode(node.children, targetPath) : undefined;
    if (nested) return nested;
  }
  return undefined;
}
