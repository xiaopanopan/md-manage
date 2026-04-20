import { useRef, useEffect, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
  createExtensions,
  themeCompartment,
  createLightTheme,
  createDarkTheme,
} from './EditorExtensions';
import styles from './EditorCore.module.css';

interface Props {
  body: string;
  onBodyChange: (body: string) => void;
  isDark: boolean;
  filePath: string | null;
  onCursorChange?: (line: number, col: number) => void;
}

export function EditorCore({ body, onBodyChange, isDark, filePath, onCursorChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Ref to track latest body to avoid circular updates
  const latestBodyRef = useRef(body);

  const handleChange = useCallback(
    (newBody: string) => {
      latestBodyRef.current = newBody;
      onBodyChange(newBody);
    },
    [onBodyChange]
  );

  // 创建 / 销毁 EditorView（文件切换时重建）
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: body,
      extensions: createExtensions(isDark, handleChange, onCursorChange),
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    latestBodyRef.current = body;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only rebuild when file changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // 外部 body 变化时同步（如 undo 外部触发）— 不要把 view 放入 deps
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (body !== latestBodyRef.current) {
      latestBodyRef.current = body;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: body },
      });
    }
  }, [body]);

  // 主题热切换
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(
        isDark ? createDarkTheme() : createLightTheme()
      ),
    });
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={styles.wrapper}
      onClick={() => viewRef.current?.focus()}
    />
  );
}
