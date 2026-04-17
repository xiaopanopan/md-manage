import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { registerFileSystemHandlers, startWatcher } from './ipc/fileSystem';
import { registerConfigHandlers, getConfig } from './ipc/config';
import { registerContextMenuHandlers } from './ipc/contextMenu';
import { registerWindowHandlers } from './ipc/window';
import { registerImportHandlers } from './ipc/import';
import { registerHistoryHandlers } from './ipc/history';
import { getWindowState, saveWindowState } from './windowState';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const state = getWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 720,
    minHeight: 480,

    // macOS 原生集成
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (state.isMaximized) mainWindow.maximize();
  if (state.isFullscreen) mainWindow.setFullScreen(true);

  // 加载页面
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 关闭前保存窗口状态
  mainWindow.on('close', () => {
    if (mainWindow) saveWindowState(mainWindow);
  });

  // 外部链接在系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  registerConfigHandlers();
  registerFileSystemHandlers();
  registerContextMenuHandlers();
  registerWindowHandlers();
  registerImportHandlers();
  registerHistoryHandlers();

  createWindow();

  // 恢复上次工作区的文件监听
  const savedWorkspace = getConfig('workspace') as string | null;
  if (savedWorkspace) {
    startWatcher(savedWorkspace);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
