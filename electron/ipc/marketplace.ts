import { ipcMain } from 'electron';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface UpluginData {
    FileVersion?: number;
    Version?: number;
    VersionName?: string;
    FriendlyName?: string;
    Description?: string;
    Category?: string;
    CreatedBy?: string;
    CreatedByURL?: string;
    DocsURL?: string;
    MarketplaceURL?: string;
    CanContainContent?: boolean;
    IsBetaVersion?: boolean;
    IsExperimentalVersion?: boolean;
    EnabledByDefault?: boolean;
    Installed?: boolean;
    Modules?: Array<{ Name: string; Type: string; LoadingPhase?: string }>;
}

export interface PluginInfo {
    name: string;
    friendlyName: string;
    description: string;
    category: string;
    version: string;
    createdBy: string;
    enabledByDefault: boolean;
    isExperimental: boolean;
    isBeta: boolean;
    canContainContent: boolean;
    installed: boolean;
    pluginPath: string;
    iconPath: string | null;
    modules: string[];
}

export interface VaultAssetInfo {
    id: string;
    appName: string;
    catalogItemId: string;
    title: string;
    buildVersion: string;
    installPath: string;
    sizeBytes: number;
}

async function scanPluginsRecursive(dirPath: string, maxDepth: number = 5): Promise<PluginInfo[]> {
    const plugins: PluginInfo[] = [];
    if (maxDepth <= 0) return plugins;

    try {
        if (!existsSync(dirPath)) return plugins;
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isFile() && entry.name.endsWith('.uplugin')) {
                try {
                    const raw = readFileSync(fullPath, 'utf-8');
                    // Handle BOM
                    let clean = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
                    // UE .uplugin files often have trailing commas (invalid JSON)
                    // Strip: comma followed by whitespace then ] or }
                    clean = clean.replace(/,\s*([\]}])/g, '$1');
                    const data: UpluginData = JSON.parse(clean);
                    const pluginDir = path.dirname(fullPath);
                    const pluginName = path.basename(fullPath, '.uplugin');

                    // Look for icon
                    let iconPath: string | null = null;
                    const icon128 = path.join(pluginDir, 'Resources', 'Icon128.png');
                    const pluginIcon = path.join(pluginDir, `${pluginName}.png`);
                    if (existsSync(icon128)) iconPath = icon128;
                    else if (existsSync(pluginIcon)) iconPath = pluginIcon;

                    plugins.push({
                        name: pluginName,
                        friendlyName: data.FriendlyName || pluginName,
                        description: data.Description || '',
                        category: data.Category || 'Other',
                        version: data.VersionName || '1.0',
                        createdBy: data.CreatedBy || '',
                        enabledByDefault: data.EnabledByDefault ?? false,
                        isExperimental: data.IsExperimentalVersion ?? false,
                        isBeta: data.IsBetaVersion ?? false,
                        canContainContent: data.CanContainContent ?? false,
                        installed: true,
                        pluginPath: pluginDir,
                        iconPath,
                        modules: (data.Modules || []).map(m => m.Name),
                    });
                } catch (e) {
                    console.error(`Error parsing plugin ${fullPath}:`, e);
                }
            } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                const subPlugins = await scanPluginsRecursive(fullPath, maxDepth - 1);
                plugins.push(...subPlugins);
            }
        }
    } catch (e) {
        console.error('Error scanning plugins directory:', e);
    }

    return plugins;
}

async function scanVaultCache(): Promise<VaultAssetInfo[]> {
    const assets: VaultAssetInfo[] = [];

    // Common vault cache locations on Windows & macOS
    const possiblePaths = [
        path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'VaultCache'),
        path.join(process.env.LOCALAPPDATA || '', 'EpicGamesLauncher', 'VaultCache'),
        path.join('/Users/Shared/Epic Games/EpicGamesLauncher/VaultCache'),
        path.join(require('os').homedir(), 'Library', 'Application Support', 'Epic', 'EpicGamesLauncher', 'VaultCache')
    ];

    for (const vaultPath of possiblePaths) {
        if (!existsSync(vaultPath)) continue;

        try {
            const entries = await fs.readdir(vaultPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;

                const assetDir = path.join(vaultPath, entry.name);
                // Each vault asset has subdirectories with .manifest files
                try {
                    const subEntries = await fs.readdir(assetDir, { withFileTypes: true });
                    for (const sub of subEntries) {
                        if (!sub.isDirectory()) continue;

                        const manifestDir = path.join(assetDir, sub.name);
                        const manifestFiles = await fs.readdir(manifestDir);
                        const manifest = manifestFiles.find(f => f.endsWith('.manifest'));

                        if (manifest) {
                            try {
                                const manifestContent = readFileSync(path.join(manifestDir, manifest), 'utf-8');
                                const manifestData = JSON.parse(manifestContent);

                                // Calculate directory size
                                let totalSize = 0;
                                try {
                                    const dataPath = path.join(manifestDir, 'data');
                                    if (existsSync(dataPath)) {
                                        const dataFiles = await fs.readdir(dataPath);
                                        for (const df of dataFiles) {
                                            const stat = await fs.stat(path.join(dataPath, df));
                                            totalSize += stat.size;
                                        }
                                    }
                                } catch { /* ignore */ }

                                assets.push({
                                    id: entry.name,
                                    appName: manifestData.AppNameString || entry.name,
                                    catalogItemId: manifestData.CatalogItemId || '',
                                    title: manifestData.DisplayName || manifestData.AppNameString || entry.name,
                                    buildVersion: manifestData.BuildVersionString || '',
                                    installPath: manifestDir,
                                    sizeBytes: totalSize,
                                });
                            } catch {
                                // manifest parse error, skip
                            }
                        }
                    }
                } catch { /* ignore sub dir errors */ }
            }
        } catch (e) {
            console.error('Error scanning vault cache:', e);
        }
    }

    return assets;
}

// Scan for .item files from Epic's manifests directory
async function scanInstalledManifests(): Promise<any[]> {
    const items: any[] = [];
    const manifestsPaths = [
        path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'),
        path.join(require('os').homedir(), 'Library', 'Application Support', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests')
    ];

    for (const manifestsPath of manifestsPaths) {
        if (!existsSync(manifestsPath)) continue;

        try {
            const files = await fs.readdir(manifestsPath);
            for (const file of files) {
                if (!file.endsWith('.item')) continue;
                try {
                    const content = readFileSync(path.join(manifestsPath, file), 'utf-8');
                    const data = JSON.parse(content);
                    items.push({
                        installLocation: data.InstallLocation || '',
                        appName: data.AppName || '',
                        catalogItemId: data.CatalogItemId || '',
                        displayName: data.DisplayName || data.AppName || '',
                        appVersion: data.AppVersionString || '',
                        namespace: data.MainGameCatalogNamespace || data.CatalogNamespace || '',
                    });
                } catch { /* skip malformed items */ }
            }
        } catch { /* ignore */ }
    }

    return items;
}

export function registerMarketplaceHandlers() {
    // Scan all plugins in an engine's Plugin directory
    ipcMain.handle('scan-engine-plugins', async (_, enginePath: string) => {
        const pluginsDir = path.join(enginePath, 'Engine', 'Plugins');
        if (!existsSync(pluginsDir)) return [];
        return scanPluginsRecursive(pluginsDir);
    });

    // Scan plugins in a project's Plugins directory
    ipcMain.handle('scan-project-plugins', async (_, projectPath: string) => {
        const pluginsDir = path.join(projectPath, 'Plugins');
        if (!existsSync(pluginsDir)) return [];
        return scanPluginsRecursive(pluginsDir, 3);
    });

    // Get all vault cache assets
    ipcMain.handle('get-vault-assets', async () => {
        return scanVaultCache();
    });

    // Get installed manifests (.item files)
    ipcMain.handle('get-installed-manifests', async () => {
        return scanInstalledManifests();
    });

    // Open plugin folder in explorer
    ipcMain.handle('show-plugin-in-explorer', async (_, pluginPath: string) => {
        const { shell } = await import('electron');
        shell.showItemInFolder(pluginPath);
    });
}
