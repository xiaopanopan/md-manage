import { useState, useEffect, useCallback } from 'react';
import { diffLines } from 'diff';
import type { Version } from '@/types/file';
import {
  useHistoryOpen,
  useCurrentFile,
  useCurrentContent,
  useUIActions,
  useFileActions,
} from '@/hooks/useAppStore';
import styles from './HistoryPanel.module.css';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HistoryPanel() {
  const isOpen = useHistoryOpen();
  const currentFile = useCurrentFile();
  const currentContent = useCurrentContent();
  const { closeHistory } = useUIActions();
  const { setCurrentFile } = useFileActions();

  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [diffHtml, setDiffHtml] = useState<React.ReactNode[] | null>(null);

  // 加载版本列表
  useEffect(() => {
    if (!isOpen || !currentFile) return;
    (async () => {
      try {
        const list = await window.electronAPI?.history.list(currentFile);
        setVersions(list ?? []);
        setSelectedId(null);
        setDiffHtml(null);
      } catch { setVersions([]); }
    })();
  }, [isOpen, currentFile]);

  // 选中版本 → 计算 diff
  useEffect(() => {
    if (!selectedId || !currentFile) { setDiffHtml(null); return; }
    (async () => {
      try {
        const oldContent = await window.electronAPI?.history.get(currentFile, selectedId);
        if (oldContent == null) return;
        const changes = diffLines(oldContent, currentContent);
        const nodes: React.ReactNode[] = changes.map((part, i) => {
          const cls = part.added ? styles.diffAdd : part.removed ? styles.diffRemove : '';
          return <span key={i} className={cls}>{part.value}</span>;
        });
        setDiffHtml(nodes);
      } catch { setDiffHtml(null); }
    })();
  }, [selectedId, currentFile, currentContent]);

  const handleRestore = useCallback(async () => {
    if (!selectedId || !currentFile) return;
    if (!window.confirm('恢复到此版本？当前内容将被覆盖。')) return;
    try {
      await window.electronAPI?.history.restore(currentFile, selectedId);
      const content = await window.electronAPI?.file.read(currentFile) ?? '';
      setCurrentFile(currentFile, content);
      closeHistory();
    } catch (err) {
      console.error('[History] restore failed:', err);
    }
  }, [selectedId, currentFile, setCurrentFile, closeHistory]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={closeHistory}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>版本历史</span>
          <button className={styles.closeBtn} onClick={closeHistory}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>

        {versions.length === 0 ? (
          <div className={styles.empty}>暂无历史版本</div>
        ) : diffHtml ? (
          <div className={styles.diffContainer}>{diffHtml}</div>
        ) : (
          <div className={styles.list}>
            {versions.map((v) => (
              <div
                key={v.id}
                className={`${styles.versionItem} ${selectedId === v.id ? styles.active : ''}`}
                onClick={() => setSelectedId(v.id)}
              >
                <span className={styles.versionDate}>{formatDate(v.createdAt)}</span>
                <span className={styles.versionSummary}>{v.summary || '(空)'}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            disabled={!selectedId || !!diffHtml}
            onClick={() => selectedId && setSelectedId(selectedId)}
          >
            查看 Diff
          </button>
          {diffHtml && (
            <button className={styles.actionBtn} onClick={() => setDiffHtml(null)}>
              返回列表
            </button>
          )}
          <button
            className={styles.actionBtn}
            disabled={!selectedId}
            onClick={handleRestore}
          >
            恢复此版本
          </button>
        </div>
      </div>
    </div>
  );
}
