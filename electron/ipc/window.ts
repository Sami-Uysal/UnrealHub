import { ipcMain, BrowserWindow } from 'electron';

export function registerWindowHandlers(getWindow: () => BrowserWindow | null) {
    ipcMain.handle('window-minimize', () => {
        getWindow()?.minimize();
    });

    ipcMain.handle('window-maximize', () => {
        const win = getWindow();
        if (win?.isMaximized()) {
            win.unmaximize();
        } else {
            win?.maximize();
        }
    });

    ipcMain.handle('window-close', () => {
        getWindow()?.close();
    });
}
