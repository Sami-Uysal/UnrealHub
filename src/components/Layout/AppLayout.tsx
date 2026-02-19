import React, { useState } from 'react';
import { Sidebar, View } from './Sidebar';
import { ProjectsPage } from '../../pages/Projects';
import { EnginesPage } from '../../pages/Engines';
import { SettingsPage } from '../../pages/Settings';
import { GitHistoryPage } from '../../pages/GitHistory';
import { Project } from '../../types';
import { TitleBar } from './TitleBar';

import { useAppearance } from '../../context/AppearanceContext';

export const AppLayout: React.FC = () => {
    const [view, setView] = useState<View | 'git'>('projects');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const { bgEffect, fontSize, reduceAnimations } = useAppearance();

    const handleOpenGit = (project: Project) => {
        setSelectedProject(project);
        setView('git');
    };

    const handleBackFromGit = () => {
        setView('projects');
        setSelectedProject(null);
    };

    const getBgClass = () => {
        switch (bgEffect) {
            case 'flat': return 'bg-slate-950';
            case 'glass': return 'bg-slate-950';
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
                <>
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg_at_50%_50%,var(--accent-color)_0deg,#0f172a_60deg,#7c3aed_120deg,#0f172a_180deg,var(--accent-color)_240deg,#0f172a_300deg,#06b6d4_360deg)] opacity-30 blur-[100px] animate-spin" style={{ animationDuration: '30s' }} />
                    </div>
                    <div className="absolute inset-0 z-0 bg-slate-950/70 backdrop-blur-3xl" />
                </>
            )}

            <div className="absolute top-0 left-0 right-0 z-50">
                <TitleBar />
            </div>
            <div className="flex flex-1 overflow-hidden h-full w-full relative z-10">
                <Sidebar currentView={view === 'git' ? 'projects' : (view as View)} onViewChange={setView} />
                <main className="flex-1 overflow-auto bg-transparent pt-8">
                    <div className={`${view === 'git' ? 'p-0' : 'p-8'} w-full min-h-full flex flex-col ${reduceAnimations ? '' : 'transition-all duration-300'}`}>
                        <header className="flex justify-between items-center mb-0">
                        </header>

                        <div className="flex-1 min-h-0">
                            {view === 'projects' && <ProjectsPage onOpenGit={handleOpenGit} />}
                            {view === 'engines' && <EnginesPage />}
                            {view === 'settings' && <SettingsPage />}
                            {view === 'git' && selectedProject && (
                                <GitHistoryPage
                                    projectPath={selectedProject.path}
                                    projectName={selectedProject.name}
                                    onBack={handleBackFromGit}
                                />
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
