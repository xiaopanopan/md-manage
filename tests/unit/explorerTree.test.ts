import { describe, expect, it } from 'vitest';
import type { FileNode } from '@/types/file';
import {
  findAncestorFolders,
  isSameOrDescendant,
  relativeDisplayPath,
  remapPath,
  resolveCreateDir,
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
  it('creates in the open document folder and falls back to the workspace', () => {
    expect(resolveCreateDir('/workspace', null, tree)).toBe('/workspace');
    expect(resolveCreateDir('/workspace', '/workspace/docs/guide.md', tree)).toBe('/workspace/docs');
  });

  it('falls back to the workspace when the open path is no longer in the tree', () => {
    expect(resolveCreateDir('/workspace', '/workspace/removed.md', tree)).toBe('/workspace');
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

  it('detects descendants on both posix and windows separators', () => {
    expect(isSameOrDescendant('/a/b', '/a/b')).toBe(true);
    expect(isSameOrDescendant('/a/b/c.md', '/a/b')).toBe(true);
    expect(isSameOrDescendant('C:\\a\\b\\c.md', 'C:\\a\\b')).toBe(true);
    expect(isSameOrDescendant('/a/bc.md', '/a/b')).toBe(false);
  });

  it('remaps affected path prefixes and leaves others untouched', () => {
    expect(remapPath('/ws/old/a.md', '/ws/old', '/ws/new')).toBe('/ws/new/a.md');
    expect(remapPath('/ws/old', '/ws/old', '/ws/new')).toBe('/ws/new');
    expect(remapPath('/ws/other/a.md', '/ws/old', '/ws/new')).toBe('/ws/other/a.md');
  });
});
