export interface Project {
    id: string;
    name: string;
    path: string;
    version: string;
    lastModified: number;
    thumbnail?: string;
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
            launchProject: (path: string) => Promise<void>;
            getEngines: () => Promise<Engine[]>;
            addEnginePath: () => Promise<boolean>;
            getConfigPaths: () => Promise<{ enginePaths: string[], projectPaths: string[] }>;
            addProjectPath: () => Promise<boolean>;
            removePath: (type: 'engine' | 'project', path: string) => Promise<boolean>;
            launchEngine: (path: string) => Promise<boolean>;
            getEnginePlugins: (path: string) => Promise<string[]>;
            updateProjectDetails: (path: string, details: { name?: string, thumbnail?: string }) => Promise<boolean>;
            selectImage: () => Promise<string | null>;
            addProjectFile: () => Promise<boolean>;
            addDroppedProject: (path: string) => Promise<boolean>;
            checkGitRepo: (path: string) => Promise<boolean>;
            getGitHistory: (path: string) => Promise<GitCommit[]>;
            getGitStatus: (path: string) => Promise<{ current: string; branches: string[]; remotes: string[] }>;
            openProjectLog: (path: string) => Promise<void>;
            generateProjectFiles: (path: string) => Promise<void>;
            cleanProjectCache: (path: string) => Promise<void>;
            cloneProject: (path: string, newName: string) => Promise<void>;
            readIniFile: (path: string) => Promise<Record<string, any>>;
            writeIniFile: (path: string, data: Record<string, any>) => Promise<void>;
            getProjectTags: () => Promise<Record<string, string[]>>;
            saveProjectTags: (tags: Record<string, string[]>) => Promise<void>;
            getFavorites: () => Promise<string[]>;
            toggleFavorite: (path: string) => Promise<string[]>;
            getProjectSize: (path: string) => Promise<number>;
            getProjectNotes: () => Promise<Record<string, string>>;
            saveProjectNotes: (notes: Record<string, string>) => Promise<void>;
            minimize: () => Promise<void>;
            maximize: () => Promise<void>;
            close: () => Promise<void>;
        };
    }
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
