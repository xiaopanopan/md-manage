import { FormEvent, useEffect, useRef, useState } from 'react';
import styles from './CreateDialog.module.css';

interface Props {
  kind: 'file' | 'folder';
  onConfirm: (name: string) => Promise<void>;
  onCancel: () => void;
}

export function CreateDialog({ kind, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(kind === 'file' ? 'untitled.md' : '新文件夹');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    input?.focus();
    if (kind === 'file') {
      const extensionIndex = name.toLowerCase().endsWith('.md') ? name.length - 3 : name.length;
      input?.setSelectionRange(0, extensionIndex);
    } else {
      input?.select();
    }
  }, [kind]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(value);
    } catch (cause) {
      console.error('[CreateDialog] create failed:', cause);
      setError('创建失败：名称可能已存在或不可用。');
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={() => {
        if (!submitting) onCancel();
      }}
    >
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-dialog-title"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="create-dialog-title">{kind === 'file' ? '新建 Markdown 文件' : '新建文件夹'}</h2>
        <input
          ref={inputRef}
          value={name}
          disabled={submitting}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !submitting) onCancel();
          }}
          aria-invalid={Boolean(error)}
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={submitting}>取消</button>
          <button type="submit" className={styles.primary} disabled={!name.trim() || submitting}>
            {submitting ? '创建中…' : '创建'}
          </button>
        </div>
      </form>
    </div>
  );
}
