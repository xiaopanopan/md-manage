import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { getConfig } from './config';

// 解决同名冲突：若目标文件已存在，追加 _1、_2 …
async function resolveConflict(destPath: string): Promise<string> {
  try {
    await fs.access(destPath);
  } catch {
    // 不存在，直接使用
    return destPath;
  }

  const ext = path.extname(destPath);
  const base = destPath.slice(0, destPath.length - ext.length);

  let counter = 1;
  while (counter < 1000) {
    const candidate = `${base}_${counter}${ext}`;
    try {
      await fs.access(candidate);
      counter++;
    } catch {
      return candidate;
    }
  }
  throw new Error('Too many duplicate files');
}

// 递归收集目录下所有 .md 文件，返回 [srcPath, relPath] 对
async function collectMarkdownFiles(
  dir: string,
  base: string = dir
): Promise<Array<[string, string]>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: Array<[string, string]> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await collectMarkdownFiles(full, base);
      result.push(...sub);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push([full, path.relative(base, full)]);
    }
  }
  return result;
}

export function registerImportHandlers(): void {
  // 导入单个或多个 .md 文件
  ipcMain.handle('import:files', async (_event, destDir?: string) => {
    const workspace = getConfig('workspace') as string | null;
    const win = BrowserWindow.getFocusedWindow();
    if (!workspace || !win) throw new Error('No workspace configured');

    const target = destDir ?? workspace;

    const { filePaths, canceled } = await dialog.showOpenDialog(win, {
      title: '导入 Markdown 文件',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Markdown 文件', extensions: ['md', 'markdown'] }],
    });
    if (canceled || filePaths.length === 0) return [];

    const imported: string[] = [];
    for (const srcPath of filePaths) {
      const destPath = await resolveConflict(path.join(target, path.basename(srcPath)));
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcPath, destPath);
      imported.push(destPath);
    }
    return imported;
  });

  // 导入文件夹（保留目录结构）
  ipcMain.handle('import:folder', async (_event, destDir?: string) => {
    const workspace = getConfig('workspace') as string | null;
    const win = BrowserWindow.getFocusedWindow();
    if (!workspace || !win) throw new Error('No workspace configured');

    const target = destDir ?? workspace;

    const { filePaths, canceled } = await dialog.showOpenDialog(win, {
      title: '导入文件夹',
      properties: ['openDirectory'],
    });
    if (canceled || filePaths.length === 0) return [];

    const srcFolder = filePaths[0];
    const folderName = path.basename(srcFolder);
    const destFolder = path.join(target, folderName);

    const files = await collectMarkdownFiles(srcFolder);
    const imported: string[] = [];

    for (const [srcPath, relPath] of files) {
      const destPath = await resolveConflict(path.join(destFolder, relPath));
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcPath, destPath);
      imported.push(destPath);
    }
    return imported;
  });

  // 拖拽导入：渲染进程传入文件路径数组和目标目录
  ipcMain.handle(
    'import:drop',
    async (_event, srcPaths: string[], destDir: string) => {
      const imported: string[] = [];

      for (const srcPath of srcPaths) {
        let stat: Awaited<ReturnType<typeof fs.stat>>;
        try {
          stat = await fs.stat(srcPath);
        } catch {
          continue;
        }

        if (stat.isDirectory()) {
          const files = await collectMarkdownFiles(srcPath);
          const folderName = path.basename(srcPath);
          for (const [src, rel] of files) {
            const dest = await resolveConflict(path.join(destDir, folderName, rel));
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.copyFile(src, dest);
            imported.push(dest);
          }
        } else if (srcPath.endsWith('.md') || srcPath.endsWith('.markdown')) {
          const dest = await resolveConflict(
            path.join(destDir, path.basename(srcPath))
          );
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(srcPath, dest);
          imported.push(dest);
        }
      }
      return imported;
    }
  );
}
