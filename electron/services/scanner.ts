import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
    Project, loadConfig,
    STORE_PATH, EXCLUDED_PATH, SIZES_CACHE_PATH,
    readJsonFile, writeJsonFile
} from './configStore';

const execAsync = promisify(exec);

async function scanSingleFolder(scanPath: string, dirName: string): Promise<Project | null> {
    const subFolderPath = path.join(scanPath, dirName);
    try {
        const subEntries = await fs.readdir(subFolderPath);
        const uprojectFile = subEntries.find(f => f.endsWith('.uproject'));
        if (!uprojectFile) return null;

        const fullPath = path.join(subFolderPath, uprojectFile);
        let version = 'Unknown';
        try {
            const content = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
            if (content.EngineAssociation) version = content.EngineAssociation;
        } catch { }

        const stat = await fs.stat(fullPath);
        return {
            id: fullPath,
            name: uprojectFile.replace('.uproject', ''),
            path: fullPath,
            version,
            lastModified: stat.mtimeMs
        };
    } catch {
        return null;
    }
}

export async function scanProjects(): Promise<Project[]> {
    const [manualProjects, excluded, config] = await Promise.all([
        readJsonFile<Project[]>(STORE_PATH, []),
        readJsonFile<string[]>(EXCLUDED_PATH, []),
        loadConfig()
    ]);

    const scannedProjects: Project[] = [];
    const knownPaths = new Set(manualProjects.map(p => p.path));

    for (const scanPath of config.projectPaths) {
        if (!existsSync(scanPath)) continue;
        try {
            const entries = await fs.readdir(scanPath, { withFileTypes: true });
            const dirs = entries.filter(e => e.isDirectory());

            const results = await Promise.allSettled(
                dirs.map(entry => scanSingleFolder(scanPath, entry.name))
            );

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    const project = result.value;
                    if (!knownPaths.has(project.path) && !scannedProjects.some(p => p.path === project.path)) {
                        scannedProjects.push(project);
                    }
                }
            }
        } catch (e) {
            console.error(`Error scanning project path ${scanPath}:`, e);
        }
    }

    const allProjects = [...manualProjects, ...scannedProjects].filter(p => !excluded.includes(p.path));

    for (const p of allProjects) {
        if (config.projectOverrides?.[p.path]) {
            const override = config.projectOverrides[p.path];
            if (override.name) p.name = override.name;
            if (override.thumbnail) p.thumbnail = override.thumbnail;
            if (override.launchProfiles) p.launchProfiles = override.launchProfiles;
        }

        if (!p.thumbnail) {
            const thumbPath = path.join(path.dirname(p.path), 'Saved', 'AutoScreenshot.png');
            if (existsSync(thumbPath)) {
                p.thumbnail = `local-file://${encodeURIComponent(thumbPath.replace(/\\/g, '/'))}`;
            }
        }
    }

    return allProjects.sort((a, b) => b.lastModified - a.lastModified);
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
    } catch { }
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
