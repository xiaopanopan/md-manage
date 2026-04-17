import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import type { FuseResult } from 'fuse.js';
import type { FileNode } from '@/types/file';
import {
  useSearchOpen,
  useFiles,
  useRecentFiles,
  useUIActions,
  useFileActions,
} from '@/hooks/useAppStore';
import styles from './SearchModal.module.css';

function flattenFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const n of nodes) {
    if (n.type === 'file') result.push(n);
    if (n.children) result.push(...flattenFiles(n.children));
  }
  return result;
}

function highlightMatch(text: string, indices?: readonly [number, number][]): React.ReactNode {
  if (!indices || indices.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const [start, end] of indices) {
    if (start > last) parts.push(text.slice(last, start));
    parts.push(<mark key={start}>{text.slice(start, end + 1)}</mark>);
    last = end + 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function SearchModal() {
  const isOpen = useSearchOpen();
  const files = useFiles();
  const recentFiles = useRecentFiles();
  const { closeSearch } = useUIActions();
  const { setCurrentFile, addRecentFile } = useFileActions();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatFiles = useMemo(() => flattenFiles(files), [files]);

  const fuseRef = useRef<Fuse<FileNode> | null>(null);
  useEffect(() => {
    fuseRef.current = new Fuse(flatFiles, {
      keys: [{ name: 'name', weight: 0.7 }, { name: 'path', weight: 0.3 }],
      threshold: 0.3,
      includeMatches: true,
    });
  }, [flatFiles]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // 无输入 → 显示最近文件
      return recentFiles
        .map((p) => flatFiles.find((f) => f.path === p))
        .filter(Boolean) as FileNode[];
    }
    return (fuseRef.current?.search(query) ?? []).slice(0, 20);
  }, [query, flatFiles, recentFiles]);

  const isRecentMode = !query.trim();

  useEffect(() => { setActiveIndex(0); }, [query]);
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const openFile = useCallback(async (filePath: string) => {
    try {
      const content = await window.electronAPI?.file.read(filePath) ?? '';
      setCurrentFile(filePath, content);
      addRecentFile(filePath);
      closeSearch();
    } catch (err) {
      console.error('[Search] open failed:', err);
    }
  }, [setCurrentFile, addRecentFile, closeSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const count = isRecentMode
      ? (results as FileNode[]).length
      : (results as FuseResult<FileNode>[]).length;

    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => (i + 1) % Math.max(count, 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => (i - 1 + count) % Math.max(count, 1)); }
    if (e.key === 'Enter' && count > 0) {
      e.preventDefault();
      const item = isRecentMode
        ? (results as FileNode[])[activeIndex]
        : (results as FuseResult<FileNode>[])[activeIndex]?.item;
      if (item) openFile(item.path);
    }
    if (e.key === 'Escape') closeSearch();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={closeSearch}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrap}>
          <svg className={styles.icon} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索文件…"
          />
        </div>
        <div className={styles.results}>
          {isRecentMode && (results as FileNode[]).length > 0 && (
            <div className={styles.sectionLabel}>最近文件</div>
          )}
          {isRecentMode
            ? (results as FileNode[]).map((file, i) => (
                <div
                  key={file.path}
                  className={`${styles.item} ${i === activeIndex ? styles.active : ''}`}
                  onClick={() => openFile(file.path)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className={styles.itemName}>{file.name.replace(/\.md$/i, '')}</span>
                  <span className={styles.itemPath}>{file.path.split('/').slice(-2, -1)[0]}</span>
                </div>
              ))
            : (results as FuseResult<FileNode>[]).map((r, i) => {
                const nameMatch = r.matches?.find((m) => m.key === 'name');
                return (
                  <div
                    key={r.item.path}
                    className={`${styles.item} ${i === activeIndex ? styles.active : ''}`}
                    onClick={() => openFile(r.item.path)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <span className={styles.itemName}>
                      {highlightMatch(
                        r.item.name.replace(/\.md$/i, ''),
                        nameMatch?.indices as unknown as [number, number][] | undefined
                      )}
                    </span>
                    <span className={styles.itemPath}>
                      {r.item.path.split('/').slice(-2, -1)[0]}
                    </span>
                  </div>
                );
              })
          }
          {((isRecentMode && (results as FileNode[]).length === 0) ||
            (!isRecentMode && (results as FuseResult<FileNode>[]).length === 0)) && (
            <div className={styles.empty}>
              {query ? '未找到匹配文件' : '暂无最近文件'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
