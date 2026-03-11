import { ipcMain, BrowserWindow, screen } from 'electron';

export function registerWindowHandlers(getWindow: () => BrowserWindow | null) {
    ipcMain.handle('window-minimize', () => {
        getWindow()?.minimize();
    });

    let isFakeMaximized = false;
    let previousBounds: Electron.Rectangle | null = null;

    ipcMain.handle('window-maximize', () => {
        const win = getWindow();
        if (!win) return;

        if (process.platform === 'win32') {
            const currentDisplay = screen.getDisplayNearestPoint(win.getBounds());
            
            if (isFakeMaximized) {
                // Restore to previous bounds
                if (previousBounds) {
                    win.setBounds(previousBounds);
                }
                isFakeMaximized = false;
            } else {
                // Save current bounds and 'fake' maximize to screen work area
                previousBounds = win.getBounds();
                const workArea = currentDisplay.workArea;
                win.setBounds(workArea);
                isFakeMaximized = true;
            }
        } else {
            // Normal behavior for macOS/Linux
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
        }
    });

    ipcMain.handle('window-close', () => {
        getWindow()?.close();
    });
}
