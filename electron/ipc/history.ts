import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { getConfig } from './config';

const MAX_VERSIONS = 50;
const MIN_SAVE_INTERVAL = 60_000; // 60 秒

const lastSaveTimes = new Map<string, number>();

function historyDir(workspace: string, filePath: string): string {
  const relative = path.relative(workspace, filePath).replace(/[/\\]/g, '__');
  const name = relative.replace(/\.md$/i, '');
  return path.join(workspace, '.digitalzen', 'history', name);
}

export function registerHistoryHandlers(): void {
  // 保存版本快照（由渲染进程在 auto-save 后调用）
  ipcMain.handle(
    'history:save',
    async (_event, filePath: string, content: string) => {
      const workspace = getConfig('workspace') as string | null;
      if (!workspace) return;

      // 频率限制
      const now = Date.now();
      const last = lastSaveTimes.get(filePath) ?? 0;
      if (now - last < MIN_SAVE_INTERVAL) return;
      lastSaveTimes.set(filePath, now);

      const dir = historyDir(workspace, filePath);
      await fs.mkdir(dir, { recursive: true });

      const id = new Date().toISOString().replace(/[:.]/g, '-');
      const versionPath = path.join(dir, `${id}.md`);
      await fs.writeFile(versionPath, content, 'utf-8');

      // 清理超出上限的旧版本
      const entries = await fs.readdir(dir);
      const sorted = entries.filter((e) => e.endsWith('.md')).sort();
      if (sorted.length > MAX_VERSIONS) {
        const toDelete = sorted.slice(0, sorted.length - MAX_VERSIONS);
        for (const f of toDelete) {
          await fs.unlink(path.join(dir, f)).catch(() => {});
        }
      }
    }
  );

  // 列出版本
  ipcMain.handle('history:list', async (_event, filePath: string) => {
    const workspace = getConfig('workspace') as string | null;
    if (!workspace) return [];

    const dir = historyDir(workspace, filePath);
    try {
      const entries = await fs.readdir(dir);
      const versions = [];
      for (const name of entries.filter((e) => e.endsWith('.md')).sort().reverse()) {
        const vPath = path.join(dir, name);
        const stat = await fs.stat(vPath);
        const content = await fs.readFile(vPath, 'utf-8');
        const firstLine = content.split('\n').find((l) => l.trim() && !l.startsWith('---'))?.trim() ?? '';
        versions.push({
          id: name.replace(/\.md$/, ''),
          filename: path.basename(filePath),
          wordCount: content.length,
          summary: firstLine.slice(0, 50),
          createdAt: stat.mtime.toISOString(),
        });
      }
      return versions;
    } catch {
      return [];
    }
  });

  // 获取版本内容
  ipcMain.handle(
    'history:get',
    async (_event, filePath: string, versionId: string) => {
      const workspace = getConfig('workspace') as string | null;
      if (!workspace) throw new Error('No workspace');

      const dir = historyDir(workspace, filePath);
      return await fs.readFile(path.join(dir, `${versionId}.md`), 'utf-8');
    }
  );

  // 恢复版本
  ipcMain.handle(
    'history:restore',
    async (_event, filePath: string, versionId: string) => {
      const workspace = getConfig('workspace') as string | null;
      if (!workspace) throw new Error('No workspace');

      const dir = historyDir(workspace, filePath);
      const content = await fs.readFile(path.join(dir, `${versionId}.md`), 'utf-8');
      await fs.writeFile(filePath, content, 'utf-8');
    }
  );
}
