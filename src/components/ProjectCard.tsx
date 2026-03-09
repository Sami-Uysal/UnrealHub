import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Image as ImageIcon, GitBranch, Pencil, Star, HardDrive } from 'lucide-react';
import { Project } from '../types';
import { getTagColor } from '../utils/tagUtils';

function formatSize(bytes: number): string {
    if (bytes === 0) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface ProjectCardProps {
    project: Project;
    viewMode: 'grid' | 'list';
    cardSize: 'small' | 'medium' | 'large';
    reduceAnimations: boolean;
    showGit: boolean;
    isFavorite: boolean;
    projectSize: number;
    tags: string[];
    onContextMenu: (e: React.MouseEvent, project: Project) => void;
    onToggleFavorite: (path: string, e?: React.MouseEvent) => void;
    onEdit: (project: Project, e?: React.MouseEvent) => void;
    onOpenGit?: (project: Project) => void;
    onLaunch: (path: string, args?: string) => void;
}

export const ProjectCard = React.memo<ProjectCardProps>(({
    project,
    viewMode,
    cardSize,
    reduceAnimations,
    showGit,
    isFavorite,
    projectSize,
    tags,
    onContextMenu,
    onToggleFavorite,
    onEdit,
    onOpenGit,
    onLaunch
}) => {
    const { t } = useTranslation();

    if (viewMode === 'list') {
        return (
            <div
                onContextMenu={(e) => onContextMenu(e, project)}
                className={`
                    group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center pr-4 h-[100px]
                    hover:shadow-lg
                    ${!reduceAnimations ? 'hover:shadow-[var(--accent-color)]/10 hover:border-[var(--accent-color)]/30 transition-all duration-300' : ''}
                `}
            >
                <div className="w-[180px] h-[100px] bg-slate-800 shrink-0 relative overflow-hidden">
                    {project.thumbnail ? (
                        <img
                            src={project.thumbnail}
                            alt={project.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                            <ImageIcon size={32} className="text-slate-700 opacity-50" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/90" />
                </div>

                <div className="flex-1 min-w-0 pl-4 py-3 flex flex-col justify-center items-start">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg text-white truncate group-hover:text-[var(--accent-color)] transition-colors">
                            {project.name}
                        </h3>
                        <div className="flex gap-1.5 items-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-800/50 text-white border border-white/10 whitespace-nowrap">
                                UE {project.version}
                            </span>
                            {projectSize > 0 && (
                                <span className="px-2 py-0.5 rounded text-[10px] tracking-wider bg-slate-800/50 text-slate-400 border border-white/10 flex items-center gap-1 whitespace-nowrap">
                                    <HardDrive size={10} />
                                    {formatSize(projectSize)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono truncate mb-2">
                        {project.path}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {tags.map(tag => (
                            <span key={tag} style={{ backgroundColor: getTagColor(tag) }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm border border-white/10">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-4 shrink-0">
                    <button
                        onClick={(e) => onToggleFavorite(project.path, e)}
                        className={`p-2 rounded-full transition-all duration-300 ${isFavorite
                            ? 'text-amber-400 hover:bg-amber-400/10'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                        title={isFavorite ? t('projects.unfavorite') : t('projects.favorite')}
                    >
                        <Star size={16} className={isFavorite ? 'fill-amber-400' : ''} />
                    </button>
                    <button
                        onClick={(e) => onEdit(project, e)}
                        className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-[var(--accent-color)] transition-colors"
                        title={t('projects.edit')}
                    >
                        <Pencil size={16} />
                    </button>
                    {showGit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenGit?.(project); }}
                            className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-[var(--accent-color)] transition-colors"
                            title={t('projects.gitHistory')}
                        >
                            <GitBranch size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => onLaunch(project.path)}
                        className="p-2 ml-2 rounded-xl bg-[var(--accent-color)] text-white hover:opacity-80 transition-opacity"
                        title={t('projects.launch')}
                    >
                        <Play size={18} className="fill-current" />
                    </button>
                </div>
            </div>
        );
    }

    const heightClass = cardSize === 'small' ? 'h-[220px]' : cardSize === 'large' ? 'h-[340px]' : 'h-[280px]';

    return (
        <div
            onContextMenu={(e) => onContextMenu(e, project)}
            className={`
        group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden 
        hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]
        ${!reduceAnimations ? 'hover:shadow-[var(--accent-color)]/20 hover:border-[var(--accent-color)]/50 hover:-translate-y-2 transition-all duration-500' : ''}
        ${heightClass}
      `}
        >
            <div className="absolute inset-0 bg-slate-800 rounded-2xl overflow-hidden" style={{ willChange: 'transform' }}>
                {project.thumbnail ? (
                    <img
                        src={project.thumbnail}
                        alt={project.name}
                        loading="lazy"
                        className={`w-full h-full object-cover ${!reduceAnimations ? 'transition-all duration-700 group-hover:scale-105 group-hover:blur-[3px]' : ''}`}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <ImageIcon size={48} className="text-slate-700 opacity-50" />
                    </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent ${!reduceAnimations ? 'transition-opacity duration-300' : ''}`} />
            </div>

            <div className="absolute top-3 left-3 z-20">
                <button
                    onClick={(e) => onToggleFavorite(project.path, e)}
                    className={`p-2 rounded-full backdrop-blur-md border transition-all duration-300 ${isFavorite
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-400'
                        : 'bg-slate-950/40 border-white/10 text-slate-400 opacity-0 group-hover:opacity-100'
                        }`}
                    title={isFavorite ? t('projects.unfavorite') : t('projects.favorite')}
                >
                    <Star size={14} className={isFavorite ? 'fill-amber-400' : ''} />
                </button>
            </div>

            <div className="absolute top-3 right-3 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                <button
                    onClick={(e) => onEdit(project, e)}
                    className="p-2.5 rounded-full bg-slate-950/60 backdrop-blur-md text-slate-200 hover:text-white hover:bg-[var(--accent-color)] border border-white/10 transition-colors shadow-lg"
                    title={t('projects.edit')}
                >
                    <Pencil size={16} />
                </button>
                {showGit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenGit?.(project); }}
                        className="p-2.5 rounded-full bg-slate-950/60 backdrop-blur-md text-slate-200 hover:text-white hover:bg-[var(--accent-color)] border border-white/10 transition-colors shadow-lg"
                        title={t('projects.gitHistory')}
                    >
                        <GitBranch size={16} />
                    </button>
                )}
            </div>

            <div className={`absolute inset-x-0 bottom-0 ${cardSize === 'small' ? 'p-4' : 'p-6'} flex flex-col z-10`}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-black text-white truncate pr-2 ${cardSize === 'small' ? 'text-lg' : 'text-2xl'} group-hover:text-[var(--accent-color)] transition-colors`} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)' }}>
                            {project.name}
                        </h3>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-black/50 text-white backdrop-blur-md border border-white/20 group-hover:bg-[var(--accent-color)] group-hover:border-[var(--accent-color)] transition-colors duration-300 whitespace-nowrap">
                                UE {project.version}
                            </span>
                            {projectSize > 0 && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-black/50 text-slate-300 backdrop-blur-md border border-white/10 items-center gap-1 whitespace-nowrap ${cardSize === 'small' ? 'hidden sm:flex' : 'flex'}`}>
                                    <HardDrive size={9} />
                                    {formatSize(projectSize)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {cardSize !== 'small' && (
                    <div className="flex items-center space-x-2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 delay-75">
                        <div className="text-[10px] text-slate-400 truncate font-mono bg-black/40 px-2 py-1 rounded border border-white/5 w-full">
                            {project.path}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4 transition-opacity">
                    {tags.slice(0, cardSize === 'small' ? 2 : 3).map(tag => (
                        <span key={tag} style={{ backgroundColor: getTagColor(tag) }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm border border-white/10">
                            {tag}
                        </span>
                    ))}
                    {tags.length > (cardSize === 'small' ? 2 : 3) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            +{tags.length - (cardSize === 'small' ? 2 : 3)}
                        </span>
                    )}
                </div>

                <div className="flex gap-2 w-full mt-auto translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <button
                        onClick={() => onLaunch(project.path)}
                        className={`flex-1 flex items-center justify-center space-x-2 bg-white text-slate-900 hover:bg-[var(--accent-color)] hover:text-white
                            ${cardSize === 'small' ? 'py-2' : 'py-3'} rounded-xl backdrop-blur-sm transition-all duration-300 font-bold shadow-lg shadow-black/20`}
                    >
                        <Play size={cardSize === 'small' ? 16 : 20} className="fill-current" />
                        <span className={cardSize === 'small' ? 'text-xs' : 'text-sm'}>{t('projects.launch')}</span>
                    </button>

                    {project.launchProfiles && project.launchProfiles.length > 0 && (
                        <div className="relative flex items-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const menu = document.createElement('div');
                                    menu.className = 'fixed z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1 min-w-[150px] animate-in fade-in zoom-in-95 duration-200';
                                    menu.style.top = `${rect.bottom + 8}px`;
                                    menu.style.right = `${window.innerWidth - rect.right}px`;

                                    const items = project.launchProfiles!.map(p => {
                                        const btn = document.createElement('button');
                                        btn.className = 'w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[var(--accent-color)] hover:text-white transition-colors flex items-center gap-2';
                                        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 6-5-6-5"/><path d="M18 17 24 12 18 7"/><path d="M6 17 12 12 6 7"/></svg> ${p.name}`;
                                        btn.onclick = () => {
                                            onLaunch(project.path, p.args);
                                            document.body.removeChild(overlay);
                                        };
                                        return btn;
                                    });

                                    items.forEach(item => menu.appendChild(item));

                                    const overlay = document.createElement('div');
                                    overlay.className = 'fixed inset-0 z-40';
                                    overlay.onclick = () => document.body.removeChild(overlay);
                                    overlay.appendChild(menu);
                                    document.body.appendChild(overlay);
                                }}
                                className={`flex items-center justify-center bg-slate-800 text-slate-300 hover:bg-[var(--accent-color)] hover:text-white px-2 rounded-xl border border-slate-700 hover:border-transparent transition-all duration-300`}
                                title={t('projects.launchOptions')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

ProjectCard.displayName = 'ProjectCard';
