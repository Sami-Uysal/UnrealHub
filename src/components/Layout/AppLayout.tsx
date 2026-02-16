import React, { useState } from 'react';
import { Sidebar, View } from './Sidebar';
import { ProjectsPage } from '../../pages/Projects';
import { EnginesPage } from '../../pages/Engines';
import { SettingsPage } from '../../pages/Settings';
import { GitHistoryPage } from '../../pages/GitHistory';
import { Project } from '../../types';
import { TitleBar } from './TitleBar';

export const AppLayout: React.FC = () => {
    const [view, setView] = useState<View | 'git'>('projects');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const handleOpenGit = (project: Project) => {
        setSelectedProject(project);
        setView('git');
    };

    const handleBackFromGit = () => {
        setView('projects');
        setSelectedProject(null);
    };

    return (
        <div className="relative flex h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-white overflow-hidden font-sans border border-slate-800/50 rounded-lg shadow-2xl">
            <div className="absolute top-0 left-0 right-0 z-50">
                <TitleBar />
            </div>
            <div className="flex flex-1 overflow-hidden h-full w-full">
                <Sidebar currentView={view === 'git' ? 'projects' : view} onViewChange={setView} />
                <main className="flex-1 overflow-auto bg-transparent">
                    <div className="p-8 w-full min-h-full flex flex-col">
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
