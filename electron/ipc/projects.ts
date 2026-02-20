import { ipcMain, dialog, shell } from 'electron';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
    Project, loadConfig, saveConfig,
    STORE_PATH, EXCLUDED_PATH,
    readJsonFile, writeJsonFile
} from '../services/configStore';
import { scanProjects, getProjectSizeCached } from '../services/scanner';

export function registerProjectHandlers() {
    ipcMain.handle('get-projects', async () => {
        return scanProjects();
    });

    ipcMain.handle('update-project-details', async (_, projectPath: string, details: { name?: string, thumbnail?: string }) => {
        const config = await loadConfig();
        if (!config.projectOverrides) config.projectOverrides = {};
        if (!config.projectOverrides[projectPath]) config.projectOverrides[projectPath] = {};
        if (details.name !== undefined) config.projectOverrides[projectPath].name = details.name;
        if (details.thumbnail !== undefined) config.projectOverrides[projectPath].thumbnail = details.thumbnail;
        await saveConfig(config);
        return true;
    });

    ipcMain.handle('select-image', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        const buffer = await fs.readFile(result.filePaths[0]);
        return `data:image/png;base64,${buffer.toString('base64')}`;
    });

    ipcMain.handle('save-project', async (_, project: Project) => {
        try {
            const projects = await readJsonFile<Project[]>(STORE_PATH, []);
            const index = projects.findIndex(p => p.path === project.path);
            if (index >= 0) {
                projects[index] = project;
            } else {
                projects.push(project);
            }
            await writeJsonFile(STORE_PATH, projects);
            return true;
        } catch (error) {
            console.error('Failed to save project:', error);
            return false;
        }
    });

    ipcMain.handle('select-project-file', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Unreal Project', extensions: ['uproject'] }]
        });
        if (canceled) return null;
        return filePaths[0];
    });

    ipcMain.handle('add-project-path', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        if (result.canceled) return false;
        const addedPath = result.filePaths[0];
        const config = await loadConfig();
        if (!config.projectPaths.includes(addedPath)) {
            config.projectPaths.push(addedPath);
            await saveConfig(config);
            return true;
        }
        return false;
    });

    ipcMain.handle('add-project-file', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Unreal Project', extensions: ['uproject'] }]
        });
        if (result.canceled || result.filePaths.length === 0) return false;
        const filePath = result.filePaths[0];
        const projectDir = path.dirname(filePath);
        const config = await loadConfig();
        if (!config.projectPaths.includes(projectDir)) {
            config.projectPaths.push(projectDir);
            await saveConfig(config);
            return true;
        }
        return false;
    });

    ipcMain.handle('add-dropped-project', async (_, filePath: string) => {
        if (!filePath || !filePath.toLowerCase().endsWith('.uproject')) return false;
        const projectDir = path.dirname(filePath);
        const config = await loadConfig();
        if (!config.projectPaths.includes(projectDir)) {
            config.projectPaths.push(projectDir);
            await saveConfig(config);
            return true;
        }
        return false;
    });

    ipcMain.handle('launch-project', async (_, projectPath: string) => {
        await shell.openPath(projectPath);
    });

    ipcMain.handle('show-in-explorer', async (_, projectPath: string) => {
        shell.showItemInFolder(projectPath);
    });

    ipcMain.handle('remove-project', async (_, projectPath: string) => {
        // Remove from manual projects
        if (existsSync(STORE_PATH)) {
            try {
                const projects = await readJsonFile<Project[]>(STORE_PATH, []);
                await writeJsonFile(STORE_PATH, projects.filter(p => p.path !== projectPath));
            } catch { }
        }
        // Add to exclusion list
        const excluded = await readJsonFile<string[]>(EXCLUDED_PATH, []);
        if (!excluded.includes(projectPath)) {
            excluded.push(projectPath);
            await writeJsonFile(EXCLUDED_PATH, excluded);
        }
        // Clean overrides
        const config = await loadConfig();
        if (config.projectOverrides?.[projectPath]) {
            delete config.projectOverrides[projectPath];
            await saveConfig(config);
        }
        return true;
    });

    ipcMain.handle('delete-project', async (_, projectPath: string) => {
        const projectDir = path.dirname(projectPath);
        if (existsSync(projectDir)) {
            await shell.trashItem(projectDir);
        }
        return true;
    });

    ipcMain.handle('open-project-log', async (_, projectPath: string) => {
        const projectDir = path.dirname(projectPath);
        const logDir = path.join(projectDir, 'Saved', 'Logs');
        if (existsSync(logDir)) {
            await shell.openPath(logDir);
        } else {
            await shell.openPath(projectDir);
        }
    });

    ipcMain.handle('clean-project-cache', async (_, projectPath: string) => {
        const projectDir = path.dirname(projectPath);
        const targets = ['Intermediate', 'DerivedDataCache'];
        await Promise.all(
            targets.map(async (folder) => {
                const targetPath = path.join(projectDir, folder);
                if (existsSync(targetPath)) {
                    await fs.rm(targetPath, { recursive: true, force: true });
                }
            })
        );
    });

    ipcMain.handle('clone-project', async (_, projectPath: string, newName: string) => {
        const projectDir = path.dirname(projectPath);
        const parentDir = path.dirname(projectDir);
        const newProjectDir = path.join(parentDir, newName);
        if (existsSync(newProjectDir)) throw new Error('Project already exists');

        await fs.mkdir(newProjectDir);
        const entries = await fs.readdir(projectDir, { withFileTypes: true });
        const skipDirs = new Set(['Intermediate', 'Saved', 'DerivedDataCache', 'Binaries', '.git', '.vs']);

        await Promise.all(
            entries.map(async (entry) => {
                if (skipDirs.has(entry.name)) return;
                const srcPath = path.join(projectDir, entry.name);
                const destPath = path.join(newProjectDir, entry.name);

                if (entry.isDirectory()) {
                    await fs.cp(srcPath, destPath, { recursive: true });
                } else if (entry.name.endsWith('.uproject')) {
                    await fs.copyFile(srcPath, path.join(newProjectDir, `${newName}.uproject`));
                } else {
                    await fs.copyFile(srcPath, destPath);
                }
            })
        );
    });

    ipcMain.handle('get-project-size', async (_, projectPath: string) => {
        return getProjectSizeCached(projectPath);
    });

    ipcMain.handle('read-ini-file', async (_, projectPath: string) => {
        const iniPath = path.join(path.dirname(projectPath), 'Config', 'DefaultEngine.ini');
        if (!existsSync(iniPath)) return {};

        const content = await fs.readFile(iniPath, 'utf-8');
        const config: Record<string, any> = {};

        const patterns: [RegExp, string, (v: string) => any][] = [
            [/r\.RayTracing=(True|False)/i, 'rayTracing', v => v.toLowerCase() === 'true'],
            [/r\.Lumen\.DiffuseIndirect\.Allow=(\d)/, 'lumen', v => v === '1'],
            [/r\.Nanite=(\d)/, 'nanite', v => v === '1'],
            [/r\.Shadow\.Virtual\.Enable=(\d)/, 'virtualShadowMaps', v => v === '1'],
            [/r\.AntiAliasingMethod=(\d)/, 'antiAliasing', v => parseInt(v)],
            [/r\.VSync=(\d)/, 'vsync', v => v === '1'],
            [/DefaultGraphicsRHI=(DefaultGraphicsRHI_\w+)/, 'rhi', v => v],
        ];

        for (const [regex, key, transform] of patterns) {
            const match = content.match(regex);
            if (match) config[key] = transform(match[1]);
        }

        return config;
    });

    ipcMain.handle('write-ini-file', async (_, projectPath: string, data: Record<string, any>) => {
        const iniPath = path.join(path.dirname(projectPath), 'Config', 'DefaultEngine.ini');
        if (!existsSync(iniPath)) return;

        let content = await fs.readFile(iniPath, 'utf-8');

        const setIniValue = (section: string, key: string, value: string) => {
            const keyRegex = new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=[^\\r\\n]*`);
            if (!content.includes(section)) {
                content += `\n\n${section}\n${key}=${value}`;
            } else if (keyRegex.test(content)) {
                content = content.replace(keyRegex, `${key}=${value}`);
            } else {
                content = content.replace(section, `${section}\n${key}=${value}`);
            }
        };

        const rendererSection = '[/Script/Engine.RendererSettings]';

        if (data.rayTracing !== undefined) setIniValue(rendererSection, 'r.RayTracing', data.rayTracing ? 'True' : 'False');
        if (data.lumen !== undefined) setIniValue(rendererSection, 'r.Lumen.DiffuseIndirect.Allow', data.lumen ? '1' : '0');
        if (data.nanite !== undefined) setIniValue(rendererSection, 'r.Nanite', data.nanite ? '1' : '0');
        if (data.virtualShadowMaps !== undefined) setIniValue(rendererSection, 'r.Shadow.Virtual.Enable', data.virtualShadowMaps ? '1' : '0');
        if (data.antiAliasing !== undefined) setIniValue(rendererSection, 'r.AntiAliasingMethod', String(data.antiAliasing));
        if (data.vsync !== undefined) setIniValue(rendererSection, 'r.VSync', data.vsync ? '1' : '0');
        if (data.rhi !== undefined) {
            setIniValue('[/Script/WindowsTargetPlatform.WindowsTargetSettings]', 'DefaultGraphicsRHI', data.rhi);
        }

        await fs.writeFile(iniPath, content, 'utf-8');
    });
}
