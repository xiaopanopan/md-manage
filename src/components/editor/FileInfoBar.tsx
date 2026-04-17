import { countWords, readingTime } from '@/lib/wordCount';
import styles from './FileInfoBar.module.css';

interface Props {
  content: string;
  isDirty: boolean;
}

export function FileInfoBar({ content, isDirty }: Props) {
  const words = countWords(content);
  const time = readingTime(words);

  return (
    <div className={styles.bar}>
      <span>{words} 字</span>
      <span className={styles.separator} />
      <span>{time} 分钟阅读</span>
      <span className={`${styles.saveStatus} ${isDirty ? styles.dirty : styles.saved}`}>
        {isDirty ? '已修改' : '已保存'}
      </span>
    </div>
  );
}
