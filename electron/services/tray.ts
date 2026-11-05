import { app, autoUpdater, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';

const labels = {
    en: { show: 'Show window', quit: 'Quit UnrealHub' },
    tr: { show: 'Pencereyi göster', quit: "UnrealHub'dan çık" },
    zh: { show: '显示窗口', quit: '退出 UnrealHub' },
};

export function createTrayController(iconPath: string, showWindow: () => void) {
    let tray: Tray | null = null;
    let quitting = false;
    let language = app.getLocale();
    const allowQuit = () => { quitting = true; };
    const updateMenu = () => {
        const text = /^zh/i.test(language) ? labels.zh : /^tr/i.test(language) ? labels.tr : labels.en;
        tray?.setContextMenu(Menu.buildFromTemplate([
            { label: text.show, click: showWindow },
            { type: 'separator' },
            { label: text.quit, click: () => app.quit() },
        ]));
    };

    app.on('before-quit', allowQuit);
    // Native updater shutdown can close windows before app's before-quit event.
    autoUpdater.on('before-quit-for-update', allowQuit);
    app.on('will-quit', () => {
        tray?.destroy();
        tray = null;
    });
    ipcMain.handle('tray-set-language', (_, value: unknown) => {
        if (typeof value === 'string' && /^(en|tr|zh)(?:-|$)/i.test(value)) {
            language = value;
            updateMenu();
        }
    });

    try {
        const icon = nativeImage.createFromPath(iconPath);
        if (icon.isEmpty()) throw new Error('Tray icon could not be loaded');
        tray = new Tray(icon.resize({ width: 16, height: 16 }));
        tray.setToolTip('UnrealHub');
        updateMenu();
        tray.on('click', showWindow);
        tray.on('double-click', showWindow);
    } catch (error) {
        tray?.destroy();
        tray = null;
        console.error('Failed to create system tray:', error);
    }

    return {
        attachWindow(window: BrowserWindow) {
            window.on('session-end', allowQuit);
            window.on('close', event => {
                // Never hide an otherwise unreachable window if tray creation failed.
                if (!quitting && tray && !tray.isDestroyed()) {
                    event.preventDefault();
                    window.hide();
                }
            });
        },
    };
}
