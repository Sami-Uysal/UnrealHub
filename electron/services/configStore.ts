import { app } from 'electron';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
export const STORE_PATH = path.join(app.getPath('userData'), 'projects.json');
export const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
export const TAGS_PATH = path.join(app.getPath('userData'), 'project-tags.json');
export const FAVORITES_PATH = path.join(app.getPath('userData'), 'favorites.json');
export const NOTES_PATH = path.join(app.getPath('userData'), 'project-notes.json');
export const SIZES_CACHE_PATH = path.join(app.getPath('userData'), 'project-sizes.json');
export const EXCLUDED_PATH = path.join(app.getPath('userData'), 'excluded-projects.json');

export interface ProjectOverride {
    name?: string;
    thumbnail?: string;
}

export interface Config {
    enginePaths: string[];
    projectPaths: string[];
    projectOverrides?: Record<string, ProjectOverride>;
}

export interface Project {
    id: string;
    name: string;
    path: string;
    version: string;
    lastModified: number;
    thumbnail?: string;
}

let configCache: Config | null = null;
let configDirty = false;

export async function loadConfig(): Promise<Config> {
    if (configCache && !configDirty) return configCache;

    try {
        if (!existsSync(CONFIG_PATH)) {
            configCache = {
                enginePaths: [
                    'C:\\\\Program Files\\\\Epic Games',
                    'D:\\\\Epic Games',
                    'C:\\\\Epic Games'
                ],
                projectPaths: [],
                projectOverrides: {}
            };
            return configCache;
        }
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        if (!parsed.projectOverrides) parsed.projectOverrides = {};
        configCache = parsed;
        configDirty = false;
        return configCache!;
    } catch {
        configCache = { enginePaths: [], projectPaths: [], projectOverrides: {} };
        return configCache;
    }
}

export async function saveConfig(config: Config) {
    configCache = config;
    configDirty = false;
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function invalidateConfigCache() {
    configDirty = true;
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
    if (!existsSync(filePath)) return fallback;
    try {
        return JSON.parse(await fs.readFile(filePath, 'utf-8'));
    } catch {
        return fallback;
    }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
