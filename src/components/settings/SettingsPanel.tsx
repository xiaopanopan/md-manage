import { useState, useEffect } from 'react';
import { useSettingsOpen, useUIActions } from '@/hooks/useAppStore';
import {
  GeneralSettings,
  EditorSettings,
  AppearanceSettings,
  ShortcutsSettings,
  GuideSettings,
} from './sections/index';
import styles from './SettingsPanel.module.css';

type Section = 'general' | 'editor' | 'appearance' | 'shortcuts' | 'guide';

const NAV_ITEMS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'general',    label: '通用',     icon: '⚙' },
  { id: 'editor',     label: '编辑器',   icon: '✏' },
  { id: 'appearance', label: '外观',     icon: '🎨' },
  { id: 'shortcuts',  label: '快捷键',   icon: '⌨' },
  { id: 'guide',      label: '使用说明', icon: '📖' },
];

const SECTION_MAP: Record<Section, React.ReactNode> = {
  general:    <GeneralSettings />,
  editor:     <EditorSettings />,
  appearance: <AppearanceSettings />,
  shortcuts:  <ShortcutsSettings />,
  guide:      <GuideSettings />,
};

export function SettingsPanel() {
  const settingsOpen = useSettingsOpen();
  const { closeSettings } = useUIActions();
  const [activeSection, setActiveSection] = useState<Section>('general');

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, closeSettings]);

  if (!settingsOpen) return null;

  return (
    <div className={styles.overlay} onClick={closeSettings}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <nav className={styles.nav}>
          <div className={styles.navTitle}>设置</div>
          {NAV_ITEMS.map(({ id, label, icon }) => (
            <div
              key={id}
              className={`${styles.navItem} ${activeSection === id ? styles.active : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <span style={{ fontSize: '13px' }}>{icon}</span>
              {label}
            </div>
          ))}
        </nav>

        <div className={styles.content}>
          <button className={styles.closeBtn} onClick={closeSettings} title="关闭 (Esc)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
          {SECTION_MAP[activeSection]}
        </div>
      </div>
    </div>
  );
}
