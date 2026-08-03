import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import chokidar, { FSWatcher } from 'chokidar';
import { getConfig, setConfig } from './config';
import { assertWorkspacePath } from '../services/workspaceGuard';

export interface FileNode {
  name: string;
  path: string;
  parentPath: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  modifiedAt: string;
  size?: number;
}

const MARKDOWN_EXTENSION = /\.(md|markdown)$/i;
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

function assertValidName(name: string): void {
  if (
    !name ||
    name === '.' ||
    name === '..' ||
    /[\\/\0]/.test(name) ||
    /[. ]$/.test(name) ||
    WINDOWS_RESERVED_NAME.test(name)
  ) {
    throw new Error('INVALID_NAME');
  }
}

async function assertTargetAvailable(targetPath: string): Promise<void> {
  try {
    await fs.access(targetPath);
    throw new Error(`ALREADY_EXISTS: ${targetPath}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

// ── 文件监听器 ──────────────────────────────────────────────
let watcher: FSWatcher | null = null;

export function startWatcher(workspacePath: string): void {
  stopWatcher();

  watcher = chokidar.watch(workspacePath, {
    ignored: [
      /(^|[/\\])\../, // 隐藏文件/目录
      /node_modules/,
    ],
    ignoreInitial: true,
    depth: 10,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const notify = (eventType: string, filePath: string) => {
    // 仅关注 .md 文件
    const isDirectoryEvent = eventType === 'addDir' || eventType === 'unlinkDir';
    if (!isDirectoryEvent && !MARKDOWN_EXTENSION.test(filePath)) return;
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send('file:changed', { type: eventType, path: filePath });
    }
  };

  watcher
    .on('add', (p) => notify('add', p))
    .on('change', (p) => notify('change', p))
    .on('unlink', (p) => notify('unlink', p))
    .on('addDir', (p) => notify('addDir', p))
    .on('unlinkDir', (p) => notify('unlinkDir', p))
    .on('error', (err) => console.error('[chokidar] error:', err));
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

// ── 工作区初始化 ───────────────────────────────────────────
async function initWorkspace(workspacePath: string): Promise<void> {
  await fs.mkdir(path.join(workspacePath, '.md-manage', 'images'), { recursive: true });
}

// ── 递归列出目录（仅 .md 文件 + 子目录）────────────────────
async function listDir(dir: string): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    const stat = await fs.stat(fullPath);

    if (entry.isDirectory()) {
      const children = await listDir(fullPath);
      nodes.push({
        name: entry.name,
        path: fullPath,
        parentPath: dir,
        type: 'folder',
        children,
        modifiedAt: stat.mtime.toISOString(),
      });
    } else if (entry.isFile() && MARKDOWN_EXTENSION.test(entry.name)) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        parentPath: dir,
        type: 'file',
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size,
      });
    }
  }

  return nodes.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );
}

// ── IPC Handler 注册 ───────────────────────────────────────
export function registerFileSystemHandlers(): void {
  // 文件 CRUD
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    return await fs.readFile(await assertWorkspacePath(filePath), 'utf-8');
  });

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    filePath = await assertWorkspacePath(filePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  });

  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    // 删除必须可恢复；废纸篓失败时将错误交给 UI，不再静默永久删除。
    await shell.trashItem(await assertWorkspacePath(filePath));
  });

  ipcMain.handle('file:rename', async (_event, oldPath: string, newName: string) => {
    oldPath = await assertWorkspacePath(oldPath);
    assertValidName(newName);
    const newPath = path.join(path.dirname(oldPath), newName);
    await assertWorkspacePath(newPath);
    await assertTargetAvailable(newPath);
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    await fs.rename(oldPath, newPath);
    return newPath;
  });

  ipcMain.handle('file:move', async (_event, sourcePath: string, destDir: string) => {
    sourcePath = await assertWorkspacePath(sourcePath);
    destDir = await assertWorkspacePath(destDir);
    const newPath = path.join(destDir, path.basename(sourcePath));
    if (newPath === sourcePath) return sourcePath;
    const relativeDest = path.relative(sourcePath, destDir);
    if (relativeDest && !relativeDest.startsWith('..') && !path.isAbsolute(relativeDest)) {
      throw new Error('INVALID_MOVE');
    }
    await assertTargetAvailable(newPath);
    await fs.rename(sourcePath, newPath);
    return newPath;
  });

  ipcMain.handle('file:list', async (_event, dir: string) => {
    return await listDir(await assertWorkspacePath(dir));
  });

  ipcMain.handle('file:create', async (_event, dir: string, name: string) => {
    dir = await assertWorkspacePath(dir);
    assertValidName(name);
    const filePath = path.join(dir, MARKDOWN_EXTENSION.test(name) ? name : `${name}.md`);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, '', { encoding: 'utf-8', flag: 'wx' });
    return filePath;
  });

  ipcMain.handle('folder:create', async (_event, dir: string, name: string) => {
    dir = await assertWorkspacePath(dir);
    assertValidName(name);
    const folderPath = path.join(dir, name);
    await fs.mkdir(folderPath);
    return folderPath;
  });

  // 工作区
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
    startWatcher(workspacePath);
    return workspacePath;
  });

  ipcMain.handle('workspace:get', () => {
    return getConfig('workspace') as string | null;
  });

  ipcMain.handle('workspace:init', async (_event, workspacePath: string) => {
    await initWorkspace(workspacePath);
    startWatcher(workspacePath);
  });

  // 图片保存
  ipcMain.handle('image:save', async (_event, buffer: number[], ext: string) => {
    const workspace = getConfig('workspace') as string | null;
    if (!workspace) throw new Error('No workspace configured');

    const imagesDir = path.join(workspace, '.md-manage', 'images');
    await fs.mkdir(imagesDir, { recursive: true });

    const normalizedExt = ext.replace(/^\./, '').toLowerCase();
    if (!/^(png|jpe?g|gif|webp|svg|bmp|apng)$/.test(normalizedExt)) {
      throw new Error('INVALID_IMAGE_EXTENSION');
    }
    const filename = `${Date.now()}-${randomUUID()}.${normalizedExt}`;
    const absPath = path.join(imagesDir, filename);
    await fs.writeFile(absPath, Buffer.from(buffer));

    // 返回相对于工作区的路径（强制正斜杠，兼容 Markdown 和 file:// URL）
    return `.md-manage/images/${filename}`;
  });

  ipcMain.handle('image:getAbsPath', async (_event, relativePath: string) => {
    const workspace = getConfig('workspace') as string | null;
    if (!workspace) throw new Error('No workspace configured');
    return await assertWorkspacePath(path.join(workspace, relativePath));
  });

  // 导出 PDF
  ipcMain.handle('export:pdf', async (_event, htmlContent: string) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) throw new Error('No focused window');

    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: '导出 PDF',
      defaultPath: 'document.pdf',
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return;

    // 创建隐藏窗口渲染 HTML 并导出
    const exportWin = new BrowserWindow({ show: false });
    await exportWin.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    );

    const pdfBuffer = await exportWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
    });
    exportWin.close();

    await fs.writeFile(filePath, pdfBuffer);
  });

  // 导出 HTML
  ipcMain.handle('export:html', async (_event, markdownContent: string) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) throw new Error('No focused window');

    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: '导出 HTML',
      defaultPath: 'document.html',
      filters: [{ name: 'HTML 文件', extensions: ['html'] }],
    });
    if (canceled || !filePath) return;

    await fs.writeFile(filePath, markdownContent, 'utf-8');
  });
}
