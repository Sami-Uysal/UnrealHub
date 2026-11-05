import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { build } from 'esbuild';

let scenario = 0;
async function createHarness(iconAvailable = true) {
    const app = new EventEmitter();
    app.getLocale = () => 'zh-CN';
    const window = new EventEmitter();
    window.hidden = false;
    window.hide = () => { window.hidden = true; };
    const close = () => {
        const event = { prevented: false, preventDefault() { this.prevented = true; } };
        window.emit('close', event);
        return event;
    };
    app.quit = () => {
        app.emit('before-quit');
        assert.equal(close().prevented, false, 'explicit quit must bypass close-to-tray');
        app.emit('will-quit');
    };
    const state = { app, autoUpdater: new EventEmitter(), handlers: new Map(), tray: null, shows: 0 };
    state.Tray = class extends EventEmitter {
        constructor() { super(); state.tray = this; this.destroyed = false; }
        setToolTip(value) { this.tooltip = value; }
        setContextMenu(value) { this.menu = value; }
        isDestroyed() { return this.destroyed; }
        destroy() { this.destroyed = true; }
    };
    state.ipcMain = { handle: (name, handler) => state.handlers.set(name, handler) };
    state.Menu = { buildFromTemplate: template => template };
    state.nativeImage = { createFromPath: () => ({ isEmpty: () => !iconAvailable, resize: () => ({}) }) };
    globalThis.__trayTest = state;
    const result = await build({
        entryPoints: ['electron/services/tray.ts'], bundle: true, write: false, platform: 'node', format: 'esm',
        plugins: [{ name: 'fake-electron', setup(builder) {
            builder.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'fake' }));
            builder.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ contents: 'export const {app,autoUpdater,ipcMain,Menu,nativeImage,Tray}=globalThis.__trayTest; export class BrowserWindow {}', loader: 'js' }));
        } }],
    });
    const module = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text + `\n// scenario ${scenario++}`).toString('base64'));
    module.createTrayController('icon.png', () => { state.shows++; window.hidden = false; }).attachWindow(window);
    return { ...state, window, close };
}

const normal = await createHarness();
assert.equal(normal.close().prevented, true);
assert.equal(normal.window.hidden, true);
normal.tray.emit('click');
assert.equal(normal.window.hidden, false);
normal.close();
normal.tray.emit('double-click');
assert.equal(normal.window.hidden, false);
normal.tray.menu[0].click();
assert.equal(normal.tray.tooltip, 'UnrealHub');
normal.handlers.get('tray-set-language')({}, 'en-US');
assert.equal(normal.tray.menu[0].label, 'Show window');
normal.handlers.get('tray-set-language')({}, 'tr');
assert.equal(normal.tray.menu[0].label, 'Pencereyi göster');
normal.handlers.get('tray-set-language')({}, 'zh-CN');
assert.equal(normal.tray.menu[0].label, '显示窗口');
normal.handlers.get('tray-set-language')({}, { invalid: true });
assert.equal(normal.tray.menu[2].label, '退出 UnrealHub');
normal.tray.menu[2].click();
assert.equal(normal.tray.isDestroyed(), true);

const update = await createHarness();
update.autoUpdater.emit('before-quit-for-update');
assert.equal(update.close().prevented, false);
update.app.emit('will-quit');
assert.equal(update.tray.isDestroyed(), true);

const shutdown = await createHarness();
shutdown.window.emit('session-end');
assert.equal(shutdown.close().prevented, false);
shutdown.app.emit('will-quit');

const originalError = console.error;
let reportedFailure = false;
let fallback;
try {
    console.error = () => { reportedFailure = true; };
    fallback = await createHarness(false);
} finally {
    console.error = originalError;
}
assert.equal(reportedFailure, true);
assert.equal(fallback.close().prevented, false, 'missing tray must not leave an unreachable hidden app');
assert.equal(fallback.window.hidden, false);
delete globalThis.__trayTest;
console.log('PASS: close-to-tray, click/double-click/menu restore, three tray languages, explicit quit cleanup, update/OS shutdown bypass and missing-icon fallback.');
