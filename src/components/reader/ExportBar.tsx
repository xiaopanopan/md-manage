import { useCallback } from 'react';
import { useCurrentContent, useCurrentFile } from '@/hooks/useAppStore';
import { renderMarkdown, wrapHtmlForExport } from '@/lib/markdown';
import { parseFrontMatter } from '@/lib/frontmatter';
import { useAppStore } from '@/stores/appStore';
import styles from './ExportBar.module.css';

export function ExportBar() {
  const content = useCurrentContent();
  const currentFile = useCurrentFile();
  const workspace = useAppStore((s) => s.workspace);

  const handleExportPdf = useCallback(async () => {
    if (!currentFile) return;
    const { data, body } = parseFrontMatter(content);
    const html = await renderMarkdown(body, workspace ?? undefined);
    const full = wrapHtmlForExport(html, data.title);
    await window.electronAPI?.export.pdf(full);
  }, [content, currentFile, workspace]);

  const handleExportHtml = useCallback(async () => {
    if (!currentFile) return;
    const { data, body } = parseFrontMatter(content);
    const html = await renderMarkdown(body, workspace ?? undefined);
    const full = wrapHtmlForExport(html, data.title);
    await window.electronAPI?.export.html(full);
  }, [content, currentFile, workspace]);

  return (
    <div className={styles.bar}>
      <button className={styles.btn} onClick={handleExportPdf} data-tooltip="导出为 PDF 文件">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 14h8M8 2v9M5 8l3 3 3-3" />
        </svg>
        PDF
      </button>
      <button className={styles.btn} onClick={handleExportHtml} data-tooltip="导出为 HTML 文件">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 14h8M8 2v9M5 8l3 3 3-3" />
        </svg>
        HTML
      </button>
    </div>
  );
}
