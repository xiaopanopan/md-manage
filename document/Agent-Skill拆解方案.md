# md-manage — Agent / Skill 拆解方案

## 设计原则

- **1 个 Agent 对应 1 个核心功能**，职责清晰
- **每个 Agent 含 3~4 个 Skill**，粒度适中
- **Agent 0** 是基础设施，必须先跑
- **Agent 1~3** 对应三大功能，可并行
- **Agent 4** 是辅助功能，依赖 1~3
- **Agent 5** 是精修，最后跑

---

## 总览

```
Agent 0: 基础设施        ← 必须先跑，其他所有 Agent 依赖它
Agent 1: 文件管理        ← 功能 1（左侧 Sidebar）
Agent 2: Markdown 编辑器 ← 功能 2（右侧 Editor）
Agent 3: 阅读模式        ← 功能 3（右侧 Reader）
Agent 4: 辅助功能        ← 搜索、历史、设置（依赖 1~3）
Agent 5: 主题与质量      ← 暗色主题、性能、测试（最后跑）
```

**依赖关系**：
```
        Agent 0 (基础设施)
       /    |    \
Agent 1  Agent 2  Agent 3    ← 可并行
       \    |    /
        Agent 4 (辅助功能)
            |
        Agent 5 (精修)
```

---

## Agent 0: 基础设施

> 分支: `feature/foundation`
> 前置条件: 无

| Skill | 名称 | 产出文件 | 说明 |
|-------|------|----------|------|
| **S0.1** | 项目骨架 | `electron/main.ts`, `preload.ts`, `vite.config.ts`, `package.json`, `tsconfig*.json` | Electron + React + Vite + TS 脚手架 |
| **S0.2** | 设计系统 | `src/styles/variables.css`, `reset.css`, `global.css` | CSS Variables + 明暗主题变量 |
| **S0.3** | 状态管理 | `src/stores/appStore.ts`, `src/hooks/useAppStore.ts`, `src/types/state.ts` | Zustand + immer + persist |
| **S0.4** | 类型契约 | `src/types/file.ts`, `src/types/ipc.ts`, `src/types/css-modules.d.ts` | 共享接口定义 |

---

## Agent 1: 文件管理（功能 1）

> 分支: `feature/file-manager`
> 前置条件: Agent 0

| Skill | 名称 | 产出文件 | 说明 |
|-------|------|----------|------|
| **S1.1** | 文件系统 IPC | `electron/ipc/fileSystem.ts`, `config.ts` | CRUD + chokidar + workspace |
| **S1.2** | 侧边栏 UI | `src/components/sidebar/*` (5 组件) | 256px 侧边栏 + 文件树 |
| **S1.3** | 右键菜单 | `electron/ipc/contextMenu.ts`, `RenameDialog.tsx` | 原生菜单 + 内联重命名 |
| **S1.4** | 导入功能 | `electron/ipc/import.ts` | 文件/文件夹/拖拽导入 |

---

## Agent 2: Markdown 编辑器（功能 2）

> 分支: `feature/editor`
> 前置条件: Agent 0

| Skill | 名称 | 产出文件 | 说明 |
|-------|------|----------|------|
| **S2.1** | CodeMirror 核心 | `EditorCore.tsx`, `EditorExtensions.ts` | CM6 + Compartment 主题热切换 |
| **S2.2** | 元数据编辑 | `TitleInput.tsx`, `TagEditor.tsx`, `frontmatter.ts` | Front Matter 解析/序列化 |
| **S2.3** | 编辑器功能 | `shortcuts.ts`, `wordCount.ts`, `FileInfoBar.tsx` | 快捷键 + 字数 + 信息栏 |
| **S2.4** | 图片与保存 | `EditorArea.tsx`, `EditorExtensions.ts`(imageHandlers) | 粘贴/拖拽图片 + 自动保存 2s |

---

## Agent 3: 阅读模式（功能 3）

> 分支: `feature/reader`
> 前置条件: Agent 0

| Skill | 名称 | 产出文件 | 说明 |
|-------|------|----------|------|
| **S3.1** | 渲染引擎 | `markdown.ts`, `reader.css` | unified 管道 + 图片路径转换 |
| **S3.2** | 阅读视图 | `MarkdownRenderer.tsx`, `ImageLightbox.tsx` | 异步渲染 + 图片放大 |
| **S3.3** | 导出功能 | `ExportBar.tsx` | PDF/HTML 导出 |
| **S3.4** | 模式切换 | `App.tsx`(Cmd+E) | READ↔EDIT 切换 + 自动保存 |

---

## Agent 4: 辅助功能

> 分支: `feature/auxiliary`
> 前置条件: Agent 1 + 2

| Skill | 名称 | 产出文件 | 说明 |
|-------|------|----------|------|
| **S4.1** | 快速搜索 | `SearchModal.tsx` | Cmd+P + fuse.js 模糊匹配 |
| **S4.2** | 版本历史 | `electron/ipc/history.ts`, `HistoryPanel.tsx` | 快照 + diff + 回退 |
| **S4.3** | 设置面板 | `SettingsPanel.tsx`, `sections/index.tsx` | Cmd+, 四分区设置 |

---

## Agent 5: 主题与质量

> 分支: `feature/polish`
> 前置条件: Agent 0~4 全部完成

| Skill | 名称 | 产出文件 | 说明 |
|-------|------|----------|------|
| **S5.1** | 暗色主题 | `theme-dark.css`, `animations.css` | 深度覆盖 + 200ms 切换动画 |
| **S5.2** | 性能优化 | `markdown.worker.ts` | Web Worker 大文件渲染 |
| **S5.3** | 测试与 CI | `tests/unit/*`, `.github/workflows/ci.yml` | Vitest + GitHub Actions |

---

## 统计

| 项目 | 数量 |
|------|------|
| Agent | 6 个 |
| Skill | 19 个 |
| Skill 文件 | 6 个 SKILL.md（内嵌在 Agent 中） |
