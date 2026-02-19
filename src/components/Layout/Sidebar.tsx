import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Settings } from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';

const UnrealIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4ZM10.5 7V17H13.5V7H10.5ZM8 9V15H9.5V9H8ZM14.5 9V15H16V9H14.5Z" />
    </svg>
);

export type View = 'projects' | 'engines' | 'settings';

interface SidebarProps {
    currentView: View;
    onViewChange: (view: View) => void;
}

interface NavItemProps {
    view: View;
    currentView: View;
    icon: any;
    label: string;
    reduceAnimations: boolean;
    onViewChange: (view: View) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, currentView, icon: Icon, label, reduceAnimations, onViewChange }) => {
    const isActive = currentView === view;
    return (
        <button
            onClick={() => onViewChange(view)}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-2xl no-drag relative overflow-hidden
                ${!reduceAnimations ? 'transition-all duration-300' : ''}
                ${isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                }
            `}
        >
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-color)] to-[var(--accent-color)]/70 rounded-2xl" />
            )}
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl" />
            )}

            <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-xl ${!reduceAnimations ? 'transition-all duration-300' : ''} ${isActive ? 'bg-white/15 shadow-inner' : 'bg-white/[0.03]'}`}>
                <Icon size={18} className={`${!reduceAnimations ? 'transition-transform duration-300' : ''} ${isActive ? 'scale-110' : ''}`} />
            </div>

            <span className={`relative z-10 font-semibold text-sm tracking-wide ${!reduceAnimations ? 'transition-colors duration-300' : ''}`}>
                {label}
            </span>

            {isActive && !reduceAnimations && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-[var(--accent-color)] rounded-full blur-xl opacity-60" />
            )}
        </button>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
    const { t } = useTranslation();
    const { reduceAnimations } = useAppearance();

    return (
        <div className="w-64 h-full bg-[#080d1a]/90 backdrop-blur-xl border-r border-white/[0.04] flex flex-col select-none">
            <div className="px-5 pt-10 pb-8 flex items-center gap-3.5">
                <div className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-color)]/20 to-[var(--accent-color)]/5 border border-[var(--accent-color)]/20 ${!reduceAnimations ? 'group transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-[var(--accent-color)]/20' : ''}`}>
                    <img src="u.png" alt="Logo" className={`w-7 h-7 object-contain ${!reduceAnimations ? 'transition-transform duration-500 group-hover:scale-110' : ''}`} />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-lg font-black tracking-tight text-white">UnrealHub</span>
                    <span className="text-[9px] tracking-[0.2em] text-slate-600 font-semibold uppercase">{t('sidebar.projectManager')}</span>
                </div>
            </div>

            <div className="px-5 mb-4">
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>

            <nav className="flex-1 px-3 space-y-1.5">
                <NavItem view="projects" currentView={currentView} icon={LayoutGrid} label={t('sidebar.projects')} reduceAnimations={reduceAnimations} onViewChange={onViewChange} />
                <NavItem view="engines" currentView={currentView} icon={UnrealIcon} label={t('sidebar.engines')} reduceAnimations={reduceAnimations} onViewChange={onViewChange} />
            </nav>

            <div className="px-5 mb-3">
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>

            <div className="px-3 pb-6">
                <button
                    onClick={() => onViewChange('settings')}
                    className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-2xl no-drag group
                        ${!reduceAnimations ? 'transition-all duration-300' : ''}
                        ${currentView === 'settings'
                            ? 'bg-white/[0.06] text-white'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                        }
                    `}
                >
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${!reduceAnimations ? 'transition-all duration-300' : ''} ${currentView === 'settings' ? 'bg-white/10' : 'bg-white/[0.03]'}`}>
                        <Settings size={18} className={`${!reduceAnimations ? 'transition-transform duration-500' : ''} ${currentView === 'settings' ? 'rotate-45' : 'group-hover:rotate-45'}`} />
                    </div>
                    <span className="font-semibold text-sm tracking-wide">{t('sidebar.settings')}</span>
                </button>
            </div>
        </div>
    );
};
