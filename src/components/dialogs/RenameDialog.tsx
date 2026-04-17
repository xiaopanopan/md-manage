import { useState, useRef, useEffect } from 'react';
import styles from './RenameDialog.module.css';

interface Props {
  initialName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({ initialName, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && trimmed !== initialName) {
        onConfirm(trimmed);
      } else {
        onCancel();
      }
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      className={styles.input}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
