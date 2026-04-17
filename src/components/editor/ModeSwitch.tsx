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

  const handleSwitch = async (mode: 'read' | 'edit') => {
    if (mode === viewMode) return;
    // 切换到阅读模式前保存
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
        className={`${styles.btn} ${viewMode === 'read' ? styles.active : ''}`}
        onClick={() => handleSwitch('read')}
      >
        Read
      </button>
      <button
        className={`${styles.btn} ${viewMode === 'edit' ? styles.active : ''}`}
        onClick={() => handleSwitch('edit')}
      >
        Edit
      </button>
    </div>
  );
}
