import { ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadConfig, saveConfig } from '../services/configStore';

export function registerEngineHandlers() {
    ipcMain.handle('get-engines', async () => {
        const config = await loadConfig();
        const engines: { version: string; path: string }[] = [];
        const processedPaths = new Set<string>();

        for (const checkPath of config.enginePaths) {
            if (processedPaths.has(checkPath)) continue;
            processedPaths.add(checkPath);

            try {
                if (!existsSync(checkPath)) continue;

                const binaryPath = path.join(checkPath, 'Engine', 'Binaries');
                if (existsSync(binaryPath)) {
                    engines.push({ version: path.basename(checkPath).replace('UE_', ''), path: checkPath });
                    continue;
                }

                const dirs = await fs.readdir(checkPath);
                for (const dir of dirs) {
                    if (dir.startsWith('UE_')) {
                        engines.push({ version: dir.replace('UE_', ''), path: path.join(checkPath, dir) });
                    }
                }
            } catch (e) {
                console.error('Error scanning path ' + checkPath, e);
            }
        }

        return engines;
    });

    ipcMain.handle('add-engine-path', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        if (result.canceled) return false;
        const addedPath = result.filePaths[0];
        const config = await loadConfig();
        if (!config.enginePaths.includes(addedPath)) {
            config.enginePaths.push(addedPath);
            await saveConfig(config);
            return true;
        }
        return false;
    });

    ipcMain.handle('launch-engine', async (_, enginePath: string) => {
        const possiblePaths = [
            path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'),
            path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UE4Editor.exe')
        ];
        for (const exePath of possiblePaths) {
            if (existsSync(exePath)) {
                const { spawn } = await import('node:child_process');
                const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
                child.unref();
                return true;
            }
        }
        return false;
    });
}
