import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  useCurrentFile,
  useCurrentContent,
  useIsDirty,
  useTheme,
  useWorkspace,
} from '@/hooks/useAppStore';
import { parseFrontMatter, stringifyFrontMatter } from '@/lib/frontmatter';
import { EditorCore } from './EditorCore';
import { TitleInput } from './TitleInput';
import { TagEditor } from './TagEditor';
import { FileInfoBar } from './FileInfoBar';
import styles from './EditorArea.module.css';

export function EditorArea() {
  const currentFile = useCurrentFile();
  const currentContent = useCurrentContent();
  const isDirty = useIsDirty();
  const theme = useTheme();
  const workspace = useWorkspace();
  const setContent = useAppStore((s) => s.setContent);
  const markSaved = useAppStore((s) => s.markSaved);

  // 解析 front matter
  const { data: frontmatter, body } = useMemo(
    () => parseFrontMatter(currentContent),
    [currentContent]
  );

  // 判断当前深色模式
  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  // ── 回调：更新 body ──────────────────────────────────────
  const handleBodyChange = useCallback(
    (newBody: string) => {
      const full = stringifyFrontMatter(frontmatter, newBody);
      setContent(full);
    },
    [frontmatter, setContent]
  );

  // ── 回调：更新 title ─────────────────────────────────────
  const handleTitleChange = useCallback(
    (title: string) => {
      const updated = { ...frontmatter, title, modified: new Date().toISOString() };
      const full = stringifyFrontMatter(updated, body);
      setContent(full);
    },
    [frontmatter, body, setContent]
  );

  // ── 回调：更新 tags ──────────────────────────────────────
  const handleTagsChange = useCallback(
    (tags: string[]) => {
      const updated = { ...frontmatter, tags, modified: new Date().toISOString() };
      const full = stringifyFrontMatter(updated, body);
      setContent(full);
    },
    [frontmatter, body, setContent]
  );

  // ── 自动保存（debounce 2s）────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!currentFile || !isDirty) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await window.electronAPI?.file.write(currentFile, currentContent);
        // 保存后触发版本快照（IPC 内部有 60s 频率限制）
        window.electronAPI?.history.save(currentFile, currentContent).catch(() => {});
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

  // ── 空状态 ────────────────────────────────────────────────
  if (!currentFile) {
    return (
      <div className={styles.area}>
        <div className={styles.dragArea} />
        <div className={styles.empty}>
          {workspace ? '选择左侧文件开始编辑' : '请先选择工作区'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.area}>
      <div className={styles.dragArea} />
      <div className={styles.scroll}>
        <div className={styles.content}>
          <TitleInput
            title={frontmatter.title ?? ''}
            onChange={handleTitleChange}
          />
          <TagEditor
            tags={frontmatter.tags ?? []}
            onChange={handleTagsChange}
          />
          <div className={styles.divider} />
          <EditorCore
            body={body}
            onBodyChange={handleBodyChange}
            isDark={isDark}
            filePath={currentFile}
          />
        </div>
      </div>
      <FileInfoBar content={currentContent} isDirty={isDirty} />
    </div>
  );
}
