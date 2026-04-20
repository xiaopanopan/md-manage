import { ipcMain, Menu, MenuItem, BrowserWindow, shell } from 'electron';

export function registerContextMenuHandlers(): void {
  ipcMain.handle(
    'contextMenu:show',
    (_event, type: 'file' | 'editor', data: Record<string, string>) => {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return;

      const send = (action: string, payload: Record<string, string> = data) => {
        win.webContents.send('menu:action', { type: action, payload });
      };

      let template: MenuItem[];

      if (type === 'file') {
        const filePath = data.path ?? '';

        template = [
          new MenuItem({ label: '新建文件', click: () => send('newFile') }),
          new MenuItem({ label: '新建子文件夹', click: () => send('newFolder') }),
          new MenuItem({ type: 'separator' }),
          new MenuItem({
            label: '在文件夹中打开',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => shell.showItemInFolder(filePath),
          }),
          new MenuItem({ type: 'separator' }),
          new MenuItem({
            label: '删除',
            accelerator: 'CmdOrCtrl+Backspace',
            click: () => send('delete'),
          }),
        ];
      } else {
        // editor context menu
        template = [
          new MenuItem({ role: 'cut', label: '剪切' }),
          new MenuItem({ role: 'copy', label: '复制' }),
          new MenuItem({ role: 'paste', label: '粘贴' }),
          new MenuItem({ type: 'separator' }),
          new MenuItem({ role: 'selectAll', label: '全选' }),
        ];
      }

      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: win });
    }
  );
}
