# 简记 · md-manage

一款本地优先的 Markdown 文件管理与写作桌面应用。工作区就是普通文件夹，不依赖账号、云服务或数据库。

![Electron](https://img.shields.io/badge/Electron-28-47848F)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Vite](https://img.shields.io/badge/Vite-5-646CFF)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

> 当前版本：`0.1.0`，处于功能完善与可靠性优化阶段。

## 当前能力

### 文件管理

- 手动选择并记忆工作区。
- 递归展示文件夹以及 `.md`、`.markdown` 文件。
- 新建文件、创建真实空文件夹、重命名、移动和移到废纸篓。
- 文件或文件夹拖入其他目录进行移动。
- 同名重命名/移动默认阻止，避免静默覆盖。
- 工作区路径守卫，拒绝 `..`、绝对路径和符号链接越界访问。
- chokidar 监听工作区变化并刷新文件树。

### Markdown 编辑

- CodeMirror 6 Markdown 语法高亮、行号、活动行和自动换行。
- `⌘/Ctrl+B` 粗体、`⌘/Ctrl+I` 斜体、`⌘/Ctrl+K` 链接。
- `⌘/Ctrl+F` 查找、`⌘/Ctrl+H` 替换，支持大小写和正则表达式。
- 2 秒 debounce 自动保存以及 `⌘/Ctrl+S` 手动保存。
- 保存操作串行执行；切换文件、工作区、阅读模式或关闭窗口前会先保存。
- 状态栏展示字数、预计阅读时间和保存状态。
- 粘贴或拖入图片后保存至 `.md-manage/images/` 并插入 Markdown 引用。

### 阅读与导出

- unified + remark + rehype 渲染管道。
- GFM 表格、任务列表、删除线和 highlight.js 代码高亮。
- 相对图片以当前 Markdown 文件目录为基准解析。
- `.md-manage/images/...` 以工作区根目录为基准解析。
- 中文、空格和特殊字符路径编码。
- 阅读区搜索、图片放大、PDF 和 HTML 导出。
- Markdown HTML 经 rehype-sanitize 清洗。

### 界面

- 浅色、深色和跟随系统三种主题。
- `⌘/Ctrl+E` 切换编辑/阅读模式。
- `⌘/Ctrl+,` 打开设置与使用说明。
- 窗口位置、尺寸、最大化和全屏状态持久化。

## 快速开始

### 环境

- Node.js 22 或更高版本
- pnpm 10

### 安装与运行

```bash
pnpm install
pnpm run dev
```

项目的 `.npmrc` 已配置 Electron 国内镜像。开发命令会启动 Vite，并自动打开 Electron 窗口。

### 检查、测试和构建

```bash
# Renderer 与 Electron 类型检查
pnpm run build:check

# 交互式测试
pnpm run test

# CI 风格的一次性测试
pnpm exec vitest run

# 生产构建
pnpm run build

# 生成安装包
pnpm run package

# 重新生成应用图标
pnpm run icon
```

生产构建输出到 `dist/`，安装包输出到 `release/`。

## 项目结构

```text
md-manage/
├── electron/
│   ├── main.ts                    # 应用与窗口生命周期
│   ├── preload.ts                 # contextBridge API
│   ├── windowState.ts             # 窗口状态持久化
│   ├── ipc/                       # 文件、配置、菜单、导入、窗口 IPC
│   └── services/
│       └── workspaceGuard.ts      # 工作区路径和符号链接边界
├── src/
│   ├── App.tsx                    # 根布局、主题、全局事件
│   ├── components/
│   │   ├── sidebar/               # 文件树与文件操作
│   │   ├── editor/                # CodeMirror、搜索与状态栏
│   │   ├── reader/                # 阅读、搜索、导出、Lightbox
│   │   ├── settings/              # 设置与使用说明
│   │   └── dialogs/               # 行内重命名
│   ├── services/
│   │   └── documentSession.ts     # 串行保存与文档切换协调
│   ├── stores/                    # Zustand 状态
│   ├── lib/                       # Markdown、Front Matter、字数、快捷键
│   ├── types/                     # FileNode 与 ElectronAPI 契约
│   └── styles/                    # 全局主题和阅读排版
├── tests/unit/                    # Vitest 单元测试
├── document/                      # 技术、调研、规划与历史文档
├── build/                         # 应用图标
├── scripts/                       # 构建辅助脚本
├── electron-builder.yml
└── vite.config.ts
```

## 数据存储

用户内容完全保存在所选工作区：

```text
<workspace>/
├── notes.md
├── subfolder/
│   ├── README.md
│   └── chart.png
└── .md-manage/
    └── images/                    # 应用粘贴/拖入的图片
```

应用配置保存在 Electron `userData/config.json`，主要包括工作区路径和窗口状态。主题及部分 UI 偏好由 Zustand persist 保存在 localStorage。

## 快捷键

| 功能 | macOS | Windows / Linux |
|---|---|---|
| 保存 | `⌘S` | `Ctrl+S` |
| 粗体 | `⌘B` | `Ctrl+B` |
| 斜体 | `⌘I` | `Ctrl+I` |
| 插入链接 | `⌘K` | `Ctrl+K` |
| 查找 | `⌘F` | `Ctrl+F` |
| 替换 | `⌘H` | `Ctrl+H` |
| 编辑/阅读模式 | `⌘E` | `Ctrl+E` |
| 设置 | `⌘,` | `Ctrl+,` |
| 撤销/重做 | `⌘Z` / `⌘⇧Z` | `Ctrl+Z` / `Ctrl+Shift+Z` |

## 安全与可靠性

- Renderer 未启用 Node.js 集成，并使用 context isolation。
- preload 只暴露显式白名单 API。
- 文件 API 被限制在当前工作区内，并检查符号链接逃逸。
- 删除默认进入系统废纸篓，不回退为静默永久删除。
- 同名移动和重命名不会覆盖已有目标。
- Markdown 输出经过 sanitize，本地图片只允许解析到工作区内。
- 自动保存使用串行队列，旧写入不会把新编辑错误标记为已保存。

仍在优化：Electron sandbox/webSecurity、自定义本地资源协议、外部修改冲突处理、设置项真实生效和大型工作区增量加载。

## 已验证状态

当前分支最近一次完整验证结果：

- TypeScript Renderer/Electron 检查通过。
- 4 个测试文件、21 项测试通过。
- Vite Renderer、Electron main 和 preload 生产构建通过。
- `pnpm audit --prod` 无已知漏洞。
- 真实 Electron 窗口完成工作区加载、图片阅读、Lightbox、阅读搜索、编辑自动保存、CRUD、冲突阻止和越界阻止验证。

## 文档

- [文档索引](./document/README.md)
- [技术架构文档](./document/技术架构文档.md)
- [项目调研报告](./document/项目调研报告.md)
- [项目优化与重构方案](./document/项目优化与重构方案.md)

## 已知限制

- 外部修改当前打开文件时，文件树会刷新，但尚未提供完整的内容冲突解决界面。
- 设置面板中的字体大小、Tab 宽度和自动保存选项尚未全部接入编辑器。
- Renderer 仍包含完整 CodeMirror language-data，生产主 chunk 偏大。
- PDF 导出依赖 Electron Chromium；三平台安装包需要分别进行人工验收。
- 应用当前仍设置 `sandbox: false` 和 `webSecurity: false`，后续计划通过受控资源协议收紧。

## License

`package.json` 声明 MIT。正式发布前应补充独立的 `LICENSE` 文件。
