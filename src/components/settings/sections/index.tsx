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
    </div>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ['保存', '⌘ S'],
  ['加粗', '⌘ B'],
  ['斜体', '⌘ I'],
  ['插入链接', '⌘ K'],
  ['查找替换', '⌘ F / ⌘ H'],
  ['切换编辑/阅读', '⌘ E'],
  ['打开设置', '⌘ ,'],
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

export function GuideSettings() {
  return (
    <div>
      <h2 className={styles.sectionTitle}>使用说明</h2>

      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', lineHeight: '1.8', color: 'var(--color-gray-800)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '16px 0 8px' }}>基本操作</h3>
        <ol style={{ paddingLeft: '1.2em', margin: '0 0 12px' }}>
          <li>点击侧边栏工具栏的文件夹图标选择工作区目录</li>
          <li>点击 <strong>+</strong> 按钮创建新文件，点击文件夹+按钮创建文件夹</li>
          <li>单击文件打开编辑，右键查看更多操作（重命名、删除、移至归档）</li>
          <li>编辑后 2 秒自动保存，或按 <span className="kbd">⌘ S</span> 立即保存</li>
          <li>顶部 <strong>READ / EDIT</strong> 按钮切换阅读和编辑模式</li>
        </ol>

        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '16px 0 8px' }}>快捷键</h3>
        <table className={styles.shortcutsTable}>
          <tbody>
            <tr><td>保存</td><td><span className="kbd">⌘ S</span></td></tr>
            <tr><td>加粗</td><td><span className="kbd">⌘ B</span></td></tr>
            <tr><td>斜体</td><td><span className="kbd">⌘ I</span></td></tr>
            <tr><td>插入链接</td><td><span className="kbd">⌘ K</span></td></tr>
            <tr><td>查找 / 替换</td><td><span className="kbd">⌘ F</span> / <span className="kbd">⌘ H</span></td></tr>
            <tr><td>切换模式</td><td><span className="kbd">⌘ E</span></td></tr>
            <tr><td>打开设置</td><td><span className="kbd">⌘ ,</span></td></tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '16px 0 8px' }}>Markdown 语法</h3>
        <table className={styles.shortcutsTable}>
          <tbody>
            <tr><td><code># 标题</code></td><td>一级标题（# ~ ######）</td></tr>
            <tr><td><code>**粗体**</code></td><td><strong>粗体文字</strong></td></tr>
            <tr><td><code>*斜体*</code></td><td><em>斜体文字</em></td></tr>
            <tr><td><code>[文字](url)</code></td><td>链接</td></tr>
            <tr><td><code>![](path)</code></td><td>图片（支持粘贴/拖拽）</td></tr>
            <tr><td><code>`代码`</code></td><td>行内代码</td></tr>
            <tr><td><code>&gt; 引用</code></td><td>引用块</td></tr>
            <tr><td><code>- 列表</code></td><td>无序列表</td></tr>
            <tr><td><code>1. 列表</code></td><td>有序列表</td></tr>
            <tr><td><code>- [ ] 任务</code></td><td>任务列表</td></tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '16px 0 8px' }}>主题</h3>
        <p style={{ margin: '0 0 12px' }}>
          点击侧边栏工具栏的太阳/月亮图标切换主题（浅色 → 深色 → 跟随系统）。
        </p>

        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '16px 0 8px' }}>导出</h3>
        <p style={{ margin: 0 }}>
          切换到阅读模式（READ）后，底部可选择导出为 PDF 或 HTML 文件。
        </p>
      </div>
    </div>
  );
}
