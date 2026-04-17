import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  useCurrentFile,
  useCurrentContent,
  useIsDirty,
  useTheme,
  useWorkspace,
} from '@/hooks/useAppStore';
import { EditorCore } from './EditorCore';
import styles from './EditorArea.module.css';

export function EditorArea() {
  const currentFile = useCurrentFile();
  const currentContent = useCurrentContent();
  const isDirty = useIsDirty();
  const theme = useTheme();
  const workspace = useWorkspace();
  const setContent = useAppStore((s) => s.setContent);
  const markSaved = useAppStore((s) => s.markSaved);

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  const handleContentChange = useCallback(
    (newContent: string) => setContent(newContent),
    [setContent]
  );

  // ── 自动保存（debounce 2s）────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!currentFile || !isDirty) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await window.electronAPI?.file.write(currentFile, currentContent);
        markSaved();
      } catch (err) {
        console.error('[EditorArea] auto-save failed:', err);
      }
    }, 2000);
    return () => clearTimeout(saveTimerRef.current);
  }, [isDirty, currentContent, currentFile, markSaved]);

  // ── Cmd+S 手动保存 ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!currentFile || !isDirty) return;
        clearTimeout(saveTimerRef.current);
        (async () => {
          try {
            await window.electronAPI?.file.write(currentFile, currentContent);
            markSaved();
          } catch (err) {
            console.error('[EditorArea] manual save failed:', err);
          }
        })();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentFile, isDirty, currentContent, markSaved]);

  if (!currentFile) {
    return (
      <div className={styles.area}>
        <div className={styles.empty}>
          {workspace ? '选择左侧文件开始编辑' : '请先选择工作区'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.area}>
      <div className={styles.scroll}>
        <div className={styles.content}>
          <EditorCore
            body={currentContent}
            onBodyChange={handleContentChange}
            isDark={isDark}
            filePath={currentFile}
          />
        </div>
      </div>
    </div>
  );
}
