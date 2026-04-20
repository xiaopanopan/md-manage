import { useEffect, useState } from 'react';
import { countWords, readingTime } from '@/lib/wordCount';
import styles from './FileInfoBar.module.css';

interface Props {
  content: string;
  isDirty: boolean;
}

export function FileInfoBar({ content, isDirty }: Props) {
  const words = countWords(content);
  const time = readingTime(words);

  // 显示"已保存"提示一段时间
  const [justSaved, setJustSaved] = useState(false);
  const [prevDirty, setPrevDirty] = useState(isDirty);

  useEffect(() => {
    if (prevDirty && !isDirty) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(t);
    }
    setPrevDirty(isDirty);
  }, [isDirty, prevDirty]);

  const status = isDirty ? '未保存' : justSaved ? '已保存' : '自动保存';

  return (
    <div className={styles.bar}>
      <span>{words} 字</span>
      <span className={styles.separator} />
      <span>{time} 分钟阅读</span>
      <span className={`${styles.saveStatus} ${isDirty ? styles.dirty : styles.saved}`}>
        {isDirty && <span className={styles.dot} />}
        {status}
      </span>
    </div>
  );
}
