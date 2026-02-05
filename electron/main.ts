import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({

    frame: false, // Frameless window
    titleBarStyle: 'hidden', // Hide title bar but keep window controls (if not handled specially)
    titleBarOverlay: {
      // slate-900 (Sidebar color) - User asked for inner blue though?
      // User said: "iç taraftaki maviye uysun dıştaki değil" (Match the inner blue, not the outer).
      // Sidebar is outer (left). Main content is inner.
      // Main content bg is slate-950 radial gradient. Let's try matching that dark blue. 
      // Actually standardizing on a slate-950 hex might be safest: #020617
      color: '#020617',
      symbolColor: '#ffffff',
      height: 30
    },
    icon: path.join(process.env.VITE_PUBLIC, 'u.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// IPC Handlers
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
    // Ensure overrides exists
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
  version: string; // UE version
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

  // Scan folders projectPaths
  const config = await loadConfig();
  const scannedProjects: Project[] = [];

  for (const scanPath of config.projectPaths) {
    if (!existsSync(scanPath)) continue;
    try {
      // We only scan depth 1 (files directly in folders or immediate subfolders)
      // Actually Unreal projects are usually in a folder. 
      // e.g. D:/Projects/MyGame/MyGame.uproject
      // User selects D:/Projects, we look for */*.uproject

      const entries = await fs.readdir(scanPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subFolderPath = path.join(scanPath, entry.name);
          // Look for .uproject inside
          const subEntries = await fs.readdir(subFolderPath);
          const uprojectFile = subEntries.find(f => f.endsWith('.uproject'));

          if (uprojectFile) {
            const fullPath = path.join(subFolderPath, uprojectFile);

            // Avoid duplicates if already in manual list or scanned list
            if (manualProjects.some(p => p.path === fullPath)) continue;
            if (scannedProjects.some(p => p.path === fullPath)) continue;

            // Read version from .uproject content
            let version = 'Unknown';
            try {
              const content = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
              if (content.EngineAssociation) {
                version = content.EngineAssociation;
              }
            } catch { }

            scannedProjects.push({
              id: fullPath, // Use path as ID for scanned projects
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

  // Combine and sort by date
  const allProjects = [...manualProjects, ...scannedProjects];

  // Post-process to add thumbnails and overrides
  for (const p of allProjects) {
    // Apply Overrides
    if (config.projectOverrides && config.projectOverrides[p.path]) {
      const override = config.projectOverrides[p.path];
      if (override.name) p.name = override.name;
      if (override.thumbnail) p.thumbnail = override.thumbnail; // Override local thumbnail
    }

    // If no override thumbnail, check file system
    if (!p.thumbnail) {
      const thumbPath = path.join(path.dirname(p.path), 'Saved', 'AutoScreenshot.png');
      if (existsSync(thumbPath)) {
        try {
          const buffer = await fs.readFile(thumbPath);
          p.thumbnail = `data:image/png;base64,${buffer.toString('base64')}`;
        } catch {
          // ignore
        }
      }
    }
  }

  return allProjects.sort((a, b) => b.lastModified - a.lastModified);
});

// IPC Override Project Details
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

// IPC to pick image
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  // Read and convert to base64
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
    // Check if exists update, else add
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
        // Check if the path itself is an engine (has Engine/Binaries)
        const binaryPath = path.join(checkPath, 'Engine', 'Binaries');
        if (existsSync(binaryPath)) {
          // This is a direct engine path
          // Try to guess version from path name usually or Build.version file
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

// IPC handler for adding an engine path
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

// IPC handler to get config (paths)
ipcMain.handle('get-config-paths', async () => {
  const config = await loadConfig();
  return {
    enginePaths: config.enginePaths,
    projectPaths: config.projectPaths
  };
});

// IPC handler to remove a path
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

// IPC handler to add a project search path
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

// IPC handler to add a single project file (.uproject) via Dialog
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

// IPC handler for dropped project file
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
  // shell.openPath works but for UE projects it opens the associated version selector.
  // Better to explicitly find the engine and run it, but for now generic open is fine for projects.
  await shell.openPath(projectPath);
});

ipcMain.handle('launch-engine', async (_, enginePath: string) => {
  // Engine path is usually the root folder (e.g. D:/UE_5.3)
  // Executable is at Engine/Binaries/Win64/UnrealEditor.exe
  const possiblePaths = [
    path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'),
    path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UE4Editor.exe') // Legacy support
  ];

  for (const exePath of possiblePaths) {
    if (existsSync(exePath)) {
      // Spawn detached to allow app to close without killing editor
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

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
