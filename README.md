# 简记 · md-manage

一款基于 Tauri 2 的本地优先 Markdown 文件管理与写作桌面应用。工作区就是普通文件夹，不依赖账号、云服务或数据库。

![Tauri](https://img.shields.io/badge/Tauri-2-24C8D8)
![Rust](https://img.shields.io/badge/Rust-stable-000000)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

> 当前版本：`0.1.0`。桌面运行时已从 Electron 迁移到 Tauri；macOS ARM64 已完成编译、打包和启动冒烟验证。

## 当前能力

### 文件管理

- 选择并记忆本地工作区。
- 递归展示目录和 `.md`、`.markdown` 文件。
- 默认按“文件夹优先 + 名称自然升序”展示，并支持名称降序、最近修改和类型排序。
- 文件树选择与当前编辑文档分离；取消选择不会关闭正在编辑的内容。
- 新建文件/文件夹、重命名、移动和移到系统废纸篓。
- 新建位置根据文件树选择确定，并在创建后自动展开和定位。
- 拖拽移动包含目标确认、折叠目录延迟展开和一次性撤销。
- 同名目标默认拒绝，避免静默覆盖。
- Rust WorkspaceGuard 拒绝 `..`、绝对路径越界和符号链接逃逸。
- Rust `notify` 监听工作区变化并通知文件树刷新。
- 支持 Markdown 文件和目录导入，同名文件自动追加编号。

### Markdown 编辑与阅读

- CodeMirror 6 Markdown 高亮、行号、自动换行、查找和替换。
- 2 秒 debounce 自动保存以及 `⌘/Ctrl+S` 手动保存。
- 保存操作串行执行；切换文件、工作区、阅读模式或关闭窗口前先 flush。
- unified + remark + rehype 渲染，支持 GFM 和代码高亮。
- 图片粘贴/拖入后保存至 `.md-manage/images/`。
- 普通相对图片以 Markdown 文件目录为基准解析。
- 本地图片使用 `md-manage-resource://` 受控协议，不开放 `file://` 或全磁盘权限。
- 阅读搜索、图片 Lightbox、HTML 导出和系统打印。

### 桌面集成

- Tauri capability 最小权限配置。
- 原生工作区/导出对话框和右键菜单。
- 外部链接仅允许 `http`、`https`、`mailto` 并交给系统浏览器。
- 窗口关闭请求经过 Renderer 保存握手。
- Tauri window-state 插件保存窗口状态。

## 环境要求

- Node.js 22+
- pnpm 10+
- Rust stable 与 Cargo
- 平台依赖：
  - macOS：Xcode Command Line Tools
  - Windows：MSVC Build Tools、WebView2
  - Linux：WebKitGTK 4.1、appindicator、librsvg、patchelf

安装 Rust：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup component add rustfmt clippy
```

## 开发与构建

```bash
pnpm install

# Tauri 桌面开发模式
pnpm dev

# 只启动 Vite Renderer
pnpm dev:web

# TypeScript + Rust 检查
pnpm run build:check

# 前端与 Rust 测试
pnpm exec vitest run
pnpm run test:rust

# 只构建 Web 资源
pnpm run build:web

# 构建当前平台应用与安装包
pnpm build
```

构建产物位于：

```text
dist/renderer/                              # Web 资源
src-tauri/target/release/md-manage          # 当前平台二进制
src-tauri/target/release/bundle/            # .app/.dmg 等安装产物
```

macOS ARM64 当前可生成：

```text
src-tauri/target/release/bundle/macos/简记.app
src-tauri/target/release/bundle/dmg/简记_0.1.0_aarch64.dmg
```

## 项目结构

```text
md-manage/
├── src/
│   ├── platform/tauri.ts             # DesktopAPI → Tauri invoke/listen/plugins
│   ├── services/documentSession.ts   # 串行保存与文档切换协调
│   ├── components/                   # Sidebar、Editor、Reader、Settings
│   ├── stores/                       # Zustand 状态
│   ├── lib/markdown.ts               # Markdown 与受控图片协议
│   └── types/ipc.ts                  # DesktopAPI 类型契约
├── src-tauri/
│   ├── capabilities/default.json     # 最小桌面权限
│   ├── src/commands.rs               # 文件、工作区、导入、导出、配置命令
│   ├── src/workspace_guard.rs        # 路径与符号链接边界
│   ├── src/state.rs                  # 工作区和 watcher 状态
│   ├── src/error.rs                  # 稳定错误码
│   └── tauri.conf.json               # 窗口、安全与打包配置
├── tests/unit/                        # Vitest
├── document/                          # 架构、调研、方案与历史文档
└── .github/workflows/ci.yml           # TypeScript、Rust、测试与构建
```

## 数据与安全

用户内容保存在工作区：

```text
<workspace>/
├── notes.md
├── subfolder/
└── .md-manage/images/
```

应用配置保存在 Tauri `app_config_dir/config.json`。首次运行时会尝试只读导入旧 Electron `md-manage/config.json` 的工作区路径，旧配置不会被删除。

安全边界：

- Renderer 不直接获得通用文件系统权限；
- 文件命令从 Rust 共享状态读取当前工作区；
- 现有目标和待创建目标均检查 canonical path；
- 目录扫描跳过符号链接；
- 本地图片协议复用同一 WorkspaceGuard，并限制图片 MIME；
- Markdown HTML 经 `rehype-sanitize` 清洗；
- Tauri CSP 禁止任意脚本与连接来源。

## 已验证状态

- TypeScript 检查通过。
- Rust `cargo check` 与 Clippy `-D warnings` 通过。
- 6 个前端测试文件、31 项测试通过。
- 3 项 Rust WorkspaceGuard 测试通过，包含父路径和符号链接越界。
- Vite 生产构建通过。
- Tauri macOS ARM64 release、`.app` 和 `.dmg` 构建通过。
- release 二进制完成启动冒烟验证。

## 风险标记

| ID | 等级 | 状态 | 说明 |
|---|---|---|---|
| `RISK-TAURI-PDF` | 高 | 已降级 | Tauri 无统一 `printToPDF`，当前“PDF”调用系统打印对话框 |
| `RISK-CROSS-PLATFORM` | 高 | 待验证 | Windows/Linux 尚未执行真实安装与全流程验收 |
| `RISK-SAVE-CONFLICT` | 高 | 待实现 | 尚未检测其他程序修改当前文件，也未完成跨平台原子替换 |
| `RISK-E2E` | 中 | 待补充 | 当前有单测、构建与启动验证，缺少自动化桌面端全流程测试 |
| `RISK-CONFIG-MIGRATION` | 中 | 待验证 | 旧 Electron 配置导入逻辑尚未在三平台验证 |
| `RISK-BUNDLE-SIZE` | 中 | 待优化 | Renderer 包含完整 CodeMirror language-data，主 chunk 约 1.3 MB |
| `RISK-SIGNING` | 中 | 待配置 | macOS 公证、Windows 签名和正式更新通道尚未配置 |
| `RISK-UNDO-SCOPE` | 中 | 部分实现 | 当前仅支持撤销最近一次移动；系统废纸篓无法提供可靠的跨平台恢复句柄 |

## 文档

- [文档索引](./document/README.md)
- [当前技术架构](./document/技术架构文档.md)
- [Tauri 迁移技术方案与实施状态](./document/Tauri迁移技术方案.md)
- [项目调研报告](./document/项目调研报告.md)
- [项目优化与重构方案](./document/项目优化与重构方案.md)
- [左侧文件管理系统优化技术方案](./document/左侧文件管理系统优化技术方案.md)

## License

MIT。正式发布前仍需补充独立的 `LICENSE` 文件。
