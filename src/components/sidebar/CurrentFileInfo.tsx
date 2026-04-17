import { useCurrentFile, useCurrentContent } from '@/hooks/useAppStore';
import styles from './CurrentFileInfo.module.css';

function countWords(content: string): number {
  const clean = content.replace(/^---[\s\S]*?---\n/, '');
  const cjk = (clean.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? []).length;
  const latin = (clean.match(/\b[a-zA-Z']+\b/g) ?? []).length;
  return cjk + latin;
}

export function CurrentFileInfo() {
  const currentFile = useCurrentFile();
  const content = useCurrentContent();

  if (!currentFile) return null;

  const fileName = currentFile.split('/').pop() ?? currentFile;
  const baseName = fileName.replace(/\.md$/i, '');
  const words = countWords(content);
  const readTime = Math.ceil(words / 300) || 1;

  return (
    <div className={styles.panel}>
      <div className={styles.filename}>{baseName}</div>
      <div className={styles.meta}>
        <span className={styles.metaItem}>{words} 字</span>
        <span className={styles.metaItem}>{readTime} 分钟</span>
      </div>
    </div>
  );
}
