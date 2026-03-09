import { ipcMain, BrowserWindow, app } from 'electron';
import { autoUpdater } from 'electron-updater';

export function registerUpdaterHandlers(getWin: () => BrowserWindow | null) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-available', (info) => {
        const win = getWin();
        if (win) win.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        const win = getWin();
        if (win) win.webContents.send('update-not-available', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        const win = getWin();
        if (win) win.webContents.send('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        const win = getWin();
        if (win) win.webContents.send('update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
        const win = getWin();
        if (win) win.webContents.send('update-error', err ? err.message : 'Unknown error');
    });

    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('check-for-updates', async () => {
        try {
            if (process.env.VITE_DEV_SERVER_URL) {
                return { status: 'dev-mode', message: 'Update checking is disabled in development mode.' };
            }
            await autoUpdater.checkForUpdates();
            return { status: 'checking' };
        } catch (error: any) {
            console.error('Update error:', error);
            return { status: 'error', error: error.message };
        }
    });

    ipcMain.handle('download-update', async () => {
        try {
            await autoUpdater.downloadUpdate();
            return { status: 'downloading' };
        } catch (error: any) {
            console.error('Download error:', error);
            return { status: 'error', error: error.message };
        }
    });

    ipcMain.handle('quit-and-install', () => {
        autoUpdater.quitAndInstall(true, true);
    });
}
