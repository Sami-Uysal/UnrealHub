import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Settings } from 'lucide-react';

const UnrealIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4ZM10.5 7V17H13.5V7H10.5ZM8 9V15H9.5V9H8ZM14.5 9V15H16V9H14.5Z" />
    </svg>
);

export type View = 'projects' | 'engines' | 'settings';

interface SidebarProps {
    currentView: View;
    onViewChange: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
    const { t } = useTranslation();

    const NavItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
        <button
            onClick={() => onViewChange(view)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group no-drag ${currentView === view
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
        >
            <Icon size={20} className={`transition-transform duration-200 ${currentView === view ? 'scale-110' : 'group-hover:scale-110'
                }`} />
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col p-4 select-none drag-region">
            <div className="mb-8 px-4 flex items-center space-x-3">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                    <img src="u.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        UnrealHub
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{t('sidebar.projectManager')}</span>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                <NavItem view="projects" icon={LayoutGrid} label={t('sidebar.projects')} />
                <NavItem view="engines" icon={UnrealIcon} label={t('sidebar.engines')} />
            </nav>

            <div className="pt-4 border-t border-slate-800">
                <button
                    onClick={() => onViewChange('settings')}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors group no-drag"
                >
                    <Settings size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span className="font-medium">{t('sidebar.settings')}</span>
                </button>
            </div>
        </div>
    );
};
