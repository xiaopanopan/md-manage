import { useViewMode, useUIActions } from '@/hooks/useAppStore';
import { useAppStore } from '@/stores/appStore';
import styles from './ModeSwitch.module.css';

export function ModeSwitch() {
  const viewMode = useViewMode();
  const { switchMode } = useUIActions();
  const currentFile = useAppStore((s) => s.currentFile);
  const currentContent = useAppStore((s) => s.currentContent);
  const isDirty = useAppStore((s) => s.isDirty);
  const markSaved = useAppStore((s) => s.markSaved);

  const disabled = !currentFile;

  const handleSwitch = async (mode: 'read' | 'edit') => {
    if (disabled || mode === viewMode) return;
    if (viewMode === 'edit' && isDirty && currentFile) {
      try {
        await window.electronAPI?.file.write(currentFile, currentContent);
        markSaved();
      } catch (err) {
        console.error('[ModeSwitch] save failed:', err);
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
        Read
      </button>
      <button
        className={`${styles.btn} ${viewMode === 'edit' ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => handleSwitch('edit')}
        data-tooltip="编辑模式 (⌘E)"
      >
        Edit
      </button>
    </div>
  );
}
