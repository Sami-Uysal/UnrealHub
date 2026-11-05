import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
    Project, loadConfig,
    STORE_PATH, EXCLUDED_PATH, SIZES_CACHE_PATH,
    readJsonFile, writeJsonFile
} from './configStore';
import { discoverProjectFiles, parseRegisteredBuilds, pathKey, resolveEngineVersion } from './discovery';
import type { DiscoveryOptions, DiscoveredEngine } from './discovery';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

async function registeredBuilds(): Promise<Map<string, string>> {
    if (process.platform !== 'win32') return new Map();
    try {
        const { stdout } = await execFileAsync('reg.exe', ['query', 'HKCU\\Software\\Epic Games\\Unreal Engine\\Builds'], { windowsHide: true, timeout: 5000 });
        return parseRegisteredBuilds(stdout);
    } catch { return new Map(); }
}

async function readProject(fullPath: string): Promise<Project | null> {
    try {
        let version = 'Unknown';
        try {
            const content = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
            if (typeof content.EngineAssociation === 'string' && content.EngineAssociation) version = content.EngineAssociation;
        } catch (error) { console.warn(`Failed to parse ${fullPath}:`, error); }

        const stat = await fs.stat(fullPath);
        return {
            id: fullPath,
            name: path.basename(fullPath).replace(/\.uproject$/i, ''),
            path: fullPath,
            version,
            lastModified: stat.mtimeMs
        };
    } catch {
        return null;
    }
}

export async function scanProjects(options: DiscoveryOptions<Project> = {}): Promise<Project[]> {
    const [manualProjects, excluded, config, builds] = await Promise.all([
        readJsonFile<Project[]>(STORE_PATH, []),
        readJsonFile<string[]>(EXCLUDED_PATH, []),
        loadConfig(),
        registeredBuilds()
    ]);

    const excludedPaths = new Set(excluded.map(pathKey));
    const projects = new Map<string, Project>();
    const versionCache = new Map<string, Promise<DiscoveredEngine | null>>();
    const enrich = async (project: Project) => {
        const p = { ...project };
        p.engineVersion = await resolveEngineVersion(p.path, p.version, builds, versionCache);
        const override = config.projectOverrides?.[p.path];
        if (override?.name) p.name = override.name;
        if (override?.thumbnail) p.thumbnail = override.thumbnail;
        if (override?.launchProfiles) p.launchProfiles = override.launchProfiles;
        if (!p.thumbnail) {
            const thumbPath = path.join(path.dirname(p.path), 'Saved', 'AutoScreenshot.png');
            if (existsSync(thumbPath)) p.thumbnail = 'local-file://' + encodeURIComponent(thumbPath.replace(/\\/g, '/'));
        }
        projects.set(pathKey(p.path), p);
        await options.onItem?.(p);
    };
    for (const project of manualProjects) {
        const key = pathKey(project.path);
        if (!excludedPaths.has(key) && !projects.has(key)) await enrich(project);
    }
    await discoverProjectFiles(config.projectPaths, {
        onProgress: options.onProgress,
        onError: options.onError,
        signal: options.signal,
        onItem: async fullPath => {
            const key = pathKey(fullPath);
            if (projects.has(key) || excludedPaths.has(key)) return;
            const project = await readProject(fullPath);
            if (project) await enrich(project);
        },
    });
    return [...projects.values()].sort((a, b) => b.lastModified - a.lastModified);
}

export async function getDirectorySize(dirPath: string): Promise<number> {
    try {
        const escapedPath = dirPath.replace(/'/g, "''");
        const { stdout } = await execAsync(
            `powershell -NoProfile -Command "(Get-ChildItem -Path '${escapedPath}' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum"`,
            { timeout: 30000 }
        );
        const size = parseInt(stdout.trim(), 10);
        return isNaN(size) ? 0 : size;
    } catch {
        return getDirectorySizeJS(dirPath);
    }
}

async function getDirectorySizeJS(dirPath: string): Promise<number> {
    let totalSize = 0;
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const promises = entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isFile()) {
                const stat = await fs.stat(fullPath);
                return stat.size;
            } else if (entry.isDirectory()) {
                return getDirectorySizeJS(fullPath);
            }
            return 0;
        });
        const sizes = await Promise.all(promises);
        totalSize = sizes.reduce((a, b) => a + b, 0);
    } catch (error) { console.warn('Failed to get directory size JS:', error); }
    return totalSize;
}

export async function getProjectSizeCached(projectPath: string): Promise<number> {
    try {
        const projectDir = path.dirname(projectPath);
        const stat = await fs.stat(projectPath);
        const currentModified = stat.mtimeMs;

        const cache = await readJsonFile<Record<string, { size: number; lastModified: number }>>(SIZES_CACHE_PATH, {});
        const cached = cache[projectPath];

        if (cached && cached.lastModified === currentModified) {
            return cached.size;
        }

        const size = await getDirectorySize(projectDir);
        cache[projectPath] = { size, lastModified: currentModified };
        writeJsonFile(SIZES_CACHE_PATH, cache);
        return size;
    } catch {
        return 0;
    }
}
