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
        }
    }
}
