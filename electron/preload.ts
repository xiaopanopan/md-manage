import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API（白名单模式）
contextBridge.exposeInMainWorld('electronAPI', {
  // ── 文件系统 ─────────────────────────────────────────────
  file: {
    read: (filePath: string) =>
      ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: string) =>
      ipcRenderer.invoke('file:write', filePath, content),
    delete: (filePath: string) =>
      ipcRenderer.invoke('file:delete', filePath),
    rename: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('file:rename', oldPath, newPath),
    list: (dir: string) =>
      ipcRenderer.invoke('file:list', dir),
    create: (dir: string, name: string) =>
      ipcRenderer.invoke('file:create', dir, name),
  },

  // ── 工作区 ────────────────────────────────────────────────
  workspace: {
    open: () => ipcRenderer.invoke('workspace:open'),
    get: () => ipcRenderer.invoke('workspace:get'),
    init: (workspacePath: string) => ipcRenderer.invoke('workspace:init', workspacePath),
  },

  // ── 配置 ──────────────────────────────────────────────────
  config: {
    get: (key?: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
  },

  // ── 图片 ──────────────────────────────────────────────────
  image: {
    save: (buffer: number[], ext: string) =>
      ipcRenderer.invoke('image:save', buffer, ext),
    getAbsPath: (relativePath: string) =>
      ipcRenderer.invoke('image:getAbsPath', relativePath),
  },

  // ── 导出 ──────────────────────────────────────────────────
  export: {
    pdf: (htmlContent: string) =>
      ipcRenderer.invoke('export:pdf', htmlContent),
    html: (markdownContent: string) =>
      ipcRenderer.invoke('export:html', markdownContent),
  },

  // ── 导入 ──────────────────────────────────────────────────
  import: {
    files: (destDir?: string) => ipcRenderer.invoke('import:files', destDir),
    folder: (destDir?: string) => ipcRenderer.invoke('import:folder', destDir),
    drop: (srcPaths: string[], destDir: string) =>
      ipcRenderer.invoke('import:drop', srcPaths, destDir),
  },

  // ── 右键菜单 ──────────────────────────────────────────────
  contextMenu: {
    show: (type: 'file' | 'editor', data: Record<string, string>) =>
      ipcRenderer.invoke('contextMenu:show', type, data),
  },

  // ── 窗口控制 ──────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    setFullscreen: (flag: boolean) => ipcRenderer.invoke('window:setFullscreen', flag),
    isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // ── 主进程推送事件 ────────────────────────────────────────
  onFileChanged: (callback: (info: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: unknown) =>
      callback(info);
    ipcRenderer.on('file:changed', handler);
    return () => ipcRenderer.removeListener('file:changed', handler);
  },

  // 菜单动作回调（主进程 → 渲染进程）
  onMenuAction: (callback: (action: { type: string; payload: Record<string, string> }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: { type: string; payload: Record<string, string> }) =>
      callback(action);
    ipcRenderer.on('menu:action', handler);
    return () => ipcRenderer.removeListener('menu:action', handler);
  },
});
