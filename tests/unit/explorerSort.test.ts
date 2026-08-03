import { describe, expect, it } from 'vitest';
import type { FileNode } from '@/types/file';
import { sortFileTree } from '@/lib/explorer/sortFileTree';

function node(
  name: string,
  type: 'file' | 'folder',
  modifiedAt = '2026-01-01T00:00:00Z',
  children?: FileNode[]
): FileNode {
  return {
    name,
    type,
    path: `/workspace/${name}`,
    parentPath: '/workspace',
    modifiedAt,
    children,
  };
}

describe('sortFileTree', () => {
  it('sorts folders first and names naturally', () => {
    const result = sortFileTree([
      node('笔记10.md', 'file'),
      node('notes10', 'folder'),
      node('笔记2.md', 'file'),
      node('notes2', 'folder'),
    ], 'name', 'asc');

    expect(result.map((item) => item.name)).toEqual([
      'notes2',
      'notes10',
      '笔记2.md',
      '笔记10.md',
    ]);
  });

  it('keeps folders first when name order is descending', () => {
    const result = sortFileTree([
      node('a.md', 'file'),
      node('a-folder', 'folder'),
      node('z.md', 'file'),
      node('z-folder', 'folder'),
    ], 'name', 'desc');

    expect(result.map((item) => item.name)).toEqual([
      'z-folder',
      'a-folder',
      'z.md',
      'a.md',
    ]);
  });

  it('sorts recent valid timestamps first and invalid timestamps last', () => {
    const result = sortFileTree([
      node('invalid.md', 'file', 'invalid'),
      node('old.md', 'file', '2025-01-01T00:00:00Z'),
      node('new.md', 'file', '2026-01-01T00:00:00Z'),
    ], 'modified', 'desc');

    expect(result.map((item) => item.name)).toEqual(['new.md', 'old.md', 'invalid.md']);
  });

  it('sorts files by extension and recursively sorts children', () => {
    const result = sortFileTree([
      node('docs', 'folder', undefined, [
        { ...node('b.markdown', 'file'), parentPath: '/workspace/docs' },
        { ...node('a.md', 'file'), parentPath: '/workspace/docs' },
      ]),
    ], 'type', 'asc');

    expect(result[0].children?.map((item) => item.name)).toEqual(['b.markdown', 'a.md']);
  });

  it('does not mutate the source tree', () => {
    const source = [node('b.md', 'file'), node('a.md', 'file')];
    sortFileTree(source, 'name', 'asc');
    expect(source.map((item) => item.name)).toEqual(['b.md', 'a.md']);
  });
});
