import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './ReaderSearchBar.module.css';

interface Props {
  container: HTMLElement | null;
  onClose: () => void;
}

// CSS Custom Highlight API registry keys
const HL_ALL = 'dz-reader-search';
const HL_CURRENT = 'dz-reader-search-current';

// Narrow window.CSS helper (API 相对新，用 any 避免重型类型导入)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CSSAny = CSS as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HighlightCtor = (window as any).Highlight;

function clearHighlights() {
  CSSAny.highlights?.delete(HL_ALL);
  CSSAny.highlights?.delete(HL_CURRENT);
}

function findRanges(container: HTMLElement, query: string): Range[] {
  const matches: Range[] = [];
  if (!query) return matches;

  const q = query.toLowerCase();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue ?? '';
    const lower = text.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf(q, idx)) !== -1) {
      const range = new Range();
      range.setStart(node, idx);
      range.setEnd(node, idx + query.length);
      matches.push(range);
      idx += query.length;
      if (matches.length > 9999) return matches;
    }
  }
  return matches;
}

function applyHighlight(key: string, ranges: Range[]) {
  if (!HighlightCtor || !CSSAny.highlights) return;
  if (ranges.length === 0) {
    CSSAny.highlights.delete(key);
    return;
  }
  const hl = new HighlightCtor(...ranges);
  CSSAny.highlights.set(key, hl);
}

export function ReaderSearchBar({ container, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [ranges, setRanges] = useState<Range[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => clearHighlights();
  }, []);

  useEffect(() => {
    if (!container) return;
    if (!query) {
      clearHighlights();
      setRanges([]);
      setCursor(0);
      return;
    }
    const found = findRanges(container, query);
    setRanges(found);
    setCursor(0);
    applyHighlight(HL_ALL, found);
    if (found.length > 0) {
      applyHighlight(HL_CURRENT, [found[0]]);
      scrollRangeIntoView(found[0]);
    } else {
      CSSAny.highlights?.delete(HL_CURRENT);
    }
  }, [query, container]);

  const updateCurrent = useCallback(
    (idx: number) => {
      if (!ranges.length) return;
      const clamped = ((idx % ranges.length) + ranges.length) % ranges.length;
      setCursor(clamped);
      applyHighlight(HL_CURRENT, [ranges[clamped]]);
      scrollRangeIntoView(ranges[clamped]);
    },
    [ranges]
  );

  const next = useCallback(() => updateCurrent(cursor + 1), [cursor, updateCurrent]);
  const prev = useCallback(() => updateCurrent(cursor - 1), [cursor, updateCurrent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) prev();
      else next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const countText = !query
    ? ''
    : ranges.length === 0
    ? '无匹配'
    : `${cursor + 1}/${ranges.length}`;

  return (
    <div className={styles.bar}>
      <div className={styles.inputWrap}>
        <span className={styles.icon}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="查找"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <span className={styles.count}>{countText}</span>
      <button
        className={styles.btn}
        onClick={prev}
        disabled={ranges.length === 0}
        data-tooltip="上一个 (Shift+Enter)"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 7.5l3-3 3 3" />
        </svg>
      </button>
      <button
        className={styles.btn}
        onClick={next}
        disabled={ranges.length === 0}
        data-tooltip="下一个 (Enter)"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>
      <button className={styles.btn} onClick={onClose} data-tooltip="关闭 (Esc)">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2l8 8M10 2L2 10" />
        </svg>
      </button>
    </div>
  );
}

function scrollRangeIntoView(range: Range) {
  const rect = range.getBoundingClientRect();
  if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
    const el = range.startContainer.parentElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
