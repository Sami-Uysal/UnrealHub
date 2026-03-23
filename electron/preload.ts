import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('unreal', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProject: (project: any) => ipcRenderer.invoke('save-project', project),
  selectProjectFile: () => ipcRenderer.invoke('select-project-file'),
  launchProject: (path: string, args?: string) => ipcRenderer.invoke('launch-project', path, args),
  showInExplorer: (path: string) => ipcRenderer.invoke('show-in-explorer', path),
  removeProject: (path: string) => ipcRenderer.invoke('remove-project', path),
  getEngines: () => ipcRenderer.invoke('get-engines'),
  addEnginePath: () => ipcRenderer.invoke('add-engine-path'),
  getConfigPaths: () => ipcRenderer.invoke('get-config-paths'),
  addProjectPath: () => ipcRenderer.invoke('add-project-path'),
  removePath: (type: 'engine' | 'project', path: string) => ipcRenderer.invoke('remove-path', type, path),
  launchEngine: (path: string) => ipcRenderer.invoke('launch-engine', path),
  getEnginePlugins: (path: string) => ipcRenderer.invoke('get-engine-plugins', path),
  updateProjectDetails: (path: string, details: any) => ipcRenderer.invoke('update-project-details', path, details),
  selectImage: () => ipcRenderer.invoke('select-image'),
  addProjectFile: () => ipcRenderer.invoke('add-project-file'),
  addDroppedProject: (path: string) => ipcRenderer.invoke('add-dropped-project', path),
  checkGitRepo: (path: string) => ipcRenderer.invoke('check-git-repo', path),
  getGitHistory: (path: string) => ipcRenderer.invoke('get-git-history', path),
  getGitStatus: (path: string) => ipcRenderer.invoke('get-git-status', path),
  gitAutoBackup: (path: string) => ipcRenderer.invoke('git-auto-backup', path),
  openProjectLog: (path: string) => ipcRenderer.invoke('open-project-log', path),
  cleanProjectCache: (path: string) => ipcRenderer.invoke('clean-project-cache', path),

  getProjectStats: (path: string) => ipcRenderer.invoke('get-project-stats', path),
  cloneProject: (path: string, newName: string) => ipcRenderer.invoke('clone-project', path, newName),
  smartBackup: (path: string) => ipcRenderer.invoke('smart-backup', path),
  deleteProject: (path: string) => ipcRenderer.invoke('delete-project', path),
  readUprojectPlugins: (path: string) => ipcRenderer.invoke('read-uproject-plugins', path),
  writeUprojectPlugins: (path: string, plugins: any[]) => ipcRenderer.invoke('write-uproject-plugins', path, plugins),
  readIniFile: (path: string) => ipcRenderer.invoke('read-ini-file', path),
  writeIniFile: (path: string, data: Record<string, any>) => ipcRenderer.invoke('write-ini-file', path, data),
  getProjectTags: () => ipcRenderer.invoke('get-project-tags'),
  saveProjectTags: (tags: Record<string, string[]>) => ipcRenderer.invoke('save-project-tags', tags),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  toggleFavorite: (path: string) => ipcRenderer.invoke('toggle-favorite', path),
  getProjectSize: (path: string) => ipcRenderer.invoke('get-project-size', path),
  getProjectNotes: () => ipcRenderer.invoke('get-project-notes'),
  saveProjectNotes: (notes: Record<string, string>) => ipcRenderer.invoke('save-project-notes', notes),
  getProjectKanban: (path: string) => ipcRenderer.invoke('get-project-kanban', path),
  saveProjectKanban: (path: string, board: any) => ipcRenderer.invoke('save-project-kanban', path, board),
  getProjectConfigs: (path: string) => ipcRenderer.invoke('get-project-configs', path),
  readRawIniFile: (path: string, fileName: string) => ipcRenderer.invoke('read-raw-ini-file', path, fileName),
  writeRawIniFile: (path: string, fileName: string, content: string) => ipcRenderer.invoke('write-raw-ini-file', path, fileName, content),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // Marketplace API
  scanEnginePlugins: (enginePath: string) => ipcRenderer.invoke('scan-engine-plugins', enginePath),
  scanProjectPlugins: (projectPath: string) => ipcRenderer.invoke('scan-project-plugins', projectPath),
  getVaultAssets: () => ipcRenderer.invoke('get-vault-assets'),
  getInstalledManifests: () => ipcRenderer.invoke('get-installed-manifests'),
  showPluginInExplorer: (pluginPath: string) => ipcRenderer.invoke('show-plugin-in-explorer', pluginPath),

  // Epic Auth API
  epicAuthStatus: () => ipcRenderer.invoke('epic-auth-status'),
  epicLogin: () => ipcRenderer.invoke('epic-auth-login'),
  epicLogout: () => ipcRenderer.invoke('epic-auth-logout'),
  epicGetLibrary: () => ipcRenderer.invoke('epic-get-library'),
  epicGetLibraryCached: () => ipcRenderer.invoke('epic-get-library-cached'),
  epicGetCatalogInfo: (namespace: string, catalogItemId: string) => ipcRenderer.invoke('epic-get-catalog-info', namespace, catalogItemId),
  epicGetAssetManifest: (namespace: string, catalogItemId: string, appName: string) => ipcRenderer.invoke('epic-get-asset-manifest', namespace, catalogItemId, appName),
  epicSelectVaultDir: () => ipcRenderer.invoke('epic-select-vault-dir'),
  epicCancelDownload: () => ipcRenderer.invoke('epic-cancel-download'),
  epicDownloadAsset: (namespace: string, catalogItemId: string, appName: string, title: string) => ipcRenderer.invoke('epic-download-asset', namespace, catalogItemId, appName, title),
  
  onDownloadAssetProgress: (callback: (payload: any) => void) => {
    ipcRenderer.removeAllListeners('download-asset-progress');
    ipcRenderer.on('download-asset-progress', (_event, payload) => callback(payload));
  },

  // Updater API
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateNotAvailable: (callback: (info: any) => void) => {
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.on('update-not-available', (_event, info) => callback(info));
  },
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.on('download-progress', (_event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.on('update-error', (_event, error) => callback(error));
  },
})
