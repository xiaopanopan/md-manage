import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { getConfig, setConfig } from './config';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  modifiedAt: string;
  size?: number;
}

// 递归列出目录内容（仅 .md 文件 + 子目录）
async function listDir(dir: string): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    // 跳过隐藏文件和 .digitalzen 目录
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    const stat = await fs.stat(fullPath);

    if (entry.isDirectory()) {
      const children = await listDir(fullPath);
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'folder',
        children,
        modifiedAt: stat.mtime.toISOString(),
      });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size,
      });
    }
  }

  // 按修改时间倒序排列
  return nodes.sort((a, b) =>
    new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );
}

// 初始化工作区子目录
async function initWorkspace(workspacePath: string): Promise<void> {
  const dirs = [
    path.join(workspacePath, 'DRAFTS'),
    path.join(workspacePath, 'ARCHIVES'),
    path.join(workspacePath, '.digitalzen', 'images'),
    path.join(workspacePath, '.digitalzen', 'history'),
  ];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

export function registerFileSystemHandlers(): void {
  // 读取文件
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    return await fs.readFile(filePath, 'utf-8');
  });

  // 写入文件
  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  });

  // 删除文件（移到垃圾桶）
  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    await shell.trashItem(filePath);
  });

  // 重命名/移动文件
  ipcMain.handle('file:rename', async (_event, oldPath: string, newPath: string) => {
    await fs.rename(oldPath, newPath);
  });

  // 列出目录
  ipcMain.handle('file:list', async (_event, dir: string) => {
    return await listDir(dir);
  });

  // 创建新文件
  ipcMain.handle('file:create', async (_event, dir: string, name: string) => {
    const filePath = path.join(dir, name.endsWith('.md') ? name : `${name}.md`);
    await fs.writeFile(filePath, '', 'utf-8');
    return filePath;
  });

  // 打开工作区选择对话框
  ipcMain.handle('workspace:open', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: '选择工作区文件夹',
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const workspacePath = result.filePaths[0];
    await initWorkspace(workspacePath);
    setConfig('workspace', workspacePath);
    return workspacePath;
  });

  // 获取当前工作区
  ipcMain.handle('workspace:get', () => {
    return getConfig('workspace') as string | null;
  });

  // 初始化工作区目录
  ipcMain.handle('workspace:init', async (_event, workspacePath: string) => {
    await initWorkspace(workspacePath);
  });
}
