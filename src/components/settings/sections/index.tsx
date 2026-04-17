import styles from '../SettingsPanel.module.css';
import { useWorkspace } from '@/hooks/useAppStore';
import { useAppStore } from '@/stores/appStore';
import type { Theme } from '@/types/state';

export function GeneralSettings() {
  const workspace = useWorkspace();
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const setFiles = useAppStore((s) => s.setFiles);

  const handleChangeWorkspace = async () => {
    const ws = await window.electronAPI?.workspace.open();
    if (ws) {
      setWorkspace(ws);
      const files = await window.electronAPI?.file.list(ws);
      if (files) setFiles(files);
    }
  };

  return (
    <div>
      <h2 className={styles.sectionTitle}>通用</h2>

      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>工作区</div>
          <div className={styles.settingDesc}>Markdown 文件的存储目录</div>
        </div>
        <div className={styles.settingControl} style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <span className={styles.workspacePath}>{workspace ?? '未设置'}</span>
          <button className={styles.actionBtn} onClick={handleChangeWorkspace}>
            更改…
          </button>
        </div>
      </div>

      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>版本</div>
        </div>
        <div className={styles.settingControl}>
          <span style={{ fontFamily: 'var(--font-code)', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
            0.1.0
          </span>
        </div>
      </div>
    </div>
  );
}

export function EditorSettings() {
  const saveEditorSetting = async (key: string, value: unknown) => {
    await window.electronAPI?.config.set(`settings.editor.${key}`, value);
  };

  return (
    <div>
      <h2 className={styles.sectionTitle}>编辑器</h2>

      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>字体大小</div>
        </div>
        <div className={styles.settingControl}>
          <select
            className={styles.select}
            defaultValue="14"
            onChange={(e) => saveEditorSetting('fontSize', Number(e.target.value))}
          >
            {[12, 13, 14, 15, 16, 18, 20].map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>Tab 宽度</div>
        </div>
        <div className={styles.settingControl}>
          <select
            className={styles.select}
            defaultValue="2"
            onChange={(e) => saveEditorSetting('tabSize', Number(e.target.value))}
          >
            <option value="2">2 空格</option>
            <option value="4">4 空格</option>
          </select>
        </div>
      </div>

      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>自动保存</div>
          <div className={styles.settingDesc}>输入停止后自动保存</div>
        </div>
        <div className={styles.settingControl}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              defaultChecked
              onChange={(e) => saveEditorSetting('autoSave', e.target.checked)}
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>
      </div>

      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>自动保存延迟</div>
        </div>
        <div className={styles.settingControl}>
          <select
            className={styles.select}
            defaultValue="2000"
            onChange={(e) => saveEditorSetting('autoSaveDelay', Number(e.target.value))}
          >
            <option value="1000">1 秒</option>
            <option value="2000">2 秒</option>
            <option value="5000">5 秒</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function AppearanceSettings() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const sidebarVisible = useAppStore((s) => s.sidebarVisible);
  const setSidebarVisible = useAppStore((s) => s.setSidebarVisible);

  return (
    <div>
      <h2 className={styles.sectionTitle}>外观</h2>

      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>主题</div>
        </div>
        <div className={styles.settingControl}>
          <select
            className={styles.select}
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <option value="auto">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
      </div>

      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>显示侧边栏</div>
        </div>
        <div className={styles.settingControl}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={sidebarVisible}
              onChange={(e) => setSidebarVisible(e.target.checked)}
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>
      </div>
    </div>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ['新建文件', '⌘ N'],
  ['打开工作区', '⌘ O'],
  ['保存', '⌘ S'],
  ['切换编辑/阅读', '⌘ E'],
  ['快速搜索', '⌘ P'],
  ['打开设置', '⌘ ,'],
  ['导出', '⌘ ⇧ E'],
  ['切换侧边栏', '⌘ \\'],
  ['版本历史', '⌘ ⇧ H'],
];

export function ShortcutsSettings() {
  return (
    <div>
      <h2 className={styles.sectionTitle}>快捷键</h2>
      <table className={styles.shortcutsTable}>
        <tbody>
          {SHORTCUTS.map(([label, kbd]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>
                <span className="kbd">{kbd}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
