import fs from 'node:fs/promises';
import type { DiscoveryOptions, DiscoveredEngine } from './discovery';
import { discoverEngines, pathKey } from './discovery';
import { scanProjects } from './scanner';
import type { Project } from './configStore';
import { loadConfig, STORE_PATH, EXCLUDED_PATH } from './configStore';

export interface ScanSnapshot<T> {
    items: T[];
    scanning: boolean;
    directories: number;
    currentPath: string;
    error?: string;
}

// Both polling and legacy full-list IPC requests share the same in-flight scan.
// A refresh retains known items while new discoveries are published progressively.
export function createScanCoordinator<T extends { path: string }>(
    scan: (options: DiscoveryOptions<T>) => Promise<T[]>,
) {
    let signature: string | undefined;
    let state: ScanSnapshot<T> = { items: [], scanning: false, directories: 0, currentPath: '' };
    let controller: AbortController | undefined;
    let task: Promise<T[]> | undefined;
    const snapshot = (nextSignature: string, refresh = false): ScanSnapshot<T> => {
        if (signature !== nextSignature || (!state.scanning && (refresh || !task))) {
            controller?.abort();
            controller = new AbortController();
            const activeController = controller;
            signature = nextSignature;
            state = { items: [...state.items], scanning: true, directories: 0, currentPath: '' };
            const currentState = state;
            const items = new Map(state.items.map(item => [pathKey(item.path), item]));
            const active = () => state === currentState && !activeController.signal.aborted;
            task = Promise.resolve().then(() => scan({
                signal: activeController.signal,
                onItem: item => {
                    if (!active()) return;
                    items.set(pathKey(item.path), item);
                    currentState.items = [...items.values()];
                },
                onProgress: (directories, currentPath) => {
                    if (!active()) return;
                    currentState.directories = directories;
                    currentState.currentPath = currentPath;
                },
                onError: message => { if (active()) currentState.error = message; },
            })).then(result => {
                if (active()) currentState.items = result;
                return result;
            }).catch(error => {
                if (active()) currentState.error = error instanceof Error ? error.message : String(error);
                return currentState.items;
            }).finally(() => { if (active()) currentState.scanning = false; });
        }
        return { ...state, items: [...state.items] };
    };
    return {
        snapshot,
        complete: async (nextSignature: string, refresh = true) => {
            snapshot(nextSignature, refresh);
            return task!;
        },
    };
}

const engines = createScanCoordinator<DiscoveredEngine>(async options => {
    const config = await loadConfig();
    return discoverEngines(config.enginePaths, options);
});
const projects = createScanCoordinator<Project>(scanProjects);

async function projectSignature(): Promise<string> {
    const config = await loadConfig();
    const modified = await Promise.all([STORE_PATH, EXCLUDED_PATH].map(file => fs.stat(file).then(stat => stat.mtimeMs, () => 0)));
    return JSON.stringify([config.projectPaths, config.projectOverrides, modified]);
}

export async function getEngineScan(refresh = false) {
    const config = await loadConfig();
    return engines.snapshot(JSON.stringify(config.enginePaths), refresh);
}

export async function getProjectScan(refresh = false) {
    return projects.snapshot(await projectSignature(), refresh);
}

export async function getEnginesComplete() {
    const config = await loadConfig();
    return engines.complete(JSON.stringify(config.enginePaths));
}

export async function getProjectsComplete() {
    return projects.complete(await projectSignature());
}
