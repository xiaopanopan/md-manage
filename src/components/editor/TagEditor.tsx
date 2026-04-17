import { useState } from 'react';
import styles from './TagEditor.module.css';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagEditor({ tags, onChange }: Props) {
  const [input, setInput] = useState('');

  const addTag = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className={styles.container}>
      {tags.map((tag, i) => (
        <span key={tag} className={styles.tag}>
          {tag}
          <span className={styles.tagRemove} onClick={() => removeTag(i)}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l6 6M8 2L2 8" />
            </svg>
          </span>
        </span>
      ))}
      <input
        className={styles.input}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) {
            addTag(input);
            setInput('');
          }
        }}
        placeholder={tags.length === 0 ? '添加标签…' : ''}
      />
    </div>
  );
}
