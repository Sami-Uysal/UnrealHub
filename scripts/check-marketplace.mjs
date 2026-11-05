import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run the packaged app without renderer mocks so startup and lazy-import errors
// are observed together. Requires Node.js 22+ for its built-in WebSocket client.
const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const executable = path.resolve(root, process.argv[2] || `release/${version}/UnrealHub-Windows-${version}-zh-CN-Portable.exe`);
const profile = await mkdtemp(path.join(tmpdir(), 'UnrealHub-Marketplace-Test-'));
const port = 19351;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const child = spawn(executable, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`], { windowsHide: true, stdio: 'ignore' });
let launchError;
child.on('error', error => { launchError = error; });
let socket;
let send;
try {
    let target;
    for (let attempt = 0; attempt < 200 && !target; attempt++) {
        if (launchError) throw launchError;
        try {
            target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page');
        } catch { /* The portable launcher is still extracting or starting. */ }
        if (!target) await delay(100);
    }
    assert.ok(target, 'Packaged renderer did not start');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    const pending = new Map();
    const exceptions = [];
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.id) {
            pending.get(message.id)?.(message);
            pending.delete(message.id);
        } else if (message.method === 'Runtime.exceptionThrown') {
            exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
        }
    });
    send = (method, params = {}) => new Promise((resolve, reject) => {
        const requestId = ++id;
        const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out`)); }, 10000);
        pending.set(requestId, message => { clearTimeout(timeout); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); });
        socket.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true });
        assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result?.value;
    };
    await send('Runtime.enable');
    const waitFor = async expression => {
        for (let attempt = 0; attempt < 100; attempt++) {
            assert.deepEqual(exceptions, [], 'Uncaught renderer exception');
            if (await evaluate(expression)) return;
            await delay(100);
        }
        assert.fail(`Renderer condition timed out: ${expression}`);
    };
    await waitFor('Boolean(document.querySelector("#root button"))');
    // Check the real preload contract; do not inject the missing ipcRenderer.
    assert.equal(await evaluate('typeof window.ipcRenderer'), 'undefined');
    for (let round = 0; round < 3; round++) {
        await evaluate(`Array.from(document.querySelectorAll('button')).find(b => /^(资源商城|Marketplace|Mağaza)$/.test(b.textContent.trim())).click()`);
        await waitFor(`Array.from(document.querySelectorAll('button')).some(b => /^(我的资源库|My Library|Kütüphanem)$/.test(b.textContent.trim()))`);
        assert.equal(await evaluate('document.getElementById("root").childElementCount > 0'), true);
        await evaluate(`Array.from(document.querySelectorAll('button')).find(b => /^(设置|Settings|Ayarlar)$/.test(b.textContent.trim())).click()`);
        await waitFor(`Boolean(document.querySelector('h2')?.textContent.match(/设置|SETTINGS|AYARLAR/))`);
    }
    assert.deepEqual(exceptions, []);
    console.log('PASS: packaged startup and 3 marketplace/settings navigation cycles; no uncaught exceptions; root remains mounted.');
} finally {
    if (send && socket?.readyState === WebSocket.OPEN) {
        await send('Runtime.evaluate', { expression: 'window.unreal.quit()' }).catch(() => {});
        socket.close();
    } else {
        child.kill();
    }
}
