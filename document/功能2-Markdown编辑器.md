# 功能 2：Markdown 编辑器（Editor）

## 1. 功能概述

基于 CodeMirror 6 的纯代码编辑体验，无工具栏，支持 Markdown 语法高亮、Front Matter 元数据编辑、图片粘贴/拖拽、自动保存。

## 2. 涉及文件

### 渲染进程

| 文件 | 职责 |
|------|------|
| `src/components/editor/EditorArea.tsx` | 编排组件：Front Matter 解析 ↔ body 同步、自动保存、Cmd+S |
| `src/components/editor/EditorCore.tsx` | CodeMirror 6 受控组件：创建/销毁 view、外部同步、主题热切换 |
| `src/components/editor/EditorExtensions.ts` | CM6 扩展工厂：主题、语法高亮、快捷键、图片处理、变更回调 |
| `src/components/editor/TitleInput.tsx` | 大标题输入框（Front Matter title） |
| `src/components/editor/TagEditor.tsx` | 标签编辑器（Front Matter tags） |
| `src/components/editor/FileInfoBar.tsx` | 底部信息栏：字数 + 阅读时间 + 保存状态 |

### Lib 工具

| 文件 | 职责 |
|------|------|
| `src/lib/frontmatter.ts` | gray-matter 封装：parseFrontMatter / stringifyFrontMatter |
| `src/lib/wordCount.ts` | 中英文混排字数统计 + 阅读时间计算 |
| `src/lib/shortcuts.ts` | CodeMirror KeyBinding：Mod-B / Mod-I / Mod-K |

### 主进程

| 文件 | 相关 IPC |
|------|----------|
| `electron/ipc/fileSystem.ts` | `file:write`（保存）、`image:save`（图片） |
| `electron/ipc/history.ts` | `history:save`（保存后触发版本快照） |

## 3. 实施细节

### 3.1 编辑器架构

**数据流**：
```
currentContent (zustand, 含 front matter)
        ↓ parseFrontMatter()
  { data: FrontMatterData, body: string }
        ↓
  ┌─────────────┬──────────────┬──────────────┐
  │ TitleInput   │ TagEditor    │ EditorCore   │
  │ data.title   │ data.tags    │ body         │
  └──────┬───────┴──────┬───────┴──────┬───────┘
         │              │              │
         └──────────────┴──────────────┘
                        ↓ 任意变更
            stringifyFrontMatter(data, body)
                        ↓
              setContent(fullContent) → isDirty = true
                        ↓ 2s debounce
              file:write(currentFile, currentContent)
              history:save(currentFile, currentContent)
              markSaved() → isDirty = false
```

### 3.2 Front Matter 处理

**FrontMatterData 接口**：
```typescript
interface FrontMatterData {
  title?: string;
  created?: string;    // ISO 8601
  modified?: string;   // ISO 8601
  tags?: string[];
  [key: string]: unknown;
}
```

**parseFrontMatter(content)**：
- 使用 `gray-matter` 解析 `---\n...\n---` 块
- 返回 `{ data, body }`，解析失败返回 `{ data: {}, body: content }`

**stringifyFrontMatter(data, body)**：
- 过滤空值（undefined/null/空字符串/空数组）
- 无有效字段时直接返回 body（不生成空 front matter 块）
- 使用 `gray-matter.stringify(body, data)` 生成

### 3.3 CodeMirror 6 配置

**EditorCore 受控模式**：
```
filePath 变化 → 销毁旧 view → 创建新 EditorState + EditorView
body 外部变化 → dispatch({ changes: { from: 0, to: doc.length, insert: body } })
isDark 变化  → dispatch({ effects: themeCompartment.reconfigure(newTheme) })
```

**createExtensions(isDark, onChange) 返回**：
1. `themeCompartment.of(lightTheme | darkTheme)` — Compartment 热切换
2. `markdown({ base: markdownLanguage, codeLanguages: languages })` — Markdown 语言
3. `lineNumbers()` + `highlightActiveLine()` + `highlightActiveLineGutter()`
4. `drawSelection()` + `dropCursor()` + `rectangularSelection()`
5. `indentOnInput()` + `bracketMatching()` + `history()`
6. `keymap.of([...markdownKeymap, indentWithTab, ...defaultKeymap, ...historyKeymap])`
7. `imageHandlers()` — 粘贴/拖拽图片
8. `EditorView.updateListener.of(update => onChange(doc))` — 变更回调

**语法高亮（HighlightStyle.define）**：

| 元素 | 浅色 | 深色 |
|------|------|------|
| H1 | fontWeight 700, fontSize 1.4em | 同 + color #e8e8e8 |
| H2 | fontWeight 700, fontSize 1.25em | 同 + color #e0e0e0 |
| strong | fontWeight 700 | 同 |
| emphasis | fontStyle italic | 同 |
| link | color #0066cc, underline | color #6cb6ff |
| code | font-code, 0.9em, bg rgba(0,0,0,0.04) | bg rgba(255,255,255,0.06) |
| meta | color rgba(0,0,0,0.4) | rgba(232,232,232,0.4) |

**编辑器基础主题**：
- 字体：JetBrains Mono, 14px, lineHeight 1.8
- 光标颜色：浅色 #000 / 深色 #e8e8e8
- 行号：透明背景，paddingRight 8px，fontSize 11px
- 内容 padding-bottom：200px（滚动余量）
- `.cm-scroller`：overflow visible（外部容器处理滚动）

### 3.4 快捷键

| 快捷键 | 功能 | 实现 |
|--------|------|------|
| Mod-B | 加粗 `**text**` | `toggleInlineMarker('**')` — 选中已包裹则取消 |
| Mod-I | 斜体 `*text*` | `toggleInlineMarker('*')` |
| Mod-K | 插入链接 `[text](url)` | `insertLink()` — 选中 url 部分方便替换 |
| Mod-Z | 撤销 | CodeMirror `historyKeymap` |
| Mod-Shift-Z | 重做 | CodeMirror `historyKeymap` |
| Tab | 缩进 | `indentWithTab` |

### 3.5 图片处理

**粘贴图片**（`EditorView.domEventHandlers.paste`）：
1. 检查 `clipboardData.items` 中是否有 `image/*` 类型
2. 有 → `preventDefault()`，提取 `File` → `arrayBuffer()` → `Uint8Array`
3. 调用 `image:save(Array.from(buffer), ext)`
4. 返回相对路径 → `insertText(view, '![](relativePath)')`

**拖拽图片**（`EditorView.domEventHandlers.drop`）：
1. 检查 `dataTransfer.files` 中的图片文件
2. 逐个保存 → 插入 Markdown 引用（每个后加 `\n`）

**image:save IPC**（`fileSystem.ts`）：
- 保存到 `workspace/.digitalzen/images/{timestamp}.{ext}`
- 返回相对路径 `.digitalzen/images/{timestamp}.{ext}`

### 3.6 自动保存

**EditorArea.tsx 实现**：
```
isDirty 变为 true
  → clearTimeout(timer)
  → setTimeout(2000ms):
      file:write(currentFile, currentContent)
      history:save(currentFile, currentContent)  // 版本快照，60s 限频
      markSaved()
```

**Cmd+S 手动保存**：
- `clearTimeout` 取消 debounce
- 立即执行 `file:write` + `history:save` + `markSaved`

### 3.7 TitleInput

- `<textarea>` 元素，自适应高度（`scrollHeight`）
- 字体：`var(--font-serif)` 36px bold
- placeholder："无标题"
- Enter 键 → `preventDefault()` → 聚焦 `.cm-content`（跳到编辑器）
- 值变更 → `handleTitleChange(title)` → 更新 front matter + `setContent`

### 3.8 TagEditor

- pill 样式标签列表 + 行内输入框
- Enter / 逗号 → 添加标签（去重、trim、lowercase）
- Backspace（输入为空时）→ 删除最后一个标签
- blur → 提交当前输入
- 标签右侧 × 按钮删除

### 3.9 FileInfoBar

底部 32px 信息栏，显示：
- 字数（`countWords(content)`）
- 阅读时间（`readingTime(wordCount)`）
- 保存状态：`isDirty ? '已修改' : '已保存'`

### 3.10 布局结构

```
EditorArea (.area, flex column, 100vh)
├── .dragArea (52px, macOS traffic lights)
├── .scroll (flex: 1, overflow-y: auto)
│   └── .content (max-width: 720px, margin: 0 auto, padding: 0 24px)
│       ├── TitleInput
│       ├── TagEditor
│       ├── .divider (1px 分隔线)
│       └── EditorCore (.wrapper, flex: 1)
└── FileInfoBar (32px, flex-shrink: 0)
```

### 3.11 状态依赖

```
useCurrentFile()    → 当前文件路径（触发编辑器重建）
useCurrentContent() → 完整内容（含 front matter）
useIsDirty()        → 是否有未保存修改
useTheme()          → 主题（驱动 isDark 计算）
useWorkspace()      → 工作区路径（空状态判断）
useAppStore(s => s.setContent / markSaved)
```
