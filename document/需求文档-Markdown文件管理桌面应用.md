# md-manage — Markdown 文件管理桌面应用

## 1. 项目概述

一款专注于写作的本地 Markdown 编辑器，极简设计，纯本地存储。

**技术栈**：Electron 28 + React 18 + Vite + TypeScript + CodeMirror 6 + Zustand

## 2. 三大核心功能

### 2.1 左侧文件管理（Sidebar）

固定 256px 宽度的文件管理面板。

- 工作区选择（首次启动弹出对话框）
- 文件树递归显示，仅展示 `.md` 文件
- 单击打开文件，右键菜单（重命名、删除）
- 内联重命名输入框
- 新建文件按钮（在活动目录下创建）
- 底部当前文件信息（文件名、字数）
- chokidar 文件监听，外部修改自动刷新

### 2.2 Markdown 编辑器（Editor）

基于 CodeMirror 6 的纯代码编辑体验，无工具栏。

- Markdown 语法高亮（标题、粗体、斜体、链接、代码）
- 行号 + 当前行高亮
- 快捷键：Cmd+B 加粗、Cmd+I 斜体、Cmd+K 链接
- Undo/Redo（Cmd+Z / Cmd+Shift+Z）
- 自动保存（2s debounce）+ Cmd+S 手动保存
- 大标题输入框（Front Matter title）
- 标签编辑器（Front Matter tags）
- 图片粘贴/拖拽 → 保存到 `.digitalzen/images/` → 插入 Markdown 引用
- 底部信息栏：字数、阅读时间、保存状态
- 明暗主题 Compartment 热切换

### 2.3 阅读模式（Reader）

unified 渲染管道，精致排版。

- remark-parse → remark-gfm → remark-rehype → rehype-highlight → rehype-sanitize → rehype-stringify
- GFM 支持：表格、任务列表、删除线
- 代码块语法高亮（highlight.js）
- 本地图片路径自动转 `file://` 协议
- 图片点击放大（Lightbox）
- 阅读排版：720px 最大宽度，serif 字体，1.8 行高
- 底部导出栏：PDF / HTML 导出

## 3. 模式切换

- Cmd+E 切换 READ / EDIT
- 切换到阅读模式前自动保存
- 切换有淡入动画

## 4. 辅助功能

| 功能 | 快捷键 | 说明 |
|------|--------|------|
| 快速搜索 | Cmd+P | fuse.js 模糊匹配，无输入显示最近文件 |
| 版本历史 | Cmd+Shift+H | 右侧抽屉，diff 对比，版本回退 |
| 设置面板 | Cmd+, | 通用/编辑器/外观/快捷键四分区 |
| 主题切换 | 设置面板 | light / dark / auto（跟随系统）|

## 5. 数据存储

纯文件系统，零数据库。

```
workspace/                 # 用户选择的工作区
└── .md-manage/            # 应用数据（隐藏）
    └── images/            # 粘贴的图片
```

## 6. 项目结构

```
md-manage/
├── electron/              # Electron 主进程
│   ├── main.ts            # 入口：窗口创建、handler 注册
│   ├── preload.ts         # contextBridge 白名单 API
│   ├── windowState.ts     # 窗口位置/大小持久化
│   └── ipc/
│       ├── fileSystem.ts  # 文件 CRUD + chokidar + image:save + export
│       ├── config.ts      # config get/set
│       ├── contextMenu.ts # 原生右键菜单
│       ├── history.ts     # 版本快照 CRUD
│       ├── import.ts      # 文件/文件夹导入
│       └── window.ts      # 窗口控制（最小化/最大化/全屏）
├── src/                   # React 渲染进程
│   ├── App.tsx            # 根布局：sidebar + editor/reader + 弹窗
│   ├── main.tsx           # 入口：ReactDOM + CSS 导入
│   ├── components/
│   │   ├── sidebar/       # ← 功能 1：文件管理
│   │   │   ├── Sidebar.tsx
│   │   │   ├── FileTree.tsx
│   │   │   ├── FileItem.tsx
│   │   │   ├── Folder.tsx
│   │   │   └── CurrentFileInfo.tsx
│   │   ├── editor/        # ← 功能 2：MD 编辑
│   │   │   ├── EditorArea.tsx       # 编排：frontmatter 解析 + 自动保存
│   │   │   ├── EditorCore.tsx       # CodeMirror 6 受控组件
│   │   │   ├── EditorExtensions.ts  # CM6 扩展/主题/图片处理
│   │   │   ├── TitleInput.tsx
│   │   │   ├── TagEditor.tsx
│   │   │   └── FileInfoBar.tsx
│   │   ├── reader/        # ← 功能 3：阅读模式
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── ExportBar.tsx
│   │   │   └── ImageLightbox.tsx
│   │   ├── search/        # 辅助：Cmd+P 搜索弹窗
│   │   ├── history/       # 辅助：版本历史抽屉
│   │   ├── settings/      # 辅助：设置面板
│   │   └── dialogs/       # 辅助：重命名等小弹窗
│   ├── lib/               # 纯函数工具
│   │   ├── frontmatter.ts # gray-matter 解析/序列化
│   │   ├── markdown.ts    # unified 渲染管道
│   │   ├── wordCount.ts   # 中英文字数统计
│   │   └── shortcuts.ts   # CodeMirror 快捷键
│   ├── stores/appStore.ts # Zustand + immer + persist
│   ├── hooks/             # 细粒度 selector hooks
│   ├── types/             # TypeScript 类型契约
│   └── styles/            # CSS Variables + 主题 + 排版
├── tests/unit/            # Vitest 单元测试
└── .github/workflows/     # CI: tsc + vitest + build
```

## 7. IPC 通信接口

渲染进程通过 `window.electronAPI` 调用，preload 白名单模式：

```
file:    read / write / delete / rename / list / create
workspace: open / get / init
config:  get / set
image:   save / getAbsPath
export:  pdf / html
import:  files / folder / drop
history: save / list / get / restore
contextMenu: show
window:  minimize / maximize / close / setFullscreen
事件:    onFileChanged / onMenuAction
```

## 8. 非功能需求

- 启动 < 3 秒
- 打开文件 < 500ms
- 搜索响应 < 50ms
- macOS + Windows 跨平台
- 主题切换 200ms 平滑动画
- 数据完全本地化
