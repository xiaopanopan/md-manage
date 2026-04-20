import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  type ViewUpdate,
} from '@codemirror/view';
import { Compartment, EditorState } from '@codemirror/state';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { search, searchKeymap } from '@codemirror/search';
import {
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  HighlightStyle,
} from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { tags } from '@lezer/highlight';
import { markdownKeymap } from '@/lib/shortcuts';

// ── Compartment（运行时热切换）────────────────────────────
export const themeCompartment = new Compartment();

// ── Markdown 语法高亮（浅色）───────────────────────────────
const lightHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: '700', fontSize: '1.4em' },
  { tag: tags.heading2, fontWeight: '700', fontSize: '1.25em' },
  { tag: tags.heading3, fontWeight: '600', fontSize: '1.1em' },
  { tag: tags.heading4, fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: 'rgba(0,0,0,0.4)' },
  { tag: tags.link, color: '#0066cc', textDecoration: 'underline' },
  { tag: tags.url, color: '#0066cc' },
  { tag: tags.monospace, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9em', background: 'rgba(0,0,0,0.04)', borderRadius: '2px' },
  { tag: tags.meta, color: 'rgba(0,0,0,0.4)' },
  { tag: tags.comment, color: 'rgba(0,0,0,0.35)' },
  { tag: tags.processingInstruction, color: 'rgba(0,0,0,0.35)' },
  { tag: tags.quote, color: 'rgba(0,0,0,0.55)', fontStyle: 'italic' },
]);

// ── Markdown 语法高亮（深色）───────────────────────────────
const darkHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: '700', fontSize: '1.4em', color: '#e8e8e8' },
  { tag: tags.heading2, fontWeight: '700', fontSize: '1.25em', color: '#e0e0e0' },
  { tag: tags.heading3, fontWeight: '600', fontSize: '1.1em', color: '#d8d8d8' },
  { tag: tags.heading4, fontWeight: '600', color: '#d0d0d0' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: 'rgba(232,232,232,0.4)' },
  { tag: tags.link, color: '#6cb6ff', textDecoration: 'underline' },
  { tag: tags.url, color: '#6cb6ff' },
  { tag: tags.monospace, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9em', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' },
  { tag: tags.meta, color: 'rgba(232,232,232,0.4)' },
  { tag: tags.comment, color: 'rgba(232,232,232,0.35)' },
  { tag: tags.processingInstruction, color: 'rgba(232,232,232,0.35)' },
  { tag: tags.quote, color: 'rgba(232,232,232,0.55)', fontStyle: 'italic' },
]);

// ── 编辑器基础主题（浅色）─────────────────────────────────
const lightBaseTheme = EditorView.theme({
  '&': {
    background: 'transparent',
    height: '100%',
    minHeight: '100%',
  },
  '.cm-scroller': {
    overflow: 'visible',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
    fontSize: '14px',
    lineHeight: '1.8',
  },
  '.cm-content': {
    caretColor: '#000',
    padding: '0 0 200px',
  },
  '&.cm-focused .cm-cursor': { borderLeftColor: '#000' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    background: 'rgba(0,0,0,0.1) !important',
  },
  '.cm-activeLine': { background: 'rgba(0,0,0,0.02)' },
  '.cm-activeLineGutter': { background: 'rgba(0,0,0,0.02)' },
  '.cm-gutters': {
    background: 'transparent',
    border: 'none',
    color: 'rgba(0,0,0,0.2)',
    paddingRight: '8px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    fontSize: '11px',
    minWidth: '32px',
  },
  '&.cm-focused': { outline: 'none' },
});

// ── 编辑器基础主题（深色）─────────────────────────────────
const darkBaseTheme = EditorView.theme(
  {
    '&': {
      background: 'transparent',
      height: '100%',
      minHeight: '100%',
    },
    '.cm-scroller': {
      overflow: 'visible',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontSize: '14px',
      lineHeight: '1.8',
    },
    '.cm-content': {
      caretColor: '#e8e8e8',
      padding: '0 0 200px',
    },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#e8e8e8' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      background: 'rgba(255,255,255,0.12) !important',
    },
    '.cm-activeLine': { background: 'rgba(255,255,255,0.03)' },
    '.cm-activeLineGutter': { background: 'rgba(255,255,255,0.03)' },
    '.cm-gutters': {
      background: 'transparent',
      border: 'none',
      color: 'rgba(232,232,232,0.2)',
      paddingRight: '8px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      fontSize: '11px',
      minWidth: '32px',
    },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true }
);

// ── 主题组合 ──────────────────────────────────────────────
export function createLightTheme() {
  return [lightBaseTheme, syntaxHighlighting(lightHighlight)];
}

export function createDarkTheme() {
  return [darkBaseTheme, syntaxHighlighting(darkHighlight)];
}

// ── 图片粘贴 / 拖拽处理 ──────────────────────────────────
function imageHandlers() {
  return EditorView.domEventHandlers({
    paste(event: ClipboardEvent, view: EditorView) {
      const items = Array.from(event.clipboardData?.items ?? []) as DataTransferItem[];
      const img = items.find((i: DataTransferItem) => i.type.startsWith('image/'));
      if (!img) return false;

      event.preventDefault();
      (async () => {
        const blob = img.getAsFile();
        if (!blob) return;
        const buffer = Array.from(new Uint8Array(await blob.arrayBuffer()));
        const ext = img.type.split('/')[1] || 'png';
        const relPath = await window.electronAPI?.image.save(buffer, ext);
        if (relPath) {
          insertText(view, `![](${relPath})`);
        }
      })();
      return true;
    },
    drop(event: DragEvent, view: EditorView) {
      const files = Array.from(event.dataTransfer?.files ?? []) as File[];
      const images = files.filter((f: File) => f.type.startsWith('image/'));
      if (!images.length) return false;

      event.preventDefault();
      (async () => {
        for (const file of images) {
          const buffer = Array.from(new Uint8Array(await file.arrayBuffer()));
          const ext = file.name.split('.').pop() || 'png';
          const relPath = await window.electronAPI?.image.save(buffer, ext);
          if (relPath) {
            insertText(view, `![](${relPath})\n`);
          }
        }
      })();
      return true;
    },
  });
}

function insertText(view: EditorView, text: string): void {
  const pos = view.state.selection.main.head;
  view.dispatch({
    changes: { from: pos, insert: text },
    selection: { anchor: pos + text.length },
  });
  view.focus();
}

// ── 完整扩展集 ────────────────────────────────────────────
export function createExtensions(
  isDark: boolean,
  onChange: (content: string) => void
) {
  return [
    // 主题（可热切换）
    themeCompartment.of(isDark ? createDarkTheme() : createLightTheme()),

    // Markdown 语言
    markdown({ base: markdownLanguage, codeLanguages: languages }),

    // 编辑功能
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    indentOnInput(),
    bracketMatching(),
    history(),
    EditorState.allowMultipleSelections.of(true),

    // 搜索（Cmd+F / Cmd+H）
    search(),

    // 快捷键
    keymap.of([
      ...markdownKeymap,
      ...searchKeymap,
      indentWithTab,
      ...defaultKeymap,
      ...historyKeymap,
    ]),

    // 图片粘贴 / 拖拽
    imageHandlers(),

    // 内容变更回调
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    }),
  ];
}
