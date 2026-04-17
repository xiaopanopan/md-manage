import { ipcMain, BrowserWindow } from 'electron';

export function registerWindowHandlers(): void {
  // 最小化窗口
  ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  // 最大化 / 还原窗口
  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  // 关闭窗口
  ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  // 切换全屏
  ipcMain.handle('window:setFullscreen', (_event, flag: boolean) => {
    BrowserWindow.getFocusedWindow()?.setFullScreen(flag);
  });

  // 查询全屏状态
  ipcMain.handle('window:isFullscreen', () => {
    return BrowserWindow.getFocusedWindow()?.isFullScreen() ?? false;
  });

  // 查询最大化状态
  ipcMain.handle('window:isMaximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false;
  });
}
