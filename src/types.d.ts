export interface LaunchProfile {
    id: string;
    name: string;
    args: string;
}

export interface Project {
    id: string;
    name: string;
    path: string;
    version: string;
    lastModified: number;
    thumbnail?: string;
    launchProfiles?: LaunchProfile[];
}

export interface Engine {
    version: string;
    path: string;
    thumbnail?: string;
}

declare global {
    interface Window {
        unreal: {
            getProjects: () => Promise<Project[]>;
            saveProject: (project: Project) => Promise<boolean>;
            selectProjectFile: () => Promise<string | null>;
            launchProject: (path: string, args?: string) => Promise<void>;
            showInExplorer: (path: string) => Promise<void>;
            removeProject: (path: string) => Promise<boolean>;
            getEngines: () => Promise<Engine[]>;
            addEnginePath: () => Promise<boolean>;
            getConfigPaths: () => Promise<{ enginePaths: string[], projectPaths: string[] }>;
            addProjectPath: () => Promise<boolean>;
            removePath: (type: 'engine' | 'project', path: string) => Promise<boolean>;
            launchEngine: (path: string) => Promise<boolean>;
            getEnginePlugins: (path: string) => Promise<string[]>;
            updateProjectDetails: (path: string, details: { name?: string, thumbnail?: string, launchProfiles?: LaunchProfile[] }) => Promise<boolean>;
            selectImage: () => Promise<string | null>;
            addProjectFile: () => Promise<boolean>;
            addDroppedProject: (path: string) => Promise<boolean>;
            smartBackup: (path: string) => Promise<{ success: boolean; canceled?: boolean; error?: string; size?: number }>;
            checkGitRepo: (path: string) => Promise<boolean>;
            getGitHistory: (path: string) => Promise<GitCommit[]>;
            getGitStatus: (path: string) => Promise<{ current: string; branches: string[]; remotes: string[] }>;
            gitAutoBackup: (path: string) => Promise<{ success: boolean; error?: string }>;
            openProjectLog: (path: string) => Promise<void>;
            cleanProjectCache: (path: string) => Promise<void>;

            getProjectStats: (path: string) => Promise<{ blueprints: number, assets: number, maps: number, cpp: number, h: number }>;
            cloneProject: (path: string, newName: string) => Promise<void>;
            readIniFile: (path: string) => Promise<Record<string, any>>;
            deleteProject: (path: string) => Promise<boolean>;
            readUprojectPlugins: (path: string) => Promise<{ Name: string, Enabled: boolean }[]>;
            writeUprojectPlugins: (path: string, plugins: { Name: string, Enabled: boolean }[]) => Promise<boolean>;
            writeIniFile: (path: string, data: Record<string, any>) => Promise<void>;
            getProjectTags: () => Promise<Record<string, string[]>>;
            saveProjectTags: (tags: Record<string, string[]>) => Promise<void>;
            getFavorites: () => Promise<string[]>;
            toggleFavorite: (path: string) => Promise<string[]>;
            getProjectSize: (path: string) => Promise<number>;
            getProjectNotes: () => Promise<Record<string, string>>;
            saveProjectNotes: (notes: Record<string, string>) => Promise<void>;
            getProjectKanban: (path: string) => Promise<KanbanBoard | null>;
            saveProjectKanban: (path: string, board: KanbanBoard) => Promise<void>;
            getProjectConfigs: (path: string) => Promise<string[]>;
            readRawIniFile: (path: string, fileName: string) => Promise<string>;
            writeRawIniFile: (path: string, fileName: string, content: string) => Promise<boolean>;
            minimize: () => Promise<void>;
            maximize: () => Promise<void>;
            close: () => Promise<void>;

            getAppVersion: () => Promise<string>;
            checkForUpdates: () => Promise<{ status: string; message?: string; error?: string }>;
            downloadUpdate: () => Promise<{ status: string; error?: string }>;
            quitAndInstall: () => void;
            onUpdateAvailable: (callback: (info: any) => void) => void;
            onUpdateNotAvailable: (callback: (info: any) => void) => void;
            onDownloadProgress: (callback: (progress: any) => void) => void;
            onUpdateDownloaded: (callback: (info: any) => void) => void;
            onUpdateError: (callback: (error: string) => void) => void;

            // Marketplace API
            scanEnginePlugins: (enginePath: string) => Promise<PluginInfo[]>;
            scanProjectPlugins: (projectPath: string) => Promise<PluginInfo[]>;
            getVaultAssets: () => Promise<VaultAssetInfo[]>;
            getInstalledManifests: () => Promise<InstalledManifest[]>;
            showPluginInExplorer: (pluginPath: string) => Promise<void>;

            // Epic Auth API
            epicAuthStatus: () => Promise<{ loggedIn: boolean; displayName?: string; accountId?: string }>;
            epicLogin: () => Promise<{ success: boolean; displayName?: string; error?: string }>;
            epicLogout: () => Promise<void>;
            epicGetLibrary: () => Promise<{ error: string | null; items: EpicLibraryItem[] }>;
            epicGetLibraryCached: () => Promise<{ error: string | null; items: EpicLibraryItem[]; cached: boolean; timestamp?: number }>;
            epicGetCatalogInfo: (namespace: string, catalogItemId: string) => Promise<any>;
            epicGetAssetManifest: (namespace: string, catalogItemId: string, appName: string) => Promise<any>;
            epicSelectVaultDir: () => Promise<string | null>;
            epicCancelDownload: () => Promise<boolean>;
            epicDownloadAsset: (namespace: string, catalogItemId: string, appName: string, title: string) => Promise<any>;
            onDownloadAssetProgress: (callback: (payload: any) => void) => void;
        };
    }
}

export interface EpicLibraryItem {
    id: string;
    catalogItemId?: string;
    namespace: string;
    appName: string;
    title: string;
    description: string;
    thumbnail: string;
    categories: string;
    developer: string;
    releaseDate: string;
    compatibleVersions: string;
    versions?: string[];
    installed: boolean;
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

export interface InstalledManifest {
    installLocation: string;
    appName: string;
    catalogItemId: string;
    displayName: string;
    appVersion: string;
    namespace: string;
}

export interface GitCommit {
    hash: string;
    date: string;
    message: string;
    refs: string;
    body: string;
    author_name: string;
    author_email: string;
    parents: string;
}

export interface KanbanCard {
    id: string;
    title: string;
    description?: string;
    createdAt: number;
}

export interface KanbanList {
    id: string;
    title: string;
    cards: KanbanCard[];
}

export interface KanbanBoard {
    lists: KanbanList[];
}
