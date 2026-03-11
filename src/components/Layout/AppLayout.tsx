import React, { useState, Suspense, lazy } from 'react';
import { Sidebar, View } from './Sidebar';
import { ProjectsPage } from '../../pages/Projects';
import { EnginesPage } from '../../pages/Engines';
import { SettingsPage } from '../../pages/Settings';
import { Project } from '../../types';
import { TitleBar } from './TitleBar';
import { useAppearance } from '../../context/AppearanceContext';

const GitHistoryPage = lazy(() => import('../../pages/GitHistory').then(module => ({ default: module.GitHistoryPage })));
const ConfigEditorPage = lazy(() => import('../../pages/ConfigEditorPage').then(module => ({ default: module.ConfigEditorPage })));

export const AppLayout: React.FC = () => {
    const [view, setView] = useState<View | 'git' | 'config'>('projects');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const { bgEffect, fontSize, reduceAnimations } = useAppearance();
    const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);

    React.useEffect(() => {
        if (window.unreal && window.unreal.checkForUpdates) {
            window.unreal.checkForUpdates().catch(() => { });

            window.unreal.onUpdateAvailable(() => {
                setHasUpdateAvailable(true);
            });
            window.unreal.onUpdateDownloaded(() => {
                setHasUpdateAvailable(true);
            });
        }
    }, []);

    const handleOpenGit = (project: Project) => {
        setSelectedProject(project);
        setView('git');
    };

    const handleBackFromGit = () => {
        setView('projects');
        setSelectedProject(null);
    };

    const handleOpenConfig = (project: Project) => {
        setSelectedProject(project);
        setView('config');
    };

    const handleBackFromConfig = () => {
        setView('projects');
        setSelectedProject(null);
    };

    const getBgClass = () => {
        switch (bgEffect) {
            case 'flat': return 'bg-slate-950';
            case 'glass': return 'bg-transparent';
            case 'gradient': default: return 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950';
        }
    };

    const getFontClass = () => {
        switch (fontSize) {
            case 'large': return 'text-lg';
            case 'xlarge': return 'text-xl';
            case 'normal': default: return 'text-base';
        }
    };

    return (
        <div className={`
            relative flex h-screen overflow-hidden font-sans text-white
            ${getBgClass()} 
            ${getFontClass()}
            ${reduceAnimations ? '' : 'transition-colors duration-300'}
        `}>
            {bgEffect === 'glass' && (
                <div className="absolute inset-0 z-0 bg-black/20" />
            )}

            <div className="absolute top-0 left-0 right-0 z-50">
                <TitleBar />
            </div>
            <div className="flex flex-1 overflow-hidden h-full w-full relative z-10">
                <Sidebar
                    currentView={(view === 'git' || view === 'config') ? 'projects' : (view as View)}
                    onViewChange={setView}
                    hasUpdate={hasUpdateAvailable}
                />
                <main className={`flex-1 bg-transparent border-l border-white/5 shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.5)] ${(view === 'git' || view === 'config') ? 'overflow-hidden pt-8' : 'overflow-auto pt-8'}`}>
                    {view === 'git' && selectedProject ? (
                        <div className="h-full w-full">
                            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading Git History...</div>}>
                                <GitHistoryPage
                                    projectPath={selectedProject.path}
                                    projectName={selectedProject.name}
                                    onBack={handleBackFromGit}
                                />
                            </Suspense>
                        </div>
                    ) : view === 'config' && selectedProject ? (
                        <div className="h-full w-full">
                            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading Config...</div>}>
                                <ConfigEditorPage
                                    projectPath={selectedProject.path}
                                    projectName={selectedProject.name}
                                    onBack={handleBackFromConfig}
                                />
                            </Suspense>
                        </div>
                    ) : (
                        <div className={`p-8 w-full min-h-full flex flex-col ${reduceAnimations ? '' : 'transition-all duration-300'}`}>
                            <div className="flex-1 min-h-0">
                                {view === 'projects' && <ProjectsPage onOpenGit={handleOpenGit} onOpenConfig={handleOpenConfig} />}
                                {view === 'engines' && <EnginesPage />}
                                {view === 'settings' && <SettingsPage />}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
