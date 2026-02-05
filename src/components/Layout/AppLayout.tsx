import React, { useState } from 'react';
import { Sidebar, View } from './Sidebar';
import { ProjectsPage } from '../../pages/Projects';
import { EnginesPage } from '../../pages/Engines';
import { SettingsPage } from '../../pages/Settings';

export const AppLayout: React.FC = () => {
    const [view, setView] = useState<View>('projects');

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
            <Sidebar currentView={view} onViewChange={setView} />
            <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
                <div className="p-8 w-full">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                        </div>
                        {/* Action buttons*/}
                    </header>

                    <div className="min-h-[400px]">
                        {view === 'projects' && <ProjectsPage />}
                        {view === 'engines' && <EnginesPage />}
                        {view === 'settings' && <SettingsPage />}
                    </div>
                </div>
            </main>
        </div>
    );
};
