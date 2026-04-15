import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API（白名单模式）
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统
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

  // 工作区
  workspace: {
    open: () => ipcRenderer.invoke('workspace:open'),
    get: () => ipcRenderer.invoke('workspace:get'),
    init: (workspacePath: string) => ipcRenderer.invoke('workspace:init', workspacePath),
  },

  // 配置
  config: {
    get: (key?: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
  },

  // 文件变更事件（主进程推送）
  onFileChanged: (callback: (info: unknown) => void) => {
    ipcRenderer.on('file:changed', (_event, info) => callback(info));
    return () => ipcRenderer.removeAllListeners('file:changed');
  },
});
