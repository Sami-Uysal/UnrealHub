import { ipcMain } from 'electron';
import {
    loadConfig, saveConfig,
    TAGS_PATH, FAVORITES_PATH, NOTES_PATH,
    readJsonFile, writeJsonFile
} from '../services/configStore';

export function registerConfigHandlers() {
    ipcMain.handle('get-config-paths', async () => {
        const config = await loadConfig();
        return { enginePaths: config.enginePaths, projectPaths: config.projectPaths };
    });

    ipcMain.handle('remove-path', async (_, type: 'engine' | 'project', pathToRemove: string) => {
        const config = await loadConfig();
        if (type === 'engine') {
            config.enginePaths = config.enginePaths.filter(p => p !== pathToRemove);
        } else {
            config.projectPaths = config.projectPaths.filter(p => p !== pathToRemove);
        }
        await saveConfig(config);
        return true;
    });

    // ── Tags ──
    ipcMain.handle('get-project-tags', async () => {
        return readJsonFile<Record<string, string[]>>(TAGS_PATH, {});
    });

    ipcMain.handle('save-project-tags', async (_, tags: Record<string, string[]>) => {
        await writeJsonFile(TAGS_PATH, tags);
    });

    // ── Favorites ──
    ipcMain.handle('get-favorites', async () => {
        return readJsonFile<string[]>(FAVORITES_PATH, []);
    });

    ipcMain.handle('toggle-favorite', async (_, projectPath: string) => {
        const favorites = await readJsonFile<string[]>(FAVORITES_PATH, []);
        const updated = favorites.includes(projectPath)
            ? favorites.filter(f => f !== projectPath)
            : [...favorites, projectPath];
        await writeJsonFile(FAVORITES_PATH, updated);
        return updated;
    });

    // ── Notes ──
    ipcMain.handle('get-project-notes', async () => {
        return readJsonFile<Record<string, string>>(NOTES_PATH, {});
    });

    ipcMain.handle('save-project-notes', async (_, notes: Record<string, string>) => {
        await writeJsonFile(NOTES_PATH, notes);
    });
}
