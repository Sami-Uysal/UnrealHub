import { ipcMain, dialog, shell } from 'electron';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
    Project, loadConfig, saveConfig,
    STORE_PATH, EXCLUDED_PATH, KANBAN_PATH,
    readJsonFile, writeJsonFile
} from '../services/configStore';
import { scanProjects, getProjectSizeCached } from '../services/scanner';

export function registerProjectHandlers() {
    ipcMain.handle('get-projects', async () => {
        return scanProjects();
    });

    ipcMain.handle('update-project-details', async (_, projectPath: string, details: { name?: string, thumbnail?: string, launchProfiles?: import('../services/configStore').LaunchProfile[] }) => {
        const config = await loadConfig();
        if (!config.projectOverrides) config.projectOverrides = {};
        if (!config.projectOverrides[projectPath]) config.projectOverrides[projectPath] = {};
        if (details.name !== undefined) config.projectOverrides[projectPath].name = details.name;
        if (details.thumbnail !== undefined) config.projectOverrides[projectPath].thumbnail = details.thumbnail;
        if (details.launchProfiles !== undefined) config.projectOverrides[projectPath].launchProfiles = details.launchProfiles;
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

    ipcMain.handle('launch-project', async (_, projectPath: string, args?: string) => {
        if (!args || args.trim() === '') {
            await shell.openPath(projectPath);
            return;
        }

        try {
            const projectData = JSON.parse(await fs.readFile(projectPath, 'utf-8'));
            const association = projectData.EngineAssociation;
            if (!association) throw new Error('No EngineAssociation found');

            const config = await loadConfig();
            let engineExe = '';

            for (const ep of config.enginePaths) {
                if (!existsSync(ep)) continue;
                const checkPaths = [
                    path.join(ep, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'),
                    path.join(ep, 'Engine', 'Binaries', 'Win64', 'UE4Editor.exe'),
                    // check if the ep is the root epic games folder and has subfolders
                    path.join(ep, `UE_${association}`, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'),
                    path.join(ep, association, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe')
                ];

                // Direct version match approach:
                if (path.basename(ep) === `UE_${association}` || path.basename(ep) === association) {
                    checkPaths.push(path.join(ep, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'));
                    checkPaths.push(path.join(ep, 'Engine', 'Binaries', 'Win64', 'UE4Editor.exe'));
                }

                for (const cp of checkPaths) {
                    if (existsSync(cp)) {
                        engineExe = cp;
                        break;
                    }
                }
                if (engineExe) break;
            }

            if (!engineExe) {
                // Try from Windows registry if custom source build (optional, skipping for now) 
                // Fallback to searching all configured engine paths
                const dirs = await fs.readdir(config.enginePaths[0] || '').catch(() => []);
                for (const d of dirs) {
                    if (d.includes(association)) {
                        const cp = path.join(config.enginePaths[0], d, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe');
                        if (existsSync(cp)) {
                            engineExe = cp;
                            break;
                        }
                    }
                }
            }

            if (engineExe) {
                const { spawn } = await import('node:child_process');
                const spawnArgs = [projectPath, ...args.split(' ').filter(a => a.trim() !== '')];
                const child = spawn(engineExe, spawnArgs, { detached: true, stdio: 'ignore' });
                child.unref();
            } else {
                console.warn('Engine executable not found for custom launch. Falling back to default shell open.');
                await shell.openPath(projectPath);
            }
        } catch (e) {
            console.error('Failed to launch with args', e);
            await shell.openPath(projectPath);
        }
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

    ipcMain.handle('smart-backup', async (_, projectPath: string) => {
        const projectDir = path.dirname(projectPath);
        const projectName = path.basename(projectDir);
        const defaultPath = `${projectName}_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;

        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Smart Backup',
            defaultPath: defaultPath,
            filters: [{ name: 'Zip Archives', extensions: ['zip'] }]
        });

        if (!filePath) return { success: false, canceled: true };

        return new Promise((resolve, reject) => {
            import('archiver').then(({ default: archiver }) => {
                import('node:fs').then(({ createWriteStream }) => {
                    const output = createWriteStream(filePath);
                    const archive = archiver('zip', {
                        zlib: { level: 9 } // Sets the compression level.
                    });

                    output.on('close', () => {
                        resolve({ success: true, size: archive.pointer() });
                    });

                    archive.on('error', (err: any) => {
                        reject({ success: false, error: err.message });
                    });

                    archive.pipe(output);

                    const skipDirs = ['Intermediate', 'Saved', 'DerivedDataCache', 'Binaries', '.git', '.vs'];

                    archive.glob('**/*', {
                        cwd: projectDir,
                        ignore: skipDirs.map(dir => `${dir}/**`)
                    });

                    archive.finalize();
                });
            }).catch(err => reject({ success: false, error: 'Archiver failed to load: ' + err.message }));
        });
    });

    ipcMain.handle('read-uproject-plugins', async (_, projectPath: string) => {
        try {
            const content = await fs.readFile(projectPath, 'utf-8');
            const data = JSON.parse(content);
            return data.Plugins || [];
        } catch (e) {
            console.error('Failed to read uproject plugins', e);
            return [];
        }
    });

    ipcMain.handle('write-uproject-plugins', async (_, projectPath: string, plugins: any[]) => {
        try {
            const content = await fs.readFile(projectPath, 'utf-8');
            const data = JSON.parse(content);
            data.Plugins = plugins;
            await fs.writeFile(projectPath, JSON.stringify(data, null, '\t'), 'utf-8');
            return true;
        } catch (e) {
            console.error('Failed to write uproject plugins', e);
            return false;
        }
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

    ipcMain.handle('get-project-kanban', async (_, projectPath: string) => {
        const kanbanData = await readJsonFile<Record<string, any>>(KANBAN_PATH, {});
        return kanbanData[projectPath] || null;
    });

    ipcMain.handle('save-project-kanban', async (_, projectPath: string, board: any) => {
        const kanbanData = await readJsonFile<Record<string, any>>(KANBAN_PATH, {});
        kanbanData[projectPath] = board;
        await writeJsonFile(KANBAN_PATH, kanbanData);
    });

    ipcMain.handle('get-project-configs', async (_, projectPath: string) => {
        const configDir = path.join(path.dirname(projectPath), 'Config');
        if (!existsSync(configDir)) return [];
        try {
            const files = await fs.readdir(configDir);
            return files.filter(f => f.toLowerCase().endsWith('.ini'));
        } catch (e) {
            console.error('Failed to read config directory:', e);
            return [];
        }
    });

    ipcMain.handle('read-raw-ini-file', async (_, projectPath: string, fileName: string) => {
        const iniPath = path.join(path.dirname(projectPath), 'Config', fileName);
        if (!existsSync(iniPath)) return '';
        try {
            return await fs.readFile(iniPath, 'utf-8');
        } catch (e) {
            console.error(`Failed to read ${fileName}:`, e);
            return '';
        }
    });

    ipcMain.handle('write-raw-ini-file', async (_, projectPath: string, fileName: string, content: string) => {
        const iniPath = path.join(path.dirname(projectPath), 'Config', fileName);
        try {
            await fs.writeFile(iniPath, content, 'utf-8');
            return true;
        } catch (e) {
            console.error(`Failed to write ${fileName}:`, e);
            throw e;
        }
    });
}
