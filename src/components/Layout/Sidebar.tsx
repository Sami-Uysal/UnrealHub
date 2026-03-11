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
    compactMode: boolean;
    onViewChange: (view: View) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, currentView, icon: Icon, label, reduceAnimations, compactMode, onViewChange }) => {
    const isActive = currentView === view;
    return (
        <button
            onClick={() => onViewChange(view)}
            className={`
                w-full flex items-center ${compactMode ? 'justify-center px-0' : 'gap-3.5 px-3'} py-2.5 rounded-xl no-drag relative overflow-hidden group
                ${!reduceAnimations ? 'transition-all duration-300' : ''}
                ${isActive
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }
            `}
        >
            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${!reduceAnimations ? 'transition-all duration-300' : ''} ${isActive ? 'text-[var(--accent-color)]' : 'text-slate-400 group-hover:text-slate-300'}`}>
                <Icon size={20} className={`${!reduceAnimations ? 'transition-transform duration-300' : ''} ${isActive ? 'scale-110' : ''}`} />
            </div>

            {!compactMode && (
                <span className={`relative z-10 font-medium text-[13px] tracking-wide max-w-[130px] truncate text-left ${!reduceAnimations ? 'transition-colors duration-300' : ''}`}>
                    {label}
                </span>
            )}

            {isActive && !reduceAnimations && !compactMode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--accent-color)] rounded-full" />
            )}
        </button>
    );
};

export const Sidebar: React.FC<SidebarProps & { hasUpdate?: boolean }> = ({ currentView, onViewChange, hasUpdate }) => {
    const { t } = useTranslation();
    const { reduceAnimations, compactMode } = useAppearance();

    return (
        <div className={`h-full bg-[#04070d]/60 flex flex-col select-none relative z-20 ${compactMode ? 'w-[72px]' : 'w-60'} ${!reduceAnimations ? 'transition-all duration-300' : ''}`}>
            <div className={`pt-8 pb-6 flex items-center ${compactMode ? 'justify-center px-0' : 'gap-3 px-5'}`}>
                <div className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-color)]/20 to-[var(--accent-color)]/5 border border-[var(--accent-color)]/20 shadow-sm ${!reduceAnimations ? 'group transition-all duration-500 hover:scale-105' : ''}`}>
                    <img src="u.png" alt="Logo" className={`w-5 h-5 object-contain ${!reduceAnimations ? 'transition-transform duration-500 group-hover:scale-110' : ''}`} />
                </div>
                {!compactMode && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[17px] font-bold tracking-tight text-white leading-tight">UnrealHub</span>
                    </div>
                )}
            </div>

            <div className={`px-4 mb-4 ${compactMode ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
                <div className="h-px bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <nav className="flex-1 px-3 space-y-1.5">
                <NavItem view="projects" currentView={currentView} icon={LayoutGrid} label={t('sidebar.projects')} reduceAnimations={reduceAnimations} compactMode={compactMode} onViewChange={onViewChange} />
                <NavItem view="engines" currentView={currentView} icon={UnrealIcon} label={t('sidebar.engines')} reduceAnimations={reduceAnimations} compactMode={compactMode} onViewChange={onViewChange} />
            </nav>

            <div className={`px-4 mb-3 ${compactMode ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
                <div className="h-px bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <div className="px-3 pb-5">
                <button
                    onClick={() => onViewChange('settings')}
                    className={`
                        w-full flex items-center ${compactMode ? 'justify-center px-0' : 'gap-3.5 px-3'} py-2.5 rounded-xl no-drag group overflow-hidden
                        ${!reduceAnimations ? 'transition-all duration-300' : ''}
                        ${currentView === 'settings'
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                        }
                    `}
                >
                    <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-lg ${!reduceAnimations ? 'transition-all duration-300' : ''} ${currentView === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                        <Settings size={20} className={`${!reduceAnimations ? 'transition-transform duration-500' : ''} ${currentView === 'settings' ? 'rotate-45' : 'group-hover:rotate-45'}`} />
                    </div>
                    {!compactMode && (
                        <span className="font-medium text-[13px] tracking-wide">{t('sidebar.settings')}</span>
                    )}
                    {hasUpdate && (
                        <div className={`absolute ${compactMode ? 'top-2 right-2' : 'right-4'} w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse`} />
                    )}
                </button>
            </div>
        </div>
    );
};
