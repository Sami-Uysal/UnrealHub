import { ipcMain, dialog } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadConfig, saveConfig } from '../services/configStore';
import { getEngineScan, getEnginesComplete } from '../services/scanCoordinator';

export function registerEngineHandlers() {
    ipcMain.handle('get-engines', () => getEnginesComplete());
    ipcMain.handle('get-engine-scan', (_, refresh?: boolean) => getEngineScan(refresh === true));

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
            path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'), // Windows UE5
            path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UE4Editor.exe'),    // Windows UE4
            path.join(enginePath, 'Engine', 'Binaries', 'Mac', 'UnrealEditor.app', 'Contents', 'MacOS', 'UnrealEditor'), // Mac UE5
            path.join(enginePath, 'Engine', 'Binaries', 'Mac', 'UE4Editor.app', 'Contents', 'MacOS', 'UE4Editor'),       // Mac UE4
            path.join(enginePath, 'Engine', 'Binaries', 'Linux', 'UnrealEditor'),     // Linux UE5
            path.join(enginePath, 'Engine', 'Binaries', 'Linux', 'UE4Editor')         // Linux UE4
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
