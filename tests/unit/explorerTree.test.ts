import { describe, expect, it } from 'vitest';
import type { FileNode } from '@/types/file';
import {
  findAncestorFolders,
  relativeDisplayPath,
  resolveCreateTarget,
  suggestAvailableName,
} from '@/lib/explorer/tree';

const tree: FileNode[] = [
  {
    name: 'docs',
    path: '/workspace/docs',
    parentPath: '/workspace',
    type: 'folder',
    modifiedAt: '2026-01-01T00:00:00Z',
    children: [
      {
        name: 'guide.md',
        path: '/workspace/docs/guide.md',
        parentPath: '/workspace/docs',
        type: 'file',
        modifiedAt: '2026-01-01T00:00:00Z',
      },
      {
        name: 'untitled.md',
        path: '/workspace/docs/untitled.md',
        parentPath: '/workspace/docs',
        type: 'file',
        modifiedAt: '2026-01-01T00:00:00Z',
      },
      {
        name: 'untitled 2.md',
        path: '/workspace/docs/untitled 2.md',
        parentPath: '/workspace/docs',
        type: 'file',
        modifiedAt: '2026-01-01T00:00:00Z',
      },
    ],
  },
];

describe('explorer tree helpers', () => {
  it('resolves create destinations from folder, file, and empty selection', () => {
    expect(resolveCreateTarget('/workspace', null, tree)).toBe('/workspace');
    expect(resolveCreateTarget('/workspace', { path: '/workspace/docs', kind: 'folder' }, tree))
      .toBe('/workspace/docs');
    expect(resolveCreateTarget('/workspace', { path: '/workspace/docs/guide.md', kind: 'file' }, tree))
      .toBe('/workspace/docs');
  });

  it('falls back to the workspace when a selection is stale', () => {
    expect(resolveCreateTarget('/workspace', { path: '/missing', kind: 'folder' }, tree))
      .toBe('/workspace');
  });

  it('finds ancestor folders for reveal operations', () => {
    expect(findAncestorFolders(tree, '/workspace/docs/guide.md')).toEqual(['/workspace/docs']);
  });

  it('increments default names without overwriting siblings', () => {
    expect(suggestAvailableName('file', '/workspace/docs', tree)).toBe('untitled 3.md');
    expect(suggestAvailableName('folder', '/workspace', tree)).toBe('新文件夹');
  });

  it('formats root and nested target labels', () => {
    expect(relativeDisplayPath('/workspace', '/workspace')).toBe('工作区根目录');
    expect(relativeDisplayPath('/workspace', '/workspace/docs')).toBe('docs');
  });
});
