import fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../ipc/config';

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function nearestExistingPath(targetPath: string): Promise<string> {
  let candidate = targetPath;
  while (true) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      const parent = path.dirname(candidate);
      if (parent === candidate) throw new Error('OUTSIDE_WORKSPACE');
      candidate = parent;
    }
  }
}

/** Resolve a renderer-provided path and reject traversal or symlink escapes. */
export async function assertWorkspacePath(inputPath: string): Promise<string> {
  const workspace = getConfig('workspace') as string | null;
  if (!workspace) throw new Error('NO_WORKSPACE');

  const root = path.resolve(workspace);
  const target = path.resolve(inputPath);
  if (!isInside(root, target)) throw new Error('OUTSIDE_WORKSPACE');

  const [realRoot, existing] = await Promise.all([
    fs.realpath(root),
    nearestExistingPath(target),
  ]);
  const realExisting = await fs.realpath(existing);
  if (!isInside(realRoot, realExisting)) throw new Error('OUTSIDE_WORKSPACE');

  return target;
}
