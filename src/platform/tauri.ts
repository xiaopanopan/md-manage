import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Menu, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import type { DesktopAPI, MenuAction } from '@/types/ipc';

const menuListeners = new Set<(action: MenuAction) => void>();

function emitMenuAction(type: MenuAction['type'], payload: Record<string, string>) {
  for (const listener of menuListeners) listener({ type, payload });
}

async function showFileMenu(data: Record<string, string>) {
  const action = (type: MenuAction['type']) => () => emitMenuAction(type, data);
  const items = await Promise.all([
    MenuItem.new({ text: '新建文件', action: action('newFile') }),
    MenuItem.new({ text: '新建子文件夹', action: action('newFolder') }),
    PredefinedMenuItem.new({ item: 'Separator' }),
    MenuItem.new({ text: '重命名', accelerator: 'CmdOrCtrl+Enter', action: action('rename') }),
    MenuItem.new({
      text: '在文件夹中打开',
      accelerator: 'CmdOrCtrl+Shift+O',
      action: () => void revealItemInDir(data.path),
    }),
    PredefinedMenuItem.new({ item: 'Separator' }),
    MenuItem.new({ text: '删除', action: action('delete') }),
  ]);
  const menu = await Menu.new({ items });
  await menu.popup();
  await menu.close();
}

async function showEditorMenu() {
  const items = await Promise.all([
    PredefinedMenuItem.new({ item: 'Cut', text: '剪切' }),
    PredefinedMenuItem.new({ item: 'Copy', text: '复制' }),
    PredefinedMenuItem.new({ item: 'Paste', text: '粘贴' }),
    PredefinedMenuItem.new({ item: 'Separator' }),
    PredefinedMenuItem.new({ item: 'SelectAll', text: '全选' }),
  ]);
  const menu = await Menu.new({ items });
  await menu.popup();
  await menu.close();
}

const appWindow = getCurrentWindow();

export const tauriDesktop: DesktopAPI = {
  file: {
    read: (path) => invoke('read_document', { path }),
    write: (path, content) => invoke('write_document', { path, content }),
    delete: (path) => invoke('trash_entry', { path }),
    rename: (path, newName) => invoke('rename_entry', { path, newName }),
    move: (path, destination) => invoke('move_entry', { path, destination }),
    list: (path) => invoke('list_entries', { path }),
    create: (dir, name) => invoke('create_document', { dir, name }),
    createFolder: (dir, name) => invoke('create_folder', { dir, name }),
  },
  workspace: {
    async open() {
      const selected = await open({ directory: true, multiple: false, title: '选择工作区文件夹' });
      if (!selected || Array.isArray(selected)) return null;
      return invoke('set_workspace', { path: selected });
    },
    get: () => invoke('get_workspace'),
    init: (path) => invoke('set_workspace', { path }).then(() => undefined),
  },
  config: {
    get: (key) => invoke('get_config', { key }),
    set: (key, value) => invoke('set_config', { key, value }),
  },
  image: {
    save: (buffer, extension) => invoke('save_image', { bytes: buffer, extension }),
    getAbsPath: async (relativePath) => relativePath,
  },
  export: {
    async pdf(_htmlContent) {
      // RISK(TAURI-PDF): system WebViews have no cross-platform printToPDF equivalent.
      // The migration baseline intentionally uses the native print dialog.
      window.print();
    },
    async html(htmlContent) {
      const path = await save({
        title: '导出 HTML',
        defaultPath: 'document.html',
        filters: [{ name: 'HTML 文件', extensions: ['html'] }],
      });
      if (path) await invoke('write_export', { path, content: htmlContent });
    },
  },
  import: {
    async files(destination) {
      const selected = await open({
        multiple: true,
        directory: false,
        title: '导入 Markdown 文件',
        filters: [{ name: 'Markdown 文件', extensions: ['md', 'markdown'] }],
      });
      if (!selected) return [];
      const sourcePaths = Array.isArray(selected) ? selected : [selected];
      const target = destination ?? (await invoke<string | null>('get_workspace'));
      if (!target) return [];
      return invoke('import_paths', { sourcePaths, destination: target });
    },
    async folder(destination) {
      const selected = await open({ directory: true, multiple: false, title: '导入文件夹' });
      if (!selected || Array.isArray(selected)) return [];
      const target = destination ?? (await invoke<string | null>('get_workspace'));
      if (!target) return [];
      return invoke('import_paths', { sourcePaths: [selected], destination: target });
    },
    drop: (sourcePaths, destination) =>
      invoke('import_paths', { sourcePaths, destination }),
  },
  contextMenu: {
    show: (type, data) => (type === 'file' ? showFileMenu(data) : showEditorMenu()),
  },
  window: {
    minimize: () => appWindow.minimize(),
    maximize: () => appWindow.toggleMaximize(),
    close: () => appWindow.close(),
    setFullscreen: (flag) => appWindow.setFullscreen(flag),
    isFullscreen: () => appWindow.isFullscreen(),
    isMaximized: () => appWindow.isMaximized(),
    confirmClose: () => appWindow.destroy(),
  },
  shell: {
    async openExternal(url) {
      const parsed = new URL(url);
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        throw new Error('UNSUPPORTED_EXTERNAL_URL');
      }
      await openUrl(parsed);
    },
  },
  onFileChanged(callback) {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen('workspace:file-changed', (event) => callback(event.payload)).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  },
  onMenuAction(callback) {
    menuListeners.add(callback);
    return () => menuListeners.delete(callback);
  },
  onBeforeClose(callback) {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void appWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      await callback();
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  },
};

window.desktopAPI = tauriDesktop;
