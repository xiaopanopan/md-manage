import { describe, expect, it } from 'vitest';
import type { FileNode } from '@/types/file';
import { collectFolderOptions, validateMoveTarget } from '@/lib/explorer/moveTargets';

const WORKSPACE = '/workspace';

function folder(name: string, path: string, parentPath: string, children: FileNode[] = []): FileNode {
  return { name, path, parentPath, type: 'folder', modifiedAt: '2026-01-01T00:00:00Z', children };
}

function file(name: string, path: string, parentPath: string): FileNode {
  return { name, path, parentPath, type: 'file', modifiedAt: '2026-01-01T00:00:00Z' };
}

// /workspace
// ├── docs/            (design/, guide.md, notes.md)
// │   └── design/      (notes.md)
// ├── archive/
// └── readme.md
const tree: FileNode[] = [
  folder('docs', '/workspace/docs', WORKSPACE, [
    folder('design', '/workspace/docs/design', '/workspace/docs', [
      file('notes.md', '/workspace/docs/design/notes.md', '/workspace/docs/design'),
    ]),
    file('guide.md', '/workspace/docs/guide.md', '/workspace/docs'),
    file('notes.md', '/workspace/docs/notes.md', '/workspace/docs'),
  ]),
  folder('archive', '/workspace/archive', WORKSPACE),
  file('readme.md', '/workspace/readme.md', WORKSPACE),
];

describe('collectFolderOptions', () => {
  it('lists the workspace root first, then every folder in tree order', () => {
    expect(collectFolderOptions(WORKSPACE, tree).map((option) => option.path)).toEqual([
      WORKSPACE,
      '/workspace/docs',
      '/workspace/docs/design',
      '/workspace/archive',
    ]);
  });

  it('excludes files and exposes indent depth plus workspace-relative labels', () => {
    const options = collectFolderOptions(WORKSPACE, tree);
    expect(options.some((option) => option.path.endsWith('.md'))).toBe(false);
    expect(options.map((option) => option.depth)).toEqual([0, 1, 2, 1]);
    expect(options[0].relativePath).toBe('工作区根目录');
    expect(options[2].relativePath).toBe('docs/design');
  });
});

describe('validateMoveTarget', () => {
  const guide = file('guide.md', '/workspace/docs/guide.md', '/workspace/docs');
  const docs = tree[0];

  it('accepts an unrelated folder', () => {
    expect(validateMoveTarget(guide, '/workspace/archive', tree)).toBe('ok');
  });

  it('rejects the folder the item already lives in', () => {
    expect(validateMoveTarget(guide, '/workspace/docs', tree)).toBe('same-parent');
    expect(validateMoveTarget(docs, WORKSPACE, tree)).toBe('same-parent');
  });

  it('rejects moving a folder into itself or its descendants', () => {
    expect(validateMoveTarget(docs, '/workspace/docs', tree)).toBe('into-self');
    expect(validateMoveTarget(docs, '/workspace/docs/design', tree)).toBe('into-self');
  });

  it('rejects a destination that already holds the same name', () => {
    const notes = file('notes.md', '/workspace/docs/notes.md', '/workspace/docs');
    expect(validateMoveTarget(notes, '/workspace/docs/design', tree)).toBe('name-conflict');
  });

  it('treats name conflicts case-insensitively', () => {
    const upper = file('GUIDE.md', '/workspace/archive/GUIDE.md', '/workspace/archive');
    expect(validateMoveTarget(upper, '/workspace/docs', tree)).toBe('name-conflict');
  });

  it('accepts the workspace root when the item lives in a subfolder', () => {
    expect(validateMoveTarget(guide, WORKSPACE, tree)).toBe('ok');
  });
});
