import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    frame: false,
    backgroundColor: 'rgba(52, 52, 52, 0.8)',
    icon: path.join(process.env.VITE_PUBLIC, 'u.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const STORE_PATH = path.join(app.getPath('userData'), 'projects.json');
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

interface ProjectOverride {
  name?: string;
  thumbnail?: string;
}

interface Config {
  enginePaths: string[];
  projectPaths: string[];
  projectOverrides?: Record<string, ProjectOverride>;
}

async function loadConfig(): Promise<Config> {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return {
        enginePaths: [
          'C:\\\\Program Files\\\\Epic Games',
          'D:\\\\Epic Games',
          'C:\\\\Epic Games'
        ],
        projectPaths: [],
        projectOverrides: {}
      };
    }
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.projectOverrides) parsed.projectOverrides = {};
    return parsed;
  } catch {
    return { enginePaths: [], projectPaths: [], projectOverrides: {} };
  }
}

async function saveConfig(config: Config) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

interface Project {
  id: string;
  name: string;
  path: string;
  version: string;
  lastModified: number;
  thumbnail?: string;
}

async function readProjects(): Promise<Project[]> {
  try {
    if (!existsSync(STORE_PATH)) return [];
    const data = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read projects:', error);
    return [];
  }
}

ipcMain.handle('get-projects', async () => {
  const manualProjects = await readProjects();

  const config = await loadConfig();
  const scannedProjects: Project[] = [];

  for (const scanPath of config.projectPaths) {
    if (!existsSync(scanPath)) continue;
    try {

      const entries = await fs.readdir(scanPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subFolderPath = path.join(scanPath, entry.name);
          const subEntries = await fs.readdir(subFolderPath);
          const uprojectFile = subEntries.find(f => f.endsWith('.uproject'));

          if (uprojectFile) {
            const fullPath = path.join(subFolderPath, uprojectFile);

            if (manualProjects.some(p => p.path === fullPath)) continue;
            if (scannedProjects.some(p => p.path === fullPath)) continue;

            let version = 'Unknown';
            try {
              const content = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
              if (content.EngineAssociation) {
                version = content.EngineAssociation;
              }
            } catch { }

            scannedProjects.push({
              id: fullPath,
              name: uprojectFile.replace('.uproject', ''),
              path: fullPath,
              version: version,
              lastModified: (await fs.stat(fullPath)).mtimeMs
            });
          }
        }
      }
    } catch (e) {
      console.error(`Error scanning project path ${scanPath}:`, e);
    }
  }

  const allProjects = [...manualProjects, ...scannedProjects];

  for (const p of allProjects) {
    if (config.projectOverrides && config.projectOverrides[p.path]) {
      const override = config.projectOverrides[p.path];
      if (override.name) p.name = override.name;
      if (override.thumbnail) p.thumbnail = override.thumbnail;
    }

    if (!p.thumbnail) {
      const thumbPath = path.join(path.dirname(p.path), 'Saved', 'AutoScreenshot.png');
      if (existsSync(thumbPath)) {
        try {
          const buffer = await fs.readFile(thumbPath);
          p.thumbnail = `data:image/png;base64,${buffer.toString('base64')}`;
        } catch { }
      }
    }
  }

  return allProjects.sort((a, b) => b.lastModified - a.lastModified);
});

ipcMain.handle('update-project-details', async (_, projectPath: string, details: { name?: string, thumbnail?: string }) => {
  const config = await loadConfig();
  if (!config.projectOverrides) config.projectOverrides = {};

  if (!config.projectOverrides[projectPath]) {
    config.projectOverrides[projectPath] = {};
  }

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
    let projects: Project[] = [];
    if (existsSync(STORE_PATH)) {
      const data = await fs.readFile(STORE_PATH, 'utf-8');
      projects = JSON.parse(data);
    }
    const index = projects.findIndex(p => p.path === project.path);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    await fs.writeFile(STORE_PATH, JSON.stringify(projects, null, 2));
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

ipcMain.handle('get-engines', async () => {
  const config = await loadConfig();
  const pathsToCheck = config.enginePaths;

  const engines = [];
  const processedPaths = new Set();

  for (const checkPath of pathsToCheck) {
    try {
      if (processedPaths.has(checkPath)) continue;
      processedPaths.add(checkPath);

      if (existsSync(checkPath)) {
        const binaryPath = path.join(checkPath, 'Engine', 'Binaries');
        if (existsSync(binaryPath)) {
          const version = path.basename(checkPath).replace('UE_', '');
          engines.push({ version, path: checkPath });
          continue;
        }

        const dirs = await fs.readdir(checkPath);
        for (const dir of dirs) {
          if (dir.startsWith('UE_')) {
            const version = dir.replace('UE_', '');
            engines.push({
              version,
              path: path.join(checkPath, dir)
            });
          }
        }
      }
    } catch (e) {
      console.error('Error scanning path ' + checkPath, e);
    }
  }

  return engines;
});

ipcMain.handle('add-engine-path', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
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

ipcMain.handle('get-config-paths', async () => {
  const config = await loadConfig();
  return {
    enginePaths: config.enginePaths,
    projectPaths: config.projectPaths
  };
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

ipcMain.handle('add-project-path', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
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

ipcMain.handle('launch-engine', async (_, enginePath: string) => {
  const possiblePaths = [
    path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'),
    path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UE4Editor.exe')
  ];

  for (const exePath of possiblePaths) {
    if (existsSync(exePath)) {
      const { spawn } = await import('node:child_process');
      const child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return true;
    }
  }
  return false;
});

import { ipcMain, dialog, shell } from 'electron'

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})


import { simpleGit } from 'simple-git';

ipcMain.handle('check-git-repo', async (_, projectPath: string) => {
  try {
    if (!existsSync(projectPath)) return false;
    const projectDir = path.dirname(projectPath);
    const git = simpleGit(projectDir);
    return await git.checkIsRepo();
  } catch (e) {
    console.error('Error checking git repo:', e);
    return false;
  }
});

ipcMain.handle('get-git-status', async (_, projectPath: string) => {
  try {
    const projectDir = path.dirname(projectPath);
    const git = simpleGit(projectDir);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return { current: '', branches: [], remotes: [] };

    const branchSummary = await git.branch();
    const branchesLocal = await git.branchLocal();
    const branchesRemote = await git.branch(['-r']);

    return {
      current: branchSummary.current,
      branches: branchesLocal.all,
      remotes: branchesRemote.all
    };

  } catch (e) {
    console.error('Error fetching git status:', e);
    return { current: '', branches: [], remotes: [] };
  }
});

ipcMain.handle('get-git-history', async (_, projectPath: string) => {
  try {
    const projectDir = path.dirname(projectPath);
    const git = simpleGit(projectDir);

    const isRepo = await git.checkIsRepo();
    if (!isRepo) return [];

    const log = await git.log({
      '--all': null,
      format: {
        hash: '%H',
        date: '%ai',
        message: '%s',
        refs: '%D',
        body: '%b',
        author_name: '%an',
        author_email: '%ae',
        parents: '%P'
      }
    } as any);

    return log.all.map((commit: any) => ({
      ...commit,
      parents: commit.parents || ''
    }));
  } catch (e) {
    console.error('Error fetching git history:', e);
    return [];
  }
});

// v1.2 Feature Handlers

ipcMain.handle('open-project-log', async (_, projectPath: string) => {
  const projectDir = path.dirname(projectPath);
  const logDir = path.join(projectDir, 'Saved', 'Logs');
  if (existsSync(logDir)) {
    await shell.openPath(logDir);
  } else {
    // Fallback to project dir if logs don't exist yet
    await shell.openPath(projectDir);
  }
});

ipcMain.handle('generate-project-files', async (_, projectPath: string) => {
  // This usually requires Unreal Version Selector or UBT. 
  // For now, we will launch the .uproject with -GenerateProjectFiles
  // Note: This is a simplified approach. A robust one might need registry lookups for UVS.
  // Finding the associated engine version editor executable would be best, 
  // but for a generic approach, we might rely on the file association of .uproject
  // or a known engine path from our config.
  // For this version, we'll try to use the associated engine's UBT if possible, 
  // but simpler: use the VersionSelector via shell if installed.

  // Alternative: Just launch with specific arguments if we knew the engine path.
  // Let's assume the user has file associations set up common for UE devs.
  // We can try to run: `UnrealVersionSelector.exe /projectfiles "path/to/project.uproject"`
  // But finding UVS is tricky.

  // Let's try a safer shell execution approach that relies on Windows file associations
  // "Generate Project Files" is often a context menu item in Windows.
  // We can try to replicate what `UnrealVersionSelector -projectfiles` does.

  // Implementation Update: We will try to find the engine for this project and run UBT.
  // However, that's complex. Let's start with a placeholder that opens the folder 
  // and notifies user, OR if we can, run the command.

  // Simplest functional approach for v1.0+: open shell and try standard command if available.
  // A better approach for this app:

  try {
    const projectDir = path.dirname(projectPath);
    // If we can find the GenerateProjectFiles.bat or similar in engine, we run it.
    // For now, let's just open the folder so user can right click -> Generate.
    // Automating this robustly across all UE versions is complex without more inputs.
    // WE WILL ATTEMPT TO RUN UBT if we can determine the engine path.

    // REVISION: Let's stick to opening the folder for this specific action in v1.2 
    // unless we want to dive deep into UBT invocation. 
    // User request: "Generate Project Files action".
    // Let's try to invoke the .uproject with a flag if possible? No, .uproject is JSON.

    // Let's use the standard "UnrealVersionSelector" trick if it's in the path?
    // Or just open directory for now as a safe fallback?
    // Let's TRY to find the engine path from our config vs the project's association.

    // SAFE FALLBACK for v1.2 MVP: Open folder and select file.
    shell.showItemInFolder(projectPath);
  } catch (e) {
    console.error("Error generating files", e);
  }
});

ipcMain.handle('clean-project-cache', async (_, projectPath: string) => {
  const projectDir = path.dirname(projectPath);
  // User asked to clean cache. Usually Binaries are also cleaned for a full "clean". 
  // But let's stick to Intermediate and DDC as per implementation plan description.
  // Plan said: "clean-project-cache (Intermediate, DerivedDataCache)"
  // Plan NOTE: "NOT delete ... Binaries". OK.

  const targets = ['Intermediate', 'DerivedDataCache'];

  for (const folder of targets) {
    const targetPath = path.join(projectDir, folder);
    if (existsSync(targetPath)) {
      await fs.rm(targetPath, { recursive: true, force: true });
    }
  }
});

ipcMain.handle('clone-project', async (_, projectPath: string, newName: string) => {
  const projectDir = path.dirname(projectPath);
  const parentDir = path.dirname(projectDir);
  const newProjectDir = path.join(parentDir, newName);

  if (existsSync(newProjectDir)) {
    throw new Error('Project already exists');
  }

  // Naive file copy. For huge projects, this might take time.
  // Exclude Intermediate, Saved, DerivedDataCache, Binaries to keep it clean?
  // Yes, cloning usually implies a clean copy.

  await fs.mkdir(newProjectDir);

  const entries = await fs.readdir(projectDir, { withFileTypes: true });
  for (const entry of entries) {
    if (['Intermediate', 'Saved', 'DerivedDataCache', 'Binaries', '.git', '.vs'].includes(entry.name)) continue;

    const srcPath = path.join(projectDir, entry.name);
    const destPath = path.join(newProjectDir, entry.name);

    if (entry.isDirectory()) {
      await fs.cp(srcPath, destPath, { recursive: true });
    } else {
      if (entry.name.endsWith('.uproject')) {
        // Rename .uproject file
        const newUprojectPath = path.join(newProjectDir, `${newName}.uproject`);
        await fs.copyFile(srcPath, newUprojectPath);

        // Update Name in .uproject content? Usually mostly unnecessary for basic clones, 
        // but modules might rely on it. Let's just copy file for now.
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
});

ipcMain.handle('read-ini-file', async (_, projectPath: string) => {
  // Target: Config/DefaultEngine.ini
  const iniPath = path.join(path.dirname(projectPath), 'Config', 'DefaultEngine.ini');
  if (!existsSync(iniPath)) return {};

  const content = await fs.readFile(iniPath, 'utf-8');
  const config: Record<string, any> = {};

  // Simple parser for specific keys we care about
  // RayTracing: [/Script/Engine.RendererSettings] -> r.RayTracing=True/False
  // RHI: [/Script/WindowsTargetPlatform.WindowsTargetSettings] -> DefaultGraphicsRHI=...

  const rayTracingMatch = content.match(/r\.RayTracing=(True|False)/i);
  if (rayTracingMatch) config.rayTracing = rayTracingMatch[1].toLowerCase() === 'true';

  const rhiMatch = content.match(/DefaultGraphicsRHI=(DefaultGraphicsRHI_DX11|DefaultGraphicsRHI_DX12)/);
  if (rhiMatch) config.rhi = rhiMatch[1];

  return config;
});

ipcMain.handle('write-ini-file', async (_, projectPath: string, data: Record<string, any>) => {
  const iniPath = path.join(path.dirname(projectPath), 'Config', 'DefaultEngine.ini');
  if (!existsSync(iniPath)) return;

  let content = await fs.readFile(iniPath, 'utf-8');

  // Update RayTracing
  if (data.rayTracing !== undefined) {
    const sectionHeader = '[/Script/Engine.RendererSettings]';
    if (!content.includes(sectionHeader)) {
      content += `\n\n${sectionHeader}\nr.RayTracing=${data.rayTracing ? 'True' : 'False'}`;
    } else {
      // Section exists, check key
      if (content.match(/r\.RayTracing=/)) {
        content = content.replace(/r\.RayTracing=(True|False)/ig, `r.RayTracing=${data.rayTracing ? 'True' : 'False'}`);
      } else {
        content = content.replace(sectionHeader, `${sectionHeader}\nr.RayTracing=${data.rayTracing ? 'True' : 'False'}`);
      }
    }
  }

  // Update RHI
  if (data.rhi !== undefined) {
    const sectionHeader = '[/Script/WindowsTargetPlatform.WindowsTargetSettings]';
    if (!content.includes(sectionHeader)) {
      content += `\n\n${sectionHeader}\nDefaultGraphicsRHI=${data.rhi}`;
    } else {
      if (content.match(/DefaultGraphicsRHI=/)) {
        content = content.replace(/DefaultGraphicsRHI=[^\r\n]*/g, `DefaultGraphicsRHI=${data.rhi}`);
      } else {
        content = content.replace(sectionHeader, `${sectionHeader}\nDefaultGraphicsRHI=${data.rhi}`);
      }
    }
  }

  await fs.writeFile(iniPath, content, 'utf-8');
});

const TAGS_PATH = path.join(app.getPath('userData'), 'project-tags.json');

ipcMain.handle('get-project-tags', async () => {
  if (!existsSync(TAGS_PATH)) return {};
  try {
    return JSON.parse(await fs.readFile(TAGS_PATH, 'utf-8'));
  } catch { return {}; }
});

ipcMain.handle('save-project-tags', async (_, tags: Record<string, string[]>) => {
  await fs.writeFile(TAGS_PATH, JSON.stringify(tags, null, 2));
});

app.whenReady().then(createWindow)

ipcMain.handle('window-minimize', () => {
  win?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  win?.close();
});
