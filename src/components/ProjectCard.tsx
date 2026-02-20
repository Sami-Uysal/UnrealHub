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
    compactMode: boolean;
    reduceAnimations: boolean;
    showGit: boolean;
    isFavorite: boolean;
    projectSize: number;
    tags: string[];
    onContextMenu: (e: React.MouseEvent, project: Project) => void;
    onToggleFavorite: (path: string, e?: React.MouseEvent) => void;
    onEdit: (project: Project, e?: React.MouseEvent) => void;
    onOpenGit?: (project: Project) => void;
    onLaunch: (path: string) => void;
}

export const ProjectCard = React.memo<ProjectCardProps>(({
    project,
    compactMode,
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

    return (
        <div
            onContextMenu={(e) => onContextMenu(e, project)}
            className={`
        group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden 
        hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]
        ${!reduceAnimations ? 'hover:shadow-[var(--accent-color)]/20 hover:border-[var(--accent-color)]/50 hover:-translate-y-2 transition-all duration-500' : ''}
        ${compactMode ? 'h-[220px]' : 'h-[320px]'}
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

            {/* Favorite button */}
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

            {/* Edit / Git buttons */}
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

            {/* Bottom content */}
            <div className={`absolute inset-x-0 bottom-0 ${compactMode ? 'p-4' : 'p-6'} flex flex-col z-10`}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-black text-white truncate pr-2 ${compactMode ? 'text-lg' : 'text-2xl'} group-hover:text-[var(--accent-color)] transition-colors`} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)' }}>
                            {project.name}
                        </h3>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-black/50 text-white backdrop-blur-md border border-white/20 group-hover:bg-[var(--accent-color)] group-hover:border-[var(--accent-color)] transition-colors duration-300 whitespace-nowrap">
                                UE {project.version}
                            </span>
                            {projectSize > 0 && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-black/50 text-slate-300 backdrop-blur-md border border-white/10 items-center gap-1 whitespace-nowrap ${compactMode ? 'hidden sm:flex' : 'flex'}`}>
                                    <HardDrive size={9} />
                                    {formatSize(projectSize)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!compactMode && (
                    <div className="flex items-center space-x-2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 delay-75">
                        <div className="text-[10px] text-slate-400 truncate font-mono bg-black/40 px-2 py-1 rounded border border-white/5 w-full">
                            {project.path}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4 transition-opacity">
                    {tags.slice(0, compactMode ? 2 : 3).map(tag => (
                        <span key={tag} style={{ backgroundColor: getTagColor(tag) }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm border border-white/10">
                            {tag}
                        </span>
                    ))}
                    {tags.length > (compactMode ? 2 : 3) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            +{tags.length - (compactMode ? 2 : 3)}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => onLaunch(project.path)}
                    className={`w-full flex items-center justify-center space-x-2 bg-white text-slate-900 hover:bg-[var(--accent-color)] hover:text-white
            ${compactMode ? 'py-2' : 'py-3'} rounded-xl backdrop-blur-sm transition-all duration-300 font-bold shadow-lg shadow-black/20 group/btn translate-y-2 group-hover:translate-y-0`}
                >
                    <Play size={compactMode ? 16 : 20} className="fill-current" />
                    <span className={compactMode ? 'text-xs' : 'text-sm'}>{t('projects.launch')}</span>
                </button>
            </div>
        </div>
    );
});

ProjectCard.displayName = 'ProjectCard';
