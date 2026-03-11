import { app, BrowserWindow, protocol } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

import { registerProjectHandlers } from './ipc/projects';
import { registerEngineHandlers } from './ipc/engines';
import { registerGitHandlers } from './ipc/git';
import { registerUpdaterHandlers } from './ipc/updater';
import { registerConfigHandlers } from './ipc/config';
import { registerWindowHandlers } from './ipc/window';

let win: BrowserWindow | null;

function createWindow() {
    const isMac = process.platform === 'darwin';
    const isWindows = process.platform === 'win32';

    win = new BrowserWindow({
      frame: false,
      transparent: isMac ? true : false,
      backgroundColor: '#00000000',
      ...(isMac ? { vibrancy: 'fullscreen-ui', visualEffectState: 'active' } : {}),
      ...(isWindows ? { backgroundMaterial: 'acrylic' } : {}),
      icon: path.join(process.env.VITE_PUBLIC, 'u.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        backgroundThrottling: false,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

  win.once('ready-to-show', () => {
    win?.show();
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  protocol.registerFileProtocol('local-file', (request, callback) => {
    let filePath = decodeURIComponent(request.url.replace('local-file://', ''));
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }
    callback({ path: filePath });
  });

  registerProjectHandlers();
  registerEngineHandlers();
  registerGitHandlers();
  registerConfigHandlers();
  registerUpdaterHandlers(() => win);
  registerWindowHandlers(() => win);

  createWindow();
});
