import fs from 'node:fs/promises';
import path from 'node:path';

export interface DiscoveredEngine {
    version: string;
    path: string;
    type: 'source' | 'installed';
}

export interface DiscoveryOptions<T> {
    onItem?: (item: T) => void | Promise<void>;
    onProgress?: (directories: number, currentPath: string) => void;
    onError?: (message: string) => void;
    signal?: AbortSignal;
}

const ignoredDirectories = new Set([
    '.git', '.svn', '.hg', '.vs', 'node_modules', 'binaries', 'intermediate',
    'deriveddatacache', 'saved', 'obj', 'bin',
]);
const projectInternals = new Set(['content', 'source', 'plugins', 'build', 'config']);
const engineInternals = new Set(['engine', 'featurepacks', 'templates']);

export function pathKey(filePath: string): string {
    const resolved = path.resolve(filePath);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

// Breadth-first batches prevent an enormous deep branch from starving other
// configured roots. A fixed batch size bounds filesystem concurrency.
export async function walkDirectories(
    roots: string[],
    visit: (directory: string, entries: import('node:fs').Dirent[]) => Promise<boolean | void>,
    options: DiscoveryOptions<never> = {},
): Promise<void> {
    const pending = roots.map(root => path.resolve(root));
    const explicitRoots = new Set(pending.map(pathKey));
    const visited = new Set<string>();
    let head = 0;
    let directories = 0;
    while (head < pending.length && !options.signal?.aborted) {
        const batch = pending.slice(head, head + 12);
        head += batch.length;
        await Promise.all(batch.map(async directory => {
            const lexicalKey = pathKey(directory);
            if (visited.has(lexicalKey) || options.signal?.aborted) return;
            visited.add(lexicalKey);
            try {
                // lstat keeps junctions/links out even when a directory changed
                // since its parent was enumerated. Only roots need realpath.
                const stat = await fs.lstat(directory);
                if (!stat.isDirectory() || stat.isSymbolicLink()) return;
                if (explicitRoots.has(lexicalKey)) {
                    const canonical = pathKey(await fs.realpath(directory));
                    if (canonical !== lexicalKey && visited.has(canonical)) return;
                    visited.add(canonical);
                }
                const entries = await fs.readdir(directory, { withFileTypes: true });
                directories++;
                options.onProgress?.(directories, directory);
                if (options.signal?.aborted || await visit(directory, entries) === false) return;
                for (const entry of entries) {
                    if (entry.isDirectory() && !entry.isSymbolicLink() && !ignoredDirectories.has(entry.name.toLowerCase())) {
                        pending.push(path.join(directory, entry.name));
                    }
                }
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                    options.onError?.(`Cannot scan ${directory}: ${(error as Error).message}`);
                }
            }
        }));
        // Release completed queue entries rather than retaining an entire disk's tree.
        if (head > 2048) { pending.splice(0, head); head = 0; }
    }
}

async function isDirectory(directory: string): Promise<boolean> {
    try { return (await fs.stat(directory)).isDirectory(); } catch { return false; }
}

export async function readEngine(directory: string): Promise<DiscoveredEngine | null> {
    try {
        const build = JSON.parse((await fs.readFile(path.join(directory, 'Engine', 'Build', 'Build.version'), 'utf8')).replace(/^\uFEFF/, ''));
        const parts: unknown[] = [build.MajorVersion, build.MinorVersion, build.PatchVersion];
        if (!parts.every(part => typeof part === 'number' && Number.isInteger(part) && part >= 0)) return null;
        const installed = await fs.access(path.join(directory, 'Engine', 'Build', 'InstalledBuild.txt')).then(() => true, () => false);
        const hasSource = await isDirectory(path.join(directory, 'Engine', 'Source'));
        const hasBinaries = await isDirectory(path.join(directory, 'Engine', 'Binaries'));
        if (!installed && !hasSource && !hasBinaries) return null;
        return { path: directory, version: parts.join('.'), type: installed ? 'installed' : 'source' };
    } catch { return null; }
}

function pruneInternals(entries: import('node:fs').Dirent[], names: Set<string>) {
    for (let index = entries.length - 1; index >= 0; index--) {
        if (entries[index].isDirectory() && names.has(entries[index].name.toLowerCase())) entries.splice(index, 1);
    }
}

async function pruneDetectedTrees(directory: string, entries: import('node:fs').Dirent[]): Promise<DiscoveredEngine | null> {
    const engine = entries.some(entry => entry.isDirectory() && entry.name.toLowerCase() === 'engine') ? await readEngine(directory) : null;
    if (engine) pruneInternals(entries, engineInternals);
    if (entries.some(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.uproject'))) pruneInternals(entries, projectInternals);
    // Unity's Library cache can contain millions of generated files. Restrict
    // this exclusion to a recognised Unity project, not arbitrary "Library" folders.
    const names = new Set(entries.filter(entry => entry.isDirectory()).map(entry => entry.name.toLowerCase()));
    if (names.has('assets') && names.has('projectsettings')) pruneInternals(entries, new Set(['library', 'temp', 'logs']));
    return engine;
}

export async function discoverEngines(roots: string[], options: DiscoveryOptions<DiscoveredEngine> = {}): Promise<DiscoveredEngine[]> {
    const engines: DiscoveredEngine[] = [];
    await walkDirectories(roots, async (directory, entries) => {
        const engine = await pruneDetectedTrees(directory, entries);
        if (engine) { engines.push(engine); await options.onItem?.(engine); }
    }, options);
    return engines;
}

export async function discoverProjectFiles(roots: string[], options: DiscoveryOptions<string> = {}): Promise<string[]> {
    const projects: string[] = [];
    await walkDirectories(roots, async (directory, entries) => {
        for (const entry of entries) {
            if (entry.isFile() && entry.name.toLowerCase().endsWith('.uproject')) {
                const file = path.join(directory, entry.name);
                projects.push(file);
                await options.onItem?.(file);
            }
        }
        await pruneDetectedTrees(directory, entries);
    }, options);
    return projects;
}

export function parseRegisteredBuilds(output: string): Map<string, string> {
    const builds = new Map<string, string>();
    for (const line of output.split(/\r?\n/)) {
        const match = line.match(/^\s*(\{?[0-9a-f-]{36}\}?)\s+REG_SZ\s+(.+?)\s*$/i);
        if (match) builds.set(match[1].replace(/[{}]/g, '').toLowerCase(), match[2]);
    }
    return builds;
}

export async function resolveEngineVersion(
    projectPath: string,
    association: string,
    registeredBuilds: Map<string, string>,
    cache = new Map<string, Promise<DiscoveredEngine | null>>(),
): Promise<string | undefined> {
    const cachedEngine = (directory: string) => {
        const key = pathKey(directory);
        if (!cache.has(key)) cache.set(key, readEngine(directory));
        return cache.get(key)!;
    };
    if (/^\d+\.\d+(?:\.\d+)?$/.test(association)) return association;
    const registeredPath = registeredBuilds.get(association.replace(/[{}]/g, '').toLowerCase());
    if (registeredPath) {
        const engine = await cachedEngine(registeredPath);
        if (engine) return engine.version;
    }
    for (let directory = path.dirname(projectPath); ; directory = path.dirname(directory)) {
        const engine = await cachedEngine(directory);
        if (engine) return engine.version;
        if (path.dirname(directory) === directory) break;
    }
    return undefined;
}
