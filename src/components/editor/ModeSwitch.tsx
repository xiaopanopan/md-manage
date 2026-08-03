import { useViewMode, useUIActions } from '@/hooks/useAppStore';
import { useAppStore } from '@/stores/appStore';
import { flushCurrentDocument } from '@/services/documentSession';
import styles from './ModeSwitch.module.css';

export function ModeSwitch() {
  const viewMode = useViewMode();
  const { switchMode } = useUIActions();
  const currentFile = useAppStore((s) => s.currentFile);
  const isDirty = useAppStore((s) => s.isDirty);

  const disabled = !currentFile;

  const handleSwitch = async (mode: 'read' | 'edit') => {
    if (disabled || mode === viewMode) return;
    if (viewMode === 'edit' && isDirty && currentFile) {
      try {
        await flushCurrentDocument();
      } catch (err) {
        console.error('[ModeSwitch] save failed:', err);
        window.alert('保存失败，无法切换到阅读模式。');
        return;
      }
    }
    switchMode(mode);
  };

  return (
    <div className={styles.container}>
      <button
        className={`${styles.btn} ${viewMode === 'read' ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => handleSwitch('read')}
        data-tooltip="阅读模式 (⌘E)"
      >
        阅读
      </button>
      <button
        className={`${styles.btn} ${viewMode === 'edit' ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => handleSwitch('edit')}
        data-tooltip="编辑模式 (⌘E)"
      >
        编辑
      </button>
    </div>
  );
}
