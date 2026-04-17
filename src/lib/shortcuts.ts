import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import type { KeyBinding } from '@codemirror/view';

/** 切换行内标记（如 **bold**、*italic*） */
function toggleInlineMarker(marker: string) {
  return (view: EditorView): boolean => {
    const { state } = view;
    const changes = state.changeByRange((range) => {
      const text = state.doc.sliceString(range.from, range.to);
      const len = marker.length;

      // 已包裹 → 取消
      if (
        text.length >= len * 2 &&
        text.startsWith(marker) &&
        text.endsWith(marker)
      ) {
        const inner = text.slice(len, -len);
        return {
          changes: { from: range.from, to: range.to, insert: inner },
          range: EditorSelection.range(range.from, range.from + inner.length),
        };
      }

      // 未包裹 → 添加
      const wrapped = `${marker}${text}${marker}`;
      return {
        changes: { from: range.from, to: range.to, insert: wrapped },
        range: EditorSelection.range(
          range.from + len,
          range.to + len
        ),
      };
    });

    view.dispatch(state.update(changes, { userEvent: 'input' }));
    return true;
  };
}

/** 插入 Markdown 链接 */
function insertLink(view: EditorView): boolean {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selected = state.doc.sliceString(from, to);
  const linkText = selected || '链接文字';
  const insert = `[${linkText}](url)`;

  view.dispatch({
    changes: { from, to, insert },
    selection: {
      // 选中 url 部分方便用户替换
      anchor: from + linkText.length + 3,
      head: from + linkText.length + 6,
    },
  });
  return true;
}

export const markdownKeymap: KeyBinding[] = [
  { key: 'Mod-b', run: toggleInlineMarker('**') },
  { key: 'Mod-i', run: toggleInlineMarker('*') },
  { key: 'Mod-k', run: insertLink },
];
