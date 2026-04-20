/**
 * 自定义 CodeMirror 搜索面板
 * 基于 @codemirror/search 的 createPanel API
 */
import type { EditorView, Panel } from '@codemirror/view';
import { RegExpCursor, SearchCursor } from '@codemirror/search';
import {
  SearchQuery,
  setSearchQuery,
  getSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  closeSearchPanel,
} from '@codemirror/search';
import './searchPanel.css';

const ICON_SEARCH =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>';
const ICON_REPLACE =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6V4a1 1 0 011-1h8M13 10v2a1 1 0 01-1 1H4"/><path d="M5 8l-2-2 2-2M11 8l2 2-2 2"/></svg>';
const ICON_UP =
  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7.5l3-3 3 3"/></svg>';
const ICON_DOWN =
  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4.5l3 3 3-3"/></svg>';
const ICON_CLOSE =
  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2l8 8M10 2L2 10"/></svg>';
const ICON_CASE =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><text x="8" y="12" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600">Aa</text></svg>';
const ICON_REGEX =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><text x="8" y="12" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700">.*</text></svg>';

function countMatches(view: EditorView, query: SearchQuery): number {
  if (!query.search) return 0;
  try {
    const doc = view.state.doc;
    const iter = query.regexp
      ? new RegExpCursor(doc, query.search, {
          ignoreCase: !query.caseSensitive,
        })
      : new SearchCursor(
          doc,
          query.search,
          0,
          doc.length,
          query.caseSensitive ? undefined : (s) => s.toLowerCase()
        );
    let n = 0;
    while (!iter.next().done) {
      n++;
      if (n > 9999) break; // 保护：超大文档不无限统计
    }
    return n;
  } catch {
    return 0;
  }
}

function currentMatchIndex(view: EditorView, query: SearchQuery): number {
  if (!query.search) return 0;
  try {
    const { from } = view.state.selection.main;
    const doc = view.state.doc;
    const iter = query.regexp
      ? new RegExpCursor(doc, query.search, {
          ignoreCase: !query.caseSensitive,
        })
      : new SearchCursor(
          doc,
          query.search,
          0,
          doc.length,
          query.caseSensitive ? undefined : (s) => s.toLowerCase()
        );
    let idx = 0;
    let hit = 0;
    while (!iter.next().done) {
      idx++;
      if (iter.value.from === from) {
        hit = idx;
        break;
      }
    }
    return hit;
  } catch {
    return 0;
  }
}

export function createSearchPanel(view: EditorView): Panel {
  const dom = document.createElement('div');
  dom.className = 'dz-search-panel';

  // ── 查找行 ────────────────────────────────────────────────
  const searchRow = document.createElement('div');
  searchRow.className = 'dz-search-row';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'dz-search-input-wrap';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'dz-search-icon';
  searchIcon.innerHTML = ICON_SEARCH;

  const searchInput = document.createElement('input');
  searchInput.className = 'dz-search-input';
  searchInput.placeholder = '查找';
  searchInput.setAttribute('type', 'text');

  searchWrap.append(searchIcon, searchInput);

  const count = document.createElement('span');
  count.className = 'dz-search-count';
  count.textContent = '';

  const caseBtn = document.createElement('button');
  caseBtn.className = 'dz-search-btn dz-toggle';
  caseBtn.title = '区分大小写';
  caseBtn.innerHTML = ICON_CASE;

  const regexBtn = document.createElement('button');
  regexBtn.className = 'dz-search-btn dz-toggle';
  regexBtn.title = '正则表达式';
  regexBtn.innerHTML = ICON_REGEX;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'dz-search-btn';
  prevBtn.title = '上一个 (Shift+Enter)';
  prevBtn.innerHTML = ICON_UP;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'dz-search-btn';
  nextBtn.title = '下一个 (Enter)';
  nextBtn.innerHTML = ICON_DOWN;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dz-search-btn';
  closeBtn.title = '关闭 (Esc)';
  closeBtn.innerHTML = ICON_CLOSE;

  searchRow.append(searchWrap, count, caseBtn, regexBtn, prevBtn, nextBtn, closeBtn);

  // ── 替换行 ────────────────────────────────────────────────
  const replaceRow = document.createElement('div');
  replaceRow.className = 'dz-search-row';

  const replaceWrap = document.createElement('div');
  replaceWrap.className = 'dz-search-input-wrap';

  const replaceIcon = document.createElement('span');
  replaceIcon.className = 'dz-search-icon';
  replaceIcon.innerHTML = ICON_REPLACE;

  const replaceInput = document.createElement('input');
  replaceInput.className = 'dz-search-input';
  replaceInput.placeholder = '替换为';
  replaceInput.setAttribute('type', 'text');

  replaceWrap.append(replaceIcon, replaceInput);

  const replaceBtn = document.createElement('button');
  replaceBtn.className = 'dz-replace-btn';
  replaceBtn.textContent = '替换';

  const replaceAllBtn = document.createElement('button');
  replaceAllBtn.className = 'dz-replace-btn';
  replaceAllBtn.textContent = '全部替换';

  replaceRow.append(replaceWrap, replaceBtn, replaceAllBtn);

  dom.append(searchRow, replaceRow);

  // ── 状态同步：input → SearchQuery ─────────────────────────
  function commitQuery() {
    const query = new SearchQuery({
      search: searchInput.value,
      caseSensitive: caseBtn.classList.contains('active'),
      regexp: regexBtn.classList.contains('active'),
      replace: replaceInput.value,
      wholeWord: false,
    });
    view.dispatch({ effects: setSearchQuery.of(query) });
    updateCount(query);
  }

  function updateCount(query: SearchQuery) {
    const total = countMatches(view, query);
    const current = currentMatchIndex(view, query);
    if (!query.search) {
      count.textContent = '';
    } else if (total === 0) {
      count.textContent = '无匹配';
    } else {
      count.textContent = current ? `${current}/${total}` : `${total} 项`;
    }
  }

  searchInput.addEventListener('input', commitQuery);
  replaceInput.addEventListener('input', commitQuery);

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) findPrevious(view);
      else findNext(view);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchPanel(view);
    }
  });

  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      replaceNext(view);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchPanel(view);
    }
  });

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    findPrevious(view);
  });
  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    findNext(view);
  });
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeSearchPanel(view);
  });
  replaceBtn.addEventListener('click', (e) => {
    e.preventDefault();
    replaceNext(view);
  });
  replaceAllBtn.addEventListener('click', (e) => {
    e.preventDefault();
    replaceAll(view);
  });

  caseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    caseBtn.classList.toggle('active');
    commitQuery();
  });
  regexBtn.addEventListener('click', (e) => {
    e.preventDefault();
    regexBtn.classList.toggle('active');
    commitQuery();
  });

  return {
    dom,
    top: true,
    mount() {
      // 初始化：从已有 SearchQuery 恢复
      const existing = getSearchQuery(view.state);
      searchInput.value = existing.search;
      replaceInput.value = existing.replace;
      if (existing.caseSensitive) caseBtn.classList.add('active');
      if (existing.regexp) regexBtn.classList.add('active');
      updateCount(existing);
      // 自动聚焦并选中
      setTimeout(() => {
        searchInput.focus();
        searchInput.select();
      }, 0);
    },
    update(upd) {
      if (upd.docChanged || upd.selectionSet) {
        updateCount(getSearchQuery(view.state));
      }
    },
  };
}
