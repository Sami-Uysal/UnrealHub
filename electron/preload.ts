import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('unreal', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProject: (project: any) => ipcRenderer.invoke('save-project', project),
  selectProjectFile: () => ipcRenderer.invoke('select-project-file'),
  launchProject: (path: string) => ipcRenderer.invoke('launch-project', path),
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
})
