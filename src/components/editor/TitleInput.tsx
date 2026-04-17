import { useRef, useEffect } from 'react';
import styles from './TitleInput.module.css';

interface Props {
  title: string;
  onChange: (title: string) => void;
}

export function TitleInput({ title, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自适应高度
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  return (
    <textarea
      ref={textareaRef}
      className={styles.input}
      value={title}
      placeholder="无标题"
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // 按 Enter 跳到编辑器（聚焦 .cm-content）
          const editor = document.querySelector<HTMLElement>('.cm-content');
          editor?.focus();
        }
      }}
    />
  );
}
