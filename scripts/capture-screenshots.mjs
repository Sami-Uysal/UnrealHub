import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Capture the actual maximized packaged interface using isolated, synthetic projects. Requires Node.js 22+ for its built-in WebSocket client.
const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const executable = path.resolve(root, process.argv[2] || `release/${version}/UnrealHub-Windows-${version}-zh-CN-Portable.exe`);
const profile = await mkdtemp(path.join(tmpdir(), 'UnrealHub-Marketplace-Test-'));
const fixtureRoot = path.join(root, '.omx', 'screenshot-demo');
const write = async (file, value) => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value));
};
const makeEngine = async (name, minor, patch, installed) => {
    const directory = path.join(fixtureRoot, 'Engines', name);
    await write(path.join(directory, 'Engine/Build/Build.version'), { MajorVersion: 5, MinorVersion: minor, PatchVersion: patch });
    if (installed) await write(path.join(directory, 'Engine/Build/InstalledBuild.txt'), '');
    else await mkdir(path.join(directory, 'Engine/Source'), { recursive: true });
};
await makeEngine('UE_5.7_Source', 7, 1, false);
await makeEngine('UE_5.5_Source', 5, 4, false);
await makeEngine('UE_5.8', 8, 4, true);
await makeEngine('UE_5.7', 7, 4, true);
await makeEngine('UE_5.6', 6, 1, true);
const projects = [
    ['DigitalTwin', '5.8'], ['VehicleViewer', '5.8'],
    ['FactoryVR', '5.7'], ['MetroAssembly', '5.7'],
    ['MaterialLab', '5.6'], ['LightingStudy', '5.6'],
];
for (const [name, version] of projects) await write(path.join(fixtureRoot, 'Projects', name, `${name}.uproject`), { EngineAssociation: version });
await write(path.join(profile, 'config.json'), {
    enginePaths: [path.join(fixtureRoot, 'Engines')],
    projectPaths: [path.join(fixtureRoot, 'Projects')], projectOverrides: {},
});
await mkdir(path.join(root, 'github-assets'), { recursive: true });
const port = 19355;

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
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
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
    await evaluate('window.unreal.maximize()');
    await waitFor('window.outerWidth >= screen.availWidth - 16 && window.outerHeight >= screen.availHeight - 16');
    const viewport = await evaluate('({width: innerWidth, height: innerHeight, screenWidth: screen.width, screenHeight: screen.height})');
    assert.ok(viewport.width >= 1280 && viewport.height >= 720, 'Screenshots must use the maximized application, not a small window');
    console.log('Maximized screenshot dimensions:', JSON.stringify(viewport));
    const capture = async name => {
        await delay(400);
        const png = Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
        assert.equal(png.readUInt32BE(16), viewport.width);
        assert.equal(png.readUInt32BE(20), viewport.height);
        await writeFile(path.join(root, 'github-assets', `${name}-fullscreen.png`), png);
    };
    await waitFor('document.querySelectorAll("button[data-engine-version]").length === 4');
    await waitFor('document.querySelectorAll("section[data-project-version]").length === 3');
    await capture('projects-all');
    await evaluate('document.querySelector(\'button[data-engine-version="5.7"]\').click()');
    await waitFor('document.querySelectorAll("section[data-project-version]").length === 1');
    await capture('projects-version');
    await evaluate('document.querySelector(\'button[data-engine-version="all"]\').click()');
    await evaluate('document.querySelector(\'button[title="列表视图"],button[title="List View"]\').click()');
    await waitFor('document.querySelectorAll("section[data-project-version]").length === 3');
    await capture('projects-list');
    const navigate = async names => {
        await evaluate(`Array.from(document.querySelectorAll('button')).find(button => ${JSON.stringify(names)}.includes(button.textContent.trim())).click()`);
    };
    await navigate(['引擎', 'Engines', 'Motorlar']);
    await waitFor('document.querySelectorAll("#engines-installed + div h3").length === 3');
    await capture('engines');
    await navigate(['设置', 'Settings', 'Ayarlar']);
    await waitFor('Boolean(document.querySelector("main h2")?.textContent.match(/设置|SETTINGS/))');
    await capture('settings');
    await navigate(['资源商城', 'Marketplace', 'Mağaza']);
    await waitFor('Array.from(document.querySelectorAll("button")).some(button => /使用 Epic Games 登录|Sign in with Epic Games/.test(button.textContent))');
    await capture('marketplace');
    assert.deepEqual(exceptions, []);
    console.log('PASS: six maximized screenshots captured from the packaged app using isolated demo data; no renderer exceptions.');

} finally {
    if (send && socket?.readyState === WebSocket.OPEN) {
        await send('Runtime.evaluate', { expression: 'window.unreal.quit()' }).catch(() => {});
        socket.close();
    } else {
        child.kill();
    }
}
