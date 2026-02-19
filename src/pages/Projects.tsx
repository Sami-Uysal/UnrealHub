import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Image as ImageIcon, X, Plus, FolderPlus, GitBranch, Pencil, Filter, Star, ArrowUpDown, HardDrive } from 'lucide-react';
import { Project } from '../types';
import { ContextMenu } from '../components/ContextMenu';
import { ConfigEditorModal } from '../components/ConfigEditorModal';
import { TagManagerModal } from '../components/TagManagerModal';
import { NotesModal } from '../components/NotesModal';
import { useAppearance } from '../context/AppearanceContext';
import { getTagColor } from '../utils/tagUtils';

interface ProjectsPageProps {
    onOpenGit?: (project: Project) => void;
}

type SortMode = 'date' | 'name' | 'engine';

function formatSize(bytes: number): string {
    if (bytes === 0) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onOpenGit }) => {
    const { t } = useTranslation();
    const { compactMode, reduceAnimations } = useAppearance();
    const [projects, setProjects] = useState<Project[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editName, setEditName] = useState('');
    const [editThumb, setEditThumb] = useState<string | undefined>(undefined);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDragOverModal, setIsDragOverModal] = useState(false);
    const [showGit, setShowGit] = useState(true);

    const [ctxMenu, setCtxMenu] = useState<{ x: number, y: number, project: Project } | null>(null);
    const [configProject, setConfigProject] = useState<Project | null>(null);
    const [tagModalProject, setTagModalProject] = useState<Project | null>(null);
    const [notesProject, setNotesProject] = useState<Project | null>(null);
    const [allTags, setAllTags] = useState<Record<string, string[]>>({});

    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const [favorites, setFavorites] = useState<string[]>([]);
    const [sortMode, setSortMode] = useState<SortMode>(() => {
        return (localStorage.getItem('projectSortMode') as SortMode) || 'date';
    });
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    const [projectSizes, setProjectSizes] = useState<Record<string, number>>({});

    useEffect(() => {
        const checkGit = localStorage.getItem('showGitIntegration');
        if (checkGit !== null) setShowGit(checkGit === 'true');
        loadTags();
        loadFavorites();

        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) setIsFilterOpen(false);
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) setIsSortOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadTags = async () => {
        try {
            const tags = await window.unreal.getProjectTags();
            setAllTags(tags || {});
        } catch (error) {
            console.error(error);
        }
    };

    const loadFavorites = async () => {
        try {
            const favs = await window.unreal.getFavorites();
            setFavorites(favs || []);
        } catch { }
    };

    const toggleFavorite = async (projectPath: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const updated = await window.unreal.toggleFavorite(projectPath);
        setFavorites(updated);
    };

    const uniqueTags = Array.from(new Set(Object.values(allTags).flat())).sort();

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOverModal(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOverModal(false); };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverModal(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const path = e.dataTransfer.files[0].path;
            if (path) {
                const success = await window.unreal.addDroppedProject(path);
                if (success) { loadProjects(); setIsAddModalOpen(false); }
            }
        }
    };

    const handleAddProjectFile = async () => {
        const success = await window.unreal.addProjectFile();
        if (success) { loadProjects(); setIsAddModalOpen(false); }
    };

    const loadProjects = async () => {
        try {
            const data = await window.unreal.getProjects();
            setProjects(data);
            data.forEach(p => {
                if (!projectSizes[p.path]) {
                    window.unreal.getProjectSize(p.path).then(size => {
                        setProjectSizes(prev => ({ ...prev, [p.path]: size }));
                    });
                }
            });
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => { loadProjects(); }, []);

    const handleEditClick = (project: Project, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingProject(project);
        setEditName(project.name);
        setEditThumb(project.thumbnail);
    };

    const handleSaveEdit = async () => {
        if (!editingProject) return;
        await window.unreal.updateProjectDetails(editingProject.path, { name: editName, thumbnail: editThumb });
        setEditingProject(null);
        loadProjects();
    };

    const handleSelectImage = async () => {
        const img = await window.unreal.selectImage();
        if (img) setEditThumb(img);
    };

    const toggleTagFilter = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const changeSortMode = (mode: SortMode) => {
        setSortMode(mode);
        localStorage.setItem('projectSortMode', mode);
        setIsSortOpen(false);
    };

    const filteredProjects = projects
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const projectTags = allTags[p.path] || [];
            const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => projectTags.includes(tag));
            return matchesSearch && matchesTags;
        })
        .sort((a, b) => {
            const aFav = favorites.includes(a.path) ? -1 : 0;
            const bFav = favorites.includes(b.path) ? -1 : 0;
            if (aFav !== bFav) return aFav - bFav;

            switch (sortMode) {
                case 'name': return a.name.localeCompare(b.name);
                case 'engine': return a.version.localeCompare(b.version);
                case 'date': default: return b.lastModified - a.lastModified;
            }
        });

    const handleContextMenu = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, project });
    };

    const closeContextMenu = () => setCtxMenu(null);

    const handleAction = async (action: () => Promise<void>) => {
        closeContextMenu();
        await action();
        loadProjects();
    };

    const sortLabels: Record<SortMode, string> = {
        date: t('projects.sortDate'),
        name: t('projects.sortName'),
        engine: t('projects.sortEngine'),
    };

    return (
        <div className="relative" onClick={closeContextMenu}>
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    projectName={ctxMenu.project.name}
                    onClose={closeContextMenu}
                    onLaunch={() => handleAction(async () => window.unreal.launchProject(ctxMenu.project.path))}
                    onShowInExplorer={() => handleAction(async () => window.unreal.launchProject(ctxMenu.project.path.replace(/[\\/][^\\/]+$/, '')))}
                    onShowLogs={() => handleAction(async () => window.unreal.openProjectLog(ctxMenu.project.path))}
                    onGenerateFiles={() => handleAction(async () => {
                        alert(t('dialogs.generateFilesSuccess'));
                        await window.unreal.generateProjectFiles(ctxMenu.project.path);
                    })}
                    onCleanCache={() => handleAction(async () => {
                        if (confirm(t('dialogs.cleanCacheMessage'))) {
                            await window.unreal.cleanProjectCache(ctxMenu.project.path);
                            alert(t('dialogs.cleanCacheSuccess'));
                        }
                    })}
                    onClone={() => {
                        const newName = prompt(t('dialogs.cloneProjectMessage'));
                        if (newName) {
                            handleAction(async () => {
                                try {
                                    await window.unreal.cloneProject(ctxMenu.project.path, newName);
                                    alert(t('dialogs.cloneProjectSuccess'));
                                } catch {
                                    alert(t('dialogs.cloneProjectError'));
                                }
                            });
                        }
                    }}
                    onEditConfig={() => handleAction(async () => setConfigProject(ctxMenu.project))}
                    onManageTags={() => handleAction(async () => setTagModalProject(ctxMenu.project))}
                    onNotes={() => handleAction(async () => setNotesProject(ctxMenu.project))}
                    onRemove={() => handleAction(async () => {
                        if (confirm(t('dialogs.removeProjectMessage'))) {
                            await window.unreal.removePath('project', ctxMenu.project.path);
                        }
                    })} />
            )}

            {configProject && (
                <ConfigEditorModal projectPath={configProject.path} onClose={() => setConfigProject(null)} />
            )}

            {tagModalProject && (
                <TagManagerModal projectPath={tagModalProject.path} allTags={allTags} onUpdateTags={setAllTags} onClose={() => setTagModalProject(null)} />
            )}

            {notesProject && (
                <NotesModal projectPath={notesProject.path} projectName={notesProject.name} onClose={() => setNotesProject(null)} />
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 w-[480px] shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-6 text-center">{t('projects.addProject')}</h3>
                        <div
                            className={`h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                                ${isDragOverModal
                                    ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl shadow-[var(--accent-color)]/20'
                                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 hover:shadow-lg'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={handleAddProjectFile}
                        >
                            <div className="bg-primary/20 p-4 rounded-full mb-4">
                                <FolderPlus size={48} className="text-primary" />
                            </div>
                            <p className="text-lg font-medium text-slate-200 mb-2">{t('projects.dragDrop')}</p>
                            <div className="flex items-center space-x-2 w-full px-12 mb-2">
                                <div className="h-px bg-slate-700 flex-1"></div>
                                <span className="text-xs text-slate-500 font-bold uppercase">{t('projects.or')}</span>
                                <div className="h-px bg-slate-700 flex-1"></div>
                            </div>
                            <button className="text-primary hover:text-primary/80 font-medium">{t('projects.addProject')}</button>
                        </div>
                    </div>
                </div>
            )}

            {editingProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{t('projects.editProjectTitle')}</h3>
                            <button onClick={() => setEditingProject(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">{t('projects.editProjectNameLabel')}</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">{t('projects.editProjectImageLabel')}</label>
                                <div onClick={handleSelectImage}
                                    className="h-32 bg-slate-800 border border-dashed border-slate-600 rounded flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors relative overflow-hidden">
                                    {editThumb ? (
                                        <img src={editThumb} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-500">
                                            <ImageIcon size={24} />
                                            <span className="text-xs mt-2">{t('projects.selectImage')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={async () => {
                                    if (confirm(t('dialogs.removeProjectMessage'))) {
                                        await window.unreal.removePath('project', editingProject.path);
                                        setEditingProject(null);
                                        loadProjects();
                                    }
                                }}
                                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                            >
                                {t('projects.remove')}
                            </button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-primary hover:bg-primary/80 text-white rounded">{t('projects.edit')}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center space-x-4">
                    <h2 className="text-3xl font-black text-white tracking-tight">
                        {t('projects.title').toUpperCase()}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative z-20 group" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`h-10 px-4 rounded-xl transition-all duration-300 flex items-center gap-2 border
                                ${selectedTags.length > 0
                                    ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-[0_0_15px_var(--accent-color)]/30'
                                    : 'bg-slate-900/50 text-slate-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-slate-800'
                                }`}
                            title={t('projects.filter')}
                        >
                            <Filter size={18} />
                            <span className="font-medium text-sm hidden sm:block">{t('projects.filter')}</span>
                            {selectedTags.length > 0 && (
                                <span className="bg-white text-[var(--accent-color)] text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                                    {selectedTags.length}
                                </span>
                            )}
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('dialogs.tagsTitle')}</span>
                                    {selectedTags.length > 0 && (
                                        <button onClick={() => setSelectedTags([])} className="text-[10px] text-[var(--accent-color)] hover:underline font-medium">
                                            {t('projects.clearAll')}
                                        </button>
                                    )}
                                </div>
                                {uniqueTags.length === 0 ? (
                                    <div className="text-slate-500 text-sm py-4 text-center bg-white/5 rounded-lg border border-white/5 border-dashed">
                                        {t('dialogs.noTags')}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                        {uniqueTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTagFilter(tag)}
                                                style={{ backgroundColor: getTagColor(tag), borderColor: 'rgba(255,255,255,0.1)' }}
                                                className={`text-xs px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 border
                                                    ${selectedTags.includes(tag)
                                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 text-white shadow-md'
                                                        : 'text-white opacity-90 hover:opacity-100 hover:scale-105 shadow-sm'
                                                    }`}
                                            >
                                                {tag}
                                                {selectedTags.includes(tag) && <X size={10} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="relative z-20" ref={sortRef}>
                        <button
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className="h-10 px-4 rounded-xl transition-all duration-300 flex items-center gap-2 border bg-slate-900/50 text-slate-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-slate-800"
                            title={t('projects.sortBy')}
                        >
                            <ArrowUpDown size={18} />
                            <span className="font-medium text-sm hidden sm:block">{sortLabels[sortMode]}</span>
                        </button>

                        {isSortOpen && (
                            <div className="absolute right-0 top-full mt-2 w-44 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                {(['date', 'name', 'engine'] as SortMode[]).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => changeSortMode(mode)}
                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${sortMode === mode
                                            ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/10 font-semibold'
                                            : 'text-slate-300 hover:bg-slate-800'
                                            }`}
                                    >
                                        {sortLabels[mode]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-slate-500 group-focus-within:text-[var(--accent-color)] transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder={t('projects.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-10 bg-slate-900/50 text-sm text-white pl-10 pr-4 rounded-xl border border-white/5 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] w-full sm:w-64 transition-all duration-300 group-hover:border-white/20 placeholder:text-slate-600"
                        />
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        title={t('projects.addProject')}
                        className="h-10 w-10 bg-[var(--accent-color)] hover:opacity-90 text-white rounded-xl transition-all duration-300 shadow-[0_0_15px_var(--accent-color)]/30 hover:shadow-[0_0_20px_var(--accent-color)]/50 hover:scale-105 flex items-center justify-center"
                    >
                        <Plus size={22} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {selectedTags.length > 0 && (
                <div className="flex items-center space-x-2 mb-6 bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 uppercase font-bold px-2 tracking-wider border-r border-slate-700 mr-2">{t('projects.filters')}</span>
                    <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar flex-1">
                        {selectedTags.map(tag => (
                            <div key={tag} style={{ backgroundColor: getTagColor(tag) }} className="flex items-center text-white text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap border border-white/10 shadow-sm">
                                <span>{tag}</span>
                                <button onClick={() => toggleTagFilter(tag)} className="ml-1.5 hover:text-white/70 transition-colors">
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setSelectedTags([])} className="text-[10px] text-slate-500 hover:text-slate-300 underline whitespace-nowrap px-2">
                        {t('projects.clearAll')}
                    </button>
                </div>
            )}

            <div className={`grid ${compactMode ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}`}>
                {filteredProjects.map((project) => (
                    <div
                        key={project.path}
                        onContextMenu={(e) => handleContextMenu(e, project)}
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
                                onClick={(e) => toggleFavorite(project.path, e)}
                                className={`p-2 rounded-full backdrop-blur-md border transition-all duration-300 ${favorites.includes(project.path)
                                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-400'
                                        : 'bg-slate-950/40 border-white/10 text-slate-400 opacity-0 group-hover:opacity-100'
                                    }`}
                                title={favorites.includes(project.path) ? t('projects.unfavorite') : t('projects.favorite')}
                            >
                                <Star size={14} className={favorites.includes(project.path) ? 'fill-amber-400' : ''} />
                            </button>
                        </div>

                        <div className="absolute top-3 right-3 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                            <button
                                onClick={(e) => handleEditClick(project, e)}
                                className="p-2.5 rounded-full bg-slate-950/60 backdrop-blur-md text-slate-200 hover:text-white hover:bg-[var(--accent-color)] border border-white/10 transition-colors shadow-lg"
                                title={t('projects.edit')}
                            >
                                <Pencil size={16} />
                            </button>
                            {showGit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (onOpenGit) onOpenGit(project); }}
                                    className="p-2.5 rounded-full bg-slate-950/60 backdrop-blur-md text-slate-200 hover:text-white hover:bg-[var(--accent-color)] border border-white/10 transition-colors shadow-lg"
                                    title={t('projects.gitHistory')}
                                >
                                    <GitBranch size={16} />
                                </button>
                            )}
                        </div>

                        <div className={`absolute inset-x-0 bottom-0 ${compactMode ? 'p-4' : 'p-6'} flex flex-col z-10`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-black text-white truncate pr-2 ${compactMode ? 'text-lg' : 'text-2xl'} group-hover:text-[var(--accent-color)] transition-colors`} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)' }}>
                                        {project.name}
                                    </h3>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-black/50 text-white backdrop-blur-md border border-white/20 group-hover:bg-[var(--accent-color)] group-hover:border-[var(--accent-color)] transition-colors duration-300`}>
                                            UE {project.version}
                                        </span>
                                        {projectSizes[project.path] > 0 && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-black/50 text-slate-300 backdrop-blur-md border border-white/10 flex items-center gap-1">
                                                <HardDrive size={9} />
                                                {formatSize(projectSizes[project.path])}
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
                                {(allTags[project.path] || []).slice(0, compactMode ? 2 : 3).map(tag => (
                                    <span key={tag} style={{ backgroundColor: getTagColor(tag) }}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm border border-white/10">
                                        {tag}
                                    </span>
                                ))}
                                {(allTags[project.path] || []).length > (compactMode ? 2 : 3) && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                        +{(allTags[project.path] || []).length - (compactMode ? 2 : 3)}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={() => handleAction(async () => window.unreal.launchProject(project.path))}
                                className={`w-full flex items-center justify-center space-x-2 bg-white text-slate-900 hover:bg-[var(--accent-color)] hover:text-white
                                    ${compactMode ? 'py-2' : 'py-3'} rounded-xl backdrop-blur-sm transition-all duration-300 font-bold shadow-lg shadow-black/20 group/btn translate-y-2 group-hover:translate-y-0`}
                            >
                                <Play size={compactMode ? 16 : 20} className="fill-current" />
                                <span className={compactMode ? 'text-xs' : 'text-sm'}>{t('projects.launch')}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
