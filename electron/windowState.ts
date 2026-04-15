import { BrowserWindow, screen } from 'electron';
import { getConfig, setConfig } from './ipc/config';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
  isFullscreen: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false,
  isFullscreen: false,
};

export function getWindowState(): WindowState {
  const saved = getConfig('window') as WindowState | undefined;
  if (!saved) return DEFAULT_STATE;

  // 验证窗口位置在可见屏幕范围内
  if (saved.x !== undefined && saved.y !== undefined) {
    const displays = screen.getAllDisplays();
    const visible = displays.some((d) => {
      return (
        saved.x! >= d.bounds.x &&
        saved.y! >= d.bounds.y &&
        saved.x! < d.bounds.x + d.bounds.width &&
        saved.y! < d.bounds.y + d.bounds.height
      );
    });
    if (!visible) {
      return { ...DEFAULT_STATE, width: saved.width, height: saved.height };
    }
  }

  return { ...DEFAULT_STATE, ...saved };
}

export function saveWindowState(win: BrowserWindow): void {
  const bounds = win.getBounds();
  setConfig('window', {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: win.isMaximized(),
    isFullscreen: win.isFullScreen(),
  });
}
