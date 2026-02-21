import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FolderPlus, Filter, ArrowUpDown, X, Image as ImageIcon } from 'lucide-react';
import { Project } from '../types';
import { ContextMenu } from '../components/ContextMenu';
import { ConfigEditorModal } from '../components/ConfigEditorModal';
import { TagManagerModal } from '../components/TagManagerModal';
import { NotesModal } from '../components/NotesModal';
import { ProjectKanban } from '../components/Projects/ProjectKanban';
import { ProjectCard } from '../components/ProjectCard';
import { ConfirmationModal, DialogConfig } from '../components/ConfirmationModal';
import { useAppearance } from '../context/AppearanceContext';
import { getTagColor } from '../utils/tagUtils';
import { useProjects, useFavorites, useTags } from '../hooks/useProjects';

interface ProjectsPageProps {
    onOpenGit?: (project: Project) => void;
}

type SortMode = 'date' | 'name' | 'engine';

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onOpenGit }) => {
    const { t } = useTranslation();
    const { compactMode, reduceAnimations } = useAppearance();

    // Custom hooks
    const { projects, projectSizes, loadProjects } = useProjects();
    const { favorites, toggleFavorite } = useFavorites();
    const { allTags, setAllTags } = useTags();

    // Local UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editName, setEditName] = useState('');
    const [editThumb, setEditThumb] = useState<string | undefined>(undefined);
    const [editLaunchProfiles, setEditLaunchProfiles] = useState<import('../types').LaunchProfile[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDragOverModal, setIsDragOverModal] = useState(false);
    const [showGit] = useState(() => localStorage.getItem('showGitIntegration') !== 'false');

    const [ctxMenu, setCtxMenu] = useState<{ x: number, y: number, project: Project } | null>(null);
    const [configProject, setConfigProject] = useState<Project | null>(null);
    const [tagModalProject, setTagModalProject] = useState<Project | null>(null);
    const [notesProject, setNotesProject] = useState<Project | null>(null);
    const [kanbanProject, setKanbanProject] = useState<Project | null>(null);
    const [cloneProject, setCloneProject] = useState<Project | null>(null);
    const [cloneName, setCloneName] = useState('');

    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const [sortMode, setSortMode] = useState<SortMode>(() =>
        (localStorage.getItem('projectSortMode') as SortMode) || 'date'
    );
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null);

    const showDialog = useCallback((config: Omit<DialogConfig, 'onClose'>) => {
        setDialogConfig({ ...config, onClose: () => setDialogConfig(null) });
    }, []);

    // Memoized values
    const uniqueTags = useMemo(() =>
        Array.from(new Set(Object.values(allTags).flat())).sort(),
        [allTags]
    );

    const filteredProjects = useMemo(() =>
        projects
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
            }),
        [projects, searchTerm, allTags, selectedTags, favorites, sortMode]
    );

    const sortLabels: Record<SortMode, string> = useMemo(() => ({
        date: t('projects.sortDate'),
        name: t('projects.sortName'),
        engine: t('projects.sortEngine'),
    }), [t]);

    // Stable callbacks for ProjectCard
    const handleContextMenu = useCallback((e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, project });
    }, []);

    const closeContextMenu = useCallback(() => setCtxMenu(null), []);

    const handleAction = useCallback(async (action: () => Promise<void>) => {
        setCtxMenu(null);
        await action();
        loadProjects();
    }, [loadProjects]);

    const handleEditClick = useCallback((project: Project, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingProject(project);
        setEditName(project.name);
        setEditThumb(project.thumbnail);
        setEditLaunchProfiles(project.launchProfiles || []);
    }, []);

    const handleLaunch = useCallback((projectPath: string, args?: string) => {
        handleAction(async () => window.unreal.launchProject(projectPath, args));
    }, [handleAction]);

    const handleSaveEdit = async () => {
        if (!editingProject) return;
        await window.unreal.updateProjectDetails(editingProject.path, { name: editName, thumbnail: editThumb, launchProfiles: editLaunchProfiles });
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

    // Drag & drop
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

    const handleClone = async (project: Project, name: string) => {
        setCloneProject(null);
        try {
            await window.unreal.cloneProject(project.path, name);
            showDialog({
                type: 'alert',
                variant: 'success',
                title: t('dialogs.success'),
                message: t('dialogs.cloneProjectSuccess'),
                onConfirm: () => { }
            });
            loadProjects();
        } catch {
            showDialog({
                type: 'alert',
                variant: 'destructive',
                title: t('dialogs.error'),
                message: t('dialogs.cloneProjectError'),
                onConfirm: () => { }
            });
        }
    };

    const addLaunchProfile = () => {
        setEditLaunchProfiles([...editLaunchProfiles, { id: Date.now().toString(), name: '', args: '' }]);
    };

    const updateLaunchProfile = (id: string, field: 'name' | 'args', value: string) => {
        setEditLaunchProfiles(editLaunchProfiles.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const removeLaunchProfile = (id: string) => {
        setEditLaunchProfiles(editLaunchProfiles.filter(p => p.id !== id));
    };

    return (
        <div className="relative" onClick={closeContextMenu}>
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    projectName={ctxMenu.project.name}
                    onClose={closeContextMenu}
                    onLaunch={() => { const p = ctxMenu.project; handleAction(async () => window.unreal.launchProject(p.path)); }}
                    onShowInExplorer={() => { const p = ctxMenu.project; handleAction(async () => window.unreal.showInExplorer(p.path)); }}
                    onShowLogs={() => { const p = ctxMenu.project; handleAction(async () => window.unreal.openProjectLog(p.path)); }}
                    onCleanCache={() => {
                        const p = ctxMenu.project;
                        showDialog({
                            type: 'confirm',
                            variant: 'destructive',
                            title: t('dialogs.cleanCacheTitle') || 'Clean Cache',
                            message: t('dialogs.cleanCacheMessage'),
                            confirmText: t('dialogs.clean'),
                            onConfirm: () => {
                                handleAction(async () => {
                                    await window.unreal.cleanProjectCache(p.path);
                                    showDialog({
                                        type: 'alert',
                                        variant: 'success',
                                        title: t('dialogs.success'),
                                        message: t('dialogs.cleanCacheSuccess'),
                                        onConfirm: () => { }
                                    });
                                });
                            }
                        });
                    }}
                    onSmartBackup={() => {
                        const p = ctxMenu.project;
                        closeContextMenu();
                        window.unreal.smartBackup(p.path).then((res) => {
                            if (res.canceled) return;
                            if (res.success) {
                                showDialog({
                                    type: 'alert',
                                    variant: 'success',
                                    title: t('dialogs.success'),
                                    message: t('dialogs.smartBackupSuccess', { size: ((res.size || 0) / 1024 / 1024).toFixed(2) }),
                                    onConfirm: () => { }
                                });
                            } else {
                                showDialog({
                                    type: 'alert',
                                    variant: 'destructive',
                                    title: t('dialogs.error'),
                                    message: t('dialogs.smartBackupError', { error: res.error }),
                                    onConfirm: () => { }
                                });
                            }
                        }).catch(e => {
                            showDialog({
                                type: 'alert',
                                variant: 'destructive',
                                title: t('dialogs.error'),
                                message: t('dialogs.smartBackupError', { error: e.message }),
                                onConfirm: () => { }
                            });
                        });
                    }}
                    onClone={() => { const p = ctxMenu.project; closeContextMenu(); setCloneName(p.name + ' Copy'); setCloneProject(p); }}
                    onEditConfig={() => { const p = ctxMenu.project; handleAction(async () => setConfigProject(p)); }}
                    onManageTags={() => { const p = ctxMenu.project; handleAction(async () => setTagModalProject(p)); }}
                    onNotes={() => { const p = ctxMenu.project; handleAction(async () => setNotesProject(p)); }}
                    onKanban={() => { const p = ctxMenu.project; handleAction(async () => setKanbanProject(p)); }}
                    onRemove={() => {
                        const p = ctxMenu.project;
                        showDialog({
                            type: 'confirm',
                            variant: 'destructive',
                            title: t('projects.remove'),
                            message: t('dialogs.removeProjectMessage'),
                            confirmText: t('projects.remove'),
                            onConfirm: () => {
                                handleAction(async () => { await window.unreal.removeProject(p.path); });
                            }
                        });
                    }}
                    onDeleteProject={() => {
                        const p = ctxMenu.project;
                        showDialog({
                            type: 'confirm',
                            variant: 'destructive',
                            title: t('dialogs.deleteProjectTitle') || 'Delete Project',
                            message: t('dialogs.deleteProjectMessage'),
                            confirmText: t('projects.remove'),
                            onConfirm: () => {
                                showDialog({
                                    type: 'confirm',
                                    variant: 'destructive',
                                    title: t('dialogs.deleteProjectTitle') || 'Delete Project',
                                    message: t('dialogs.deleteProjectConfirm', { name: p.name }),
                                    confirmText: t('projects.remove'),
                                    onConfirm: () => {
                                        handleAction(async () => { await window.unreal.deleteProject(p.path); });
                                    }
                                });
                            }
                        });
                    }} />
            )}

            {dialogConfig && <ConfirmationModal config={dialogConfig} />}

            {configProject && <ConfigEditorModal projectPath={configProject.path} onClose={() => setConfigProject(null)} />}
            {tagModalProject && <TagManagerModal projectPath={tagModalProject.path} allTags={allTags} onUpdateTags={setAllTags} onClose={() => setTagModalProject(null)} />}
            {notesProject && <NotesModal projectPath={notesProject.path} projectName={notesProject.name} onClose={() => setNotesProject(null)} />}

            {/* Kanban Modal */}
            {kanbanProject && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setKanbanProject(null)}>
                    <div className="bg-slate-950 border border-slate-700/50 rounded-2xl w-[95vw] h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex-1 overflow-hidden">
                            <ProjectKanban projectPath={kanbanProject.path} onClose={() => setKanbanProject(null)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Clone Modal */}
            {cloneProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCloneProject(null)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[400px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4">{t('dialogs.cloneProjectTitle')}</h3>
                        <label className="block text-sm text-slate-400 mb-2">{t('dialogs.cloneProjectMessage')}</label>
                        <input
                            type="text"
                            value={cloneName}
                            onChange={(e) => setCloneName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter' && cloneName.trim()) handleClone(cloneProject, cloneName.trim()); }}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-color)] mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCloneProject(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                                {t('config.cancel')}
                            </button>
                            <button
                                onClick={() => { if (cloneName.trim()) handleClone(cloneProject, cloneName.trim()); }}
                                className="px-4 py-2 text-sm bg-[var(--accent-color)] hover:opacity-80 text-white rounded-lg transition-colors"
                            >
                                {t('contextMenu.clone')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Project Modal */}
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

            {/* Edit Project Modal */}
            {editingProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[480px] shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{t('projects.editProjectTitle')}</h3>
                            <button onClick={() => setEditingProject(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
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

                            <div className="pt-4 border-t border-slate-800">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-300 uppercase">{t('projects.launchOptions')}</label>
                                    <button onClick={addLaunchProfile} className="text-xs text-[var(--accent-color)] hover:underline flex items-center gap-1">
                                        <Plus size={12} /> {t('projects.addProfile')}
                                    </button>
                                </div>

                                {editLaunchProfiles.length === 0 ? (
                                    <div className="text-center text-slate-500 text-xs py-4 border border-dashed border-slate-700 rounded bg-slate-800/50">
                                        {t('projects.noProfiles')}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {editLaunchProfiles.map(profile => (
                                            <div key={profile.id} className="flex flex-col gap-2 p-3 bg-slate-800 border border-slate-700 rounded relative group">
                                                <button onClick={() => removeLaunchProfile(profile.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={14} />
                                                </button>
                                                <div className="pr-6">
                                                    <input
                                                        type="text"
                                                        placeholder={t('projects.profileName')}
                                                        value={profile.name}
                                                        onChange={(e) => updateLaunchProfile(profile.id, 'name', e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white focus:outline-none focus:border-[var(--accent-color)] mb-2"
                                                    />
                                                    <textarea
                                                        placeholder={t('projects.profileArgs')}
                                                        value={profile.args}
                                                        onChange={(e) => updateLaunchProfile(profile.id, 'args', e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-[var(--accent-color)] resize-y custom-scrollbar min-h-[40px] max-h-[120px]"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-800">
                            <button
                                onClick={() => {
                                    showDialog({
                                        type: 'confirm',
                                        variant: 'destructive',
                                        title: t('projects.remove'),
                                        message: t('dialogs.removeProjectMessage'),
                                        confirmText: t('projects.remove'),
                                        onConfirm: async () => {
                                            await window.unreal.removeProject(editingProject.path);
                                            setEditingProject(null);
                                            loadProjects();
                                        }
                                    });
                                }}
                                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                            >
                                {t('projects.remove')}
                            </button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-[var(--accent-color)] hover:opacity-80 text-white rounded transition-colors">{t('projects.saveProfile')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center space-x-4">
                    <h2 className="text-3xl font-black text-white tracking-tight">
                        {t('projects.title').toUpperCase()}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Filter dropdown */}
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
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('dialogs.suggestedTags')}</span>
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

                    {/* Sort dropdown */}
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

                    {/* Search */}
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

                    {/* Add button */}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        title={t('projects.addProject')}
                        className="h-10 w-10 bg-[var(--accent-color)] hover:opacity-90 text-white rounded-xl transition-all duration-300 shadow-[0_0_15px_var(--accent-color)]/30 hover:shadow-[0_0_20px_var(--accent-color)]/50 hover:scale-105 flex items-center justify-center"
                    >
                        <Plus size={22} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Active tag filters */}
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

            {/* Project cards grid */}
            <div className={`grid ${compactMode ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}`}>
                {filteredProjects.map((project) => (
                    <ProjectCard
                        key={project.path}
                        project={project}
                        compactMode={compactMode}
                        reduceAnimations={reduceAnimations}
                        showGit={showGit}
                        isFavorite={favorites.includes(project.path)}
                        projectSize={projectSizes[project.path] || 0}
                        tags={allTags[project.path] || []}
                        onContextMenu={handleContextMenu}
                        onToggleFavorite={toggleFavorite}
                        onEdit={handleEditClick}
                        onOpenGit={onOpenGit}
                        onLaunch={handleLaunch}
                    />
                ))}
            </div>
        </div>
    );
};
