# 简记 · md-manage

> 一款极简的本地 Markdown 文件管理与写作桌面应用。专注写作本身，数据本地化，隐私优先。

![electron](https://img.shields.io/badge/Electron-28-47848F)
![react](https://img.shields.io/badge/React-18-61DAFB)
![vite](https://img.shields.io/badge/Vite-5-646CFF)
![typescript](https://img.shields.io/badge/TypeScript-5-3178C6)

---

## 功能亮点

### 📁 左侧文件管理

- 工作区目录选择（首次启动自动弹出）
- DRAFTS / ARCHIVES 预设分区，可折叠
- 右键菜单：新建文件 / 新建子文件夹 / 重命名 / 删除 / 在 Finder 打开
- 内联重命名（Enter 快捷键）
- 拖拽移动：文件/文件夹拖入目标文件夹或根目录
- `chokidar` 文件监听，外部修改自动刷新

### ✍️ 右侧编辑器（CodeMirror 6）

- Markdown 语法高亮，明暗主题热切换
- 行号、当前行高亮、自动换行
- 快捷键：`⌘B` 粗体 / `⌘I` 斜体 / `⌘K` 链接 / `⌘Z` 撤销 / `⌘S` 手动保存
- 自动保存（2 秒 debounce）+ 底部状态栏（字数 / 阅读时间 / 保存状态）
- 粘贴/拖拽图片自动保存到工作区并插入 Markdown 引用
- `⌘F` 查找 / `⌘H` 替换（自定义面板：匹配计数 + 大小写 + 正则开关）

### 📖 阅读模式

- `unified` 管道渲染（remark + rehype + highlight.js）
- 支持 GFM（表格、任务列表、删除线）
- 点击图片放大（Lightbox）
- `⌘F` 查找（**CSS Custom Highlight API** 零 DOM 修改的高亮）
- 导出 PDF / HTML（内联样式 + 中文字体）

### 🎨 其他

- 极简设计，CSS Variables 驱动，暗色模式自动跟随系统
- `⌘E` 一键切换 编辑 ↔ 阅读
- `⌘,` 打开设置面板（内含使用说明）
- 侧边栏主题切换按钮（☀/🌙/⊚）

---

## 技术栈

| 层 | 技术 |
|---|---|
| **桌面框架** | Electron 28 |
| **前端** | React 18 + Vite 5 + TypeScript 5 |
| **编辑器核心** | CodeMirror 6（`@codemirror/*` 全家桶） |
| **Markdown 渲染** | unified + remark-parse + remark-gfm + remark-rehype + rehype-highlight + rehype-sanitize |
| **元数据** | gray-matter（YAML Front Matter） |
| **状态管理** | Zustand + immer + persist |
| **样式** | CSS Modules + CSS Variables |
| **文件监听** | chokidar |
| **打包** | electron-builder（DMG / NSIS / AppImage） |

---

## 快速开始

### 环境要求

- Node.js ≥ 22
- pnpm 10（推荐）

### 安装依赖

```bash
pnpm install
```

Electron 二进制下载慢时，可用国内镜像（已在 `.npmrc` 中配置）：

```
electron_mirror=https://npmmirror.com/mirrors/electron/
```

### 开发运行

```bash
pnpm run dev
```

Vite 启动 `localhost:5173`，Electron 窗口自动弹出。

### 构建 / 打包

```bash
# 仅构建（dist/）
pnpm run build

# 类型检查
pnpm run build:check

# 单元测试
pnpm run test

# 打包为安装包（release/）
pnpm run package

# 重新生成应用图标
pnpm run icon
```

打包产物位于 `release/`：
- macOS: `简记-0.1.0-arm64.dmg` / `*-mac.zip`
- Windows: `简记 Setup 0.1.0.exe`
- Linux: `md-manage-0.1.0.AppImage` / `*.deb`

---

## 项目结构

```
md-manage/
├── electron/                  # Electron 主进程
│   ├── main.ts                # 窗口创建 + handler 注册 + chokidar
│   ├── preload.ts             # contextBridge 白名单 API
│   ├── windowState.ts         # 窗口位置/大小持久化
│   └── ipc/
│       ├── fileSystem.ts      # 文件 CRUD + image:save + export
│       ├── config.ts          # userData 配置读写
│       ├── contextMenu.ts     # 原生右键菜单
│       ├── import.ts          # 文件/文件夹导入
│       └── window.ts          # 最小化/最大化/全屏
├── src/                       # React 渲染进程
│   ├── App.tsx                # 根布局 + 全局快捷键
│   ├── main.tsx               # ReactDOM 入口 + 样式导入
│   ├── components/
│   │   ├── sidebar/           # 左侧文件管理（工具栏 / 文件树 / 内联重命名）
│   │   ├── editor/            # 编辑器（CodeMirror + 搜索面板 + 模式切换）
│   │   ├── reader/            # 阅读模式（渲染 + Lightbox + 查找）
│   │   ├── settings/          # 设置面板（通用/编辑器/外观/快捷键/使用说明）
│   │   └── dialogs/           # 内联重命名输入框
│   ├── stores/appStore.ts     # Zustand 状态
│   ├── hooks/                 # 细粒度 selectors
│   ├── lib/
│   │   ├── frontmatter.ts     # gray-matter 解析/序列化
│   │   ├── markdown.ts        # unified 渲染管道
│   │   ├── wordCount.ts       # 中英文混排字数
│   │   └── shortcuts.ts       # CodeMirror 快捷键
│   ├── types/                 # 类型契约（FileNode / ElectronAPI 等）
│   └── styles/                # 全局样式 + 主题
├── build/                     # 打包资源（图标 SVG + PNG）
├── scripts/generate-icon.mjs  # SVG → 多尺寸 PNG 脚本
├── tests/unit/                # Vitest 单元测试
├── document/                  # 需求与设计文档
├── .github/workflows/         # CI（tsc + vitest + build）
├── electron-builder.yml       # 打包配置
└── vite.config.ts             # Vite + vite-plugin-electron 配置
```

---

## 数据存储

完全基于文件系统，无数据库依赖：

```
<workspace>/
├── DRAFTS/                    # 草稿（可自由创建 .md 文件）
├── ARCHIVES/                  # 归档
├── 其他文件 / 文件夹           # 用户自定义组织
└── .md-manage/                # 应用数据（隐藏）
    ├── images/                # 粘贴/拖拽的图片
    └── history/               # （保留目录，当前版本未启用版本历史）
```

窗口状态、主题、工作区路径由 Electron `userData` 的 `config.json` 管理。

---

## 快捷键速查

| 功能 | 快捷键 |
|---|---|
| 保存 | `⌘S` |
| 加粗 | `⌘B` |
| 斜体 | `⌘I` |
| 插入链接 | `⌘K` |
| 查找 / 替换 | `⌘F` / `⌘H` |
| 切换 编辑 ↔ 阅读 | `⌘E` |
| 重命名当前文件 | `Enter`（焦点不在编辑器时） |
| 删除当前文件 | `⌘⌫` |
| 打开设置 | `⌘,` |
| 撤销 / 重做 | `⌘Z` / `⌘⇧Z` |

---

## 开发路线图

已实现的版本见 `document/` 目录：

- **v0.2.0**：基线（文件管理 + 编辑器 + 阅读模式 + 导出）
- **v0.2.1**：用户反馈修复（主题按钮、图片预览、使用说明、砍版本历史等）
- **v0.3.0**：编辑器高度撑满 + 换行
- **v0.4.0**：文件拖拽排序
- **v0.5.0**：KaTeX 数学公式 + Mermaid 图表（规划中）

详见 [`document/需求优化清单.md`](./document/需求优化清单.md)。

---

## License

MIT
