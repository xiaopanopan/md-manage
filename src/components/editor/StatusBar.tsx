import styles from './StatusBar.module.css';

interface Props {
  line: number;
  col: number;
}

export function StatusBar({ line, col }: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.liveTag}>
          <span className={styles.dot} />
          MARKDOWN LIVE
        </span>
        <span className={styles.encoding}>UTF-8</span>
      </div>
      <div className={styles.right}>
        <span className={styles.cursor}>
          L: {line}  C: {col}
        </span>
      </div>
    </div>
  );
}
