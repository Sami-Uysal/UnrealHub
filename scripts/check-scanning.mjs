import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'UnrealHub-Scanning-'));
const write = async (file, contents) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof contents === 'string' ? contents : JSON.stringify(contents));
};
const compile = async (entry, plugins = []) => {
    const result = await build({ entryPoints: [path.join(repository, entry)], bundle: true, write: false, platform: 'node', format: 'esm', plugins });
    return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
};

try {
    const discovery = await compile('electron/services/discovery.ts');
    const engineRoot = path.join(temporary, 'Engines');
    const source = path.join(engineRoot, 'Deep', 'SourceBuild-CustomName');
    const installed = path.join(engineRoot, 'Releases', 'Deep', 'UE_not_the_real_version');
    await write(path.join(source, 'Engine', 'Build', 'Build.version'), { MajorVersion: 5, MinorVersion: 10, PatchVersion: 2 });
    await fs.mkdir(path.join(source, 'Engine', 'Source'), { recursive: true });
    await write(path.join(installed, 'Engine', 'Build', 'Build.version'), { MajorVersion: 5, MinorVersion: 7, PatchVersion: 1 });
    await write(path.join(installed, 'Engine', 'Build', 'InstalledBuild.txt'), '');
    await fs.mkdir(path.join(engineRoot, 'UE_999'), { recursive: true });
    await write(path.join(engineRoot, 'Malformed', 'Engine', 'Build', 'Build.version'), '{invalid');
    await write(path.join(engineRoot, 'NoEngine', 'Engine', 'Build', 'Build.version'), { MajorVersion: 5, MinorVersion: 1, PatchVersion: 0 });
    await fs.symlink(engineRoot, path.join(source, 'Cycle'), process.platform === 'win32' ? 'junction' : 'dir');
    const engines = await discovery.discoverEngines([engineRoot, source, installed, engineRoot, path.join(temporary, 'Missing')]);
    assert.deepEqual(engines.sort((a, b) => a.version.localeCompare(b.version)), [
        { path: source, version: '5.10.2', type: 'source' },
        { path: installed, version: '5.7.1', type: 'installed' },
    ]);
    assert.equal((await discovery.discoverEngines([source])).length, 1, 'the search root itself is an engine');

    const projectRoot = path.join(temporary, 'Projects');
    const rootProject = path.join(projectRoot, 'Root.uproject');
    const nestedProject = path.join(projectRoot, 'A', 'B', 'C', 'Nested.UPROJECT');
    const secondProject = path.join(projectRoot, 'A', 'B', 'C', 'Second.uproject');
    const sourceProject = path.join(source, 'Samples', 'SourceProject.uproject');
    await write(rootProject, { EngineAssociation: '5.7' });
    await write(nestedProject, { EngineAssociation: '5.10' });
    await write(secondProject, { EngineAssociation: '5.6' });
    await write(sourceProject, { EngineAssociation: '' });
    await write(path.join(projectRoot, 'Saved', 'Backup.uproject'), {});
    await write(path.join(projectRoot, 'Intermediate', 'Generated.uproject'), {});
    await write(path.join(projectRoot, 'node_modules', 'Package.uproject'), {});
    await fs.symlink(projectRoot, path.join(projectRoot, 'A', 'Cycle'), process.platform === 'win32' ? 'junction' : 'dir');
    const projects = await discovery.discoverProjectFiles([projectRoot, path.dirname(nestedProject), projectRoot]);
    assert.deepEqual(projects.sort(), [rootProject, nestedProject, secondProject].sort());
    assert.deepEqual(await discovery.discoverProjectFiles([source]), [sourceProject]);

    const guid = '12345678-1234-1234-1234-123456789abc';
    const registry = discovery.parseRegisteredBuilds(`HKEY_CURRENT_USER\\Software\\Epic Games\\Unreal Engine\\Builds\r\n    {${guid.toUpperCase()}}    REG_SZ    ${source}\r\n`);
    assert.equal(await discovery.resolveEngineVersion(nestedProject, `{${guid}}`, registry), '5.10.2');
    assert.equal(await discovery.resolveEngineVersion(sourceProject, '', new Map()), '5.10.2');
    assert.equal(await discovery.resolveEngineVersion(rootProject, '5.7', new Map()), '5.7');
    assert.equal(await discovery.resolveEngineVersion(rootProject, '{unknown}', new Map()), undefined);

    // Resource trees must not delay discovery of sibling/nested projects.
    const contentRoot = path.join(projectRoot, 'Content');
    for (let index = 0; index < 200; index++) {
        await write(path.join(contentRoot, 'Resource' + index, 'Generated.uproject'), {});
    }
    await write(path.join(projectRoot, 'Plugins', 'Example', 'Generated.uproject'), {});
    const walked = [];
    const observed = [];
    const pruned = await discovery.discoverProjectFiles([projectRoot], {
        onProgress: (count, directory) => walked.push({ count, directory }),
        onItem: item => { observed.push(item); },
    });
    assert.equal(pruned.length, 3);
    assert.equal(observed.length, 3, 'items are reported while traversing');
    assert.ok(walked.every(item => !item.directory.startsWith(contentRoot)), 'do not walk project content');
    assert.ok(walked.length < 10, 'large generated/resource trees are pruned');
    assert.equal((await discovery.discoverProjectFiles([path.join(contentRoot, 'Resource0')])).length, 1, 'explicit search roots are respected');

    const data = path.join(temporary, 'UserData');
    await write(path.join(data, 'config.json'), {
        enginePaths: [engineRoot], projectPaths: [projectRoot, projectRoot],
        projectOverrides: { [rootProject]: { name: 'Root override', launchProfiles: [{ id: 'x', name: 'Test', args: '-game' }] } },
    });
    await write(path.join(data, 'projects.json'), [{ id: rootProject, path: rootProject, name: 'Root', version: '5.7', lastModified: 1 }]);
    await write(path.join(data, 'excluded-projects.json'), [secondProject]);
    await write(path.join(projectRoot, 'Saved', 'AutoScreenshot.png'), 'fixture');
    const electronPlugin = {
        name: 'test-electron', setup(builder) {
            builder.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'test-electron' }));
            builder.onLoad({ filter: /.*/, namespace: 'test-electron' }, () => ({ contents: `export const app = { getPath: () => ${JSON.stringify(data)} };`, loader: 'js' }));
        },
    };
    const scanner = await compile('electron/services/scanner.ts', [electronPlugin]);
    const integrated = await scanner.scanProjects();
    assert.equal(integrated.length, 2, 'manual/scanned duplicates and exclusions remain correct');
    const rootResult = integrated.find(project => project.path === rootProject);
    assert.equal(rootResult.name, 'Root override');
    assert.equal(rootResult.launchProfiles[0].args, '-game');
    assert.equal(rootResult.engineVersion, '5.7');
    assert.ok(rootResult.thumbnail.startsWith('local-file://'));
    assert.equal(integrated[0].path, nestedProject, 'mtime sorting preserved');
    const { createScanCoordinator } = await compile('electron/services/scanCoordinator.ts', [electronPlugin]);
    let release;
    const blocked = new Promise(resolve => { release = resolve; });
    let runs = 0;
    const coordinator = createScanCoordinator(async options => {
        runs++;
        options.onProgress(1, 'first-directory');
        options.onItem({path:'early', version:'5.7'});
        await blocked;
        return [{path:'final', version:'5.8'}];
    });
    assert.equal(coordinator.snapshot('paths-A', true).scanning, true);
    await new Promise(resolve => setImmediate(resolve));
    const partial = coordinator.snapshot('paths-A');
    assert.equal(partial.scanning, true);
    assert.equal(partial.directories, 1);
    assert.equal(partial.items[0].path, 'early', 'discoveries reach UI before final completion');
    const full = coordinator.complete('paths-A');
    coordinator.snapshot('paths-A', true);
    assert.equal(runs, 1, 'poll, refresh and legacy requests share in-flight scan');
    release();
    assert.equal((await full)[0].path, 'final');
    assert.equal(coordinator.snapshot('paths-A').scanning, false);
    assert.equal(coordinator.snapshot('paths-A').items[0].path, 'final');
    assert.equal(runs, 1, 'polling a finished scan uses its cache');
    coordinator.snapshot('paths-B');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(runs, 2, 'changed paths trigger discovery');
    const failed = createScanCoordinator(async () => { throw new Error('synthetic failure'); });
    failed.snapshot('x');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(failed.snapshot('x').scanning, false);
    assert.equal(failed.snapshot('x').error, 'synthetic failure');
    console.log('PASS: BFS resource-tree pruning, progressive scan snapshots, shared in-flight requests, cached completion, changed-path restart and visible failures.');
    console.log('PASS: recursive root/nested discovery, duplicate roots, cycle skipping, generated-directory pruning, engine classification/version metadata, GUID/in-tree version resolution, manual projects/exclusions/overrides/thumbnail and mtime order.');
} finally {
    const absoluteTemporary = path.resolve(temporary);
    assert.ok(absoluteTemporary.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(absoluteTemporary).startsWith('UnrealHub-Scanning-'));
    await fs.rm(absoluteTemporary, { recursive: true, force: true });
}
