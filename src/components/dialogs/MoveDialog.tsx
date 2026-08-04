import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { FileNode } from '@/types/file';
import {
  collectFolderOptions,
  validateMoveTarget,
  type MoveTargetStatus,
} from '@/lib/explorer/moveTargets';
import { relativeDisplayPath } from '@/lib/explorer/tree';
import { describeDesktopError } from '@/lib/errors';
import styles from './MoveDialog.module.css';

const STATUS_LABEL: Record<Exclude<MoveTargetStatus, 'ok'>, string> = {
  'same-parent': '已在此处',
  'into-self': '不能移入自身',
  'name-conflict': '已存在同名项',
};

const INDENT_PER_LEVEL = 14;

interface Props {
  source: FileNode;
  workspace: string;
  nodes: FileNode[];
  onConfirm: (destDir: string) => Promise<void>;
  onCancel: () => void;
}

export function MoveDialog({ source, workspace, nodes, onConfirm, onCancel }: Props) {
  const [filter, setFilter] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const options = useMemo(() => {
    const all = collectFolderOptions(workspace, nodes).map((option) => ({
      ...option,
      status: validateMoveTarget(source, option.path, nodes),
    }));
    const keyword = filter.trim().toLocaleLowerCase();
    if (!keyword) return all;
    return all.filter(
      (option) =>
        option.name.toLocaleLowerCase().includes(keyword) ||
        option.relativePath.toLocaleLowerCase().includes(keyword)
    );
  }, [filter, nodes, source, workspace]);

  const selectable = useMemo(
    () => options.reduce<number[]>((acc, option, index) => {
      if (option.status === 'ok') acc.push(index);
      return acc;
    }, []),
    [options]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 候选集变化后把高亮落到第一个可选项。
  useEffect(() => {
    setActiveIndex(selectable.length > 0 ? selectable[0] : -1);
  }, [selectable]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const moveActive = (delta: number) => {
    if (selectable.length === 0) return;
    const position = selectable.indexOf(activeIndex);
    const next = position < 0 ? 0 : (position + delta + selectable.length) % selectable.length;
    setActiveIndex(selectable[next]);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (submitting) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    }
  };

  const submitTarget = async (index: number) => {
    const target = options[index];
    if (!target || target.status !== 'ok' || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(target.path);
    } catch (cause) {
      console.error('[MoveDialog] move failed:', cause);
      setError(describeDesktopError(cause, '移动失败，文件没有被改动。'));
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitTarget(activeIndex);
  };

  const canSubmit = activeIndex >= 0 && options[activeIndex]?.status === 'ok' && !submitting;

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
        aria-labelledby="move-dialog-title"
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="move-dialog-title">
          移动{source.type === 'folder' ? '文件夹' : '文件'}「{source.name}」
        </h2>
        <p className={styles.location} title={source.parentPath}>
          当前位置：{relativeDisplayPath(workspace, source.parentPath)}
        </p>

        <input
          ref={inputRef}
          value={filter}
          disabled={submitting}
          placeholder="筛选目录…"
          aria-label="筛选目标目录"
          onChange={(event) => setFilter(event.target.value)}
        />

        {options.length === 0 ? (
          <p className={styles.empty}>没有匹配的目录</p>
        ) : (
          <ul className={styles.list} ref={listRef} role="listbox" aria-label="目标目录">
            {options.map((option, index) => {
              const disabled = option.status !== 'ok';
              const active = index === activeIndex;
              return (
                <li key={option.path}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-disabled={disabled}
                    data-active={active}
                    disabled={disabled || submitting}
                    title={option.relativePath}
                    className={`${styles.option} ${active ? styles.active : ''}`}
                    style={{ paddingLeft: `${10 + option.depth * INDENT_PER_LEVEL}px` }}
                    onClick={() => setActiveIndex(index)}
                    onDoubleClick={() => void submitTarget(index)}
                  >
                    <span className={styles.optionName}>{option.name}</span>
                    {option.status !== 'ok' && (
                      <span className={styles.reason}>{STATUS_LABEL[option.status]}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={submitting}>
            取消
          </button>
          <button type="submit" className={styles.primary} disabled={!canSubmit}>
            {submitting ? '移动中…' : '移动'}
          </button>
        </div>
      </form>
    </div>
  );
}
