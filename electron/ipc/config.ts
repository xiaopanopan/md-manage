import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';

// config.json 路径：跨平台用户配置目录
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

let configCache: Record<string, unknown> = {};

function loadConfig(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function persistConfig(): void {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write config:', err);
  }
}

// 初始化加载
configCache = loadConfig();

// 供主进程内部使用
export function getConfig(key?: string): unknown {
  if (!key) return configCache;
  return key.split('.').reduce<unknown>((obj, k) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k];
    return undefined;
  }, configCache);
}

export function setConfig(key: string, value: unknown): void {
  const keys = key.split('.');
  let obj = configCache;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') {
      obj[keys[i]] = {};
    }
    obj = obj[keys[i]] as Record<string, unknown>;
  }
  obj[keys[keys.length - 1]] = value;
  persistConfig();
}

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', (_event, key?: string) => {
    return getConfig(key);
  });

  ipcMain.handle('config:set', (_event, key: string, value: unknown) => {
    setConfig(key, value);
  });
}
