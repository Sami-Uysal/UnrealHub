import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Image as ImageIcon, X, Plus, FolderPlus, GitBranch, Pencil, Tag, Filter } from 'lucide-react';
import { Project } from '../types';
import { ContextMenu } from '../components/ContextMenu';
import { ConfigEditorModal } from '../components/ConfigEditorModal';
import { TagManagerModal } from '../components/TagManagerModal';

interface ProjectsPageProps {
    onOpenGit?: (project: Project) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onOpenGit }) => {
    const { t } = useTranslation();
    const [projects, setProjects] = useState<Project[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editName, setEditName] = useState('');
    const [editThumb, setEditThumb] = useState<string | undefined>(undefined);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDragOverModal, setIsDragOverModal] = useState(false);
    const [showGit, setShowGit] = useState(true);

    // Context Menu State
    const [ctxMenu, setCtxMenu] = useState<{ x: number, y: number, project: Project } | null>(null);

    // Config Editor State
    const [configProject, setConfigProject] = useState<Project | null>(null);

    // Tag Manager State
    const [tagModalProject, setTagModalProject] = useState<Project | null>(null);
    const [allTags, setAllTags] = useState<Record<string, string[]>>({});

    // Filtering State
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkGit = localStorage.getItem('showGitIntegration');
        if (checkGit !== null) {
            setShowGit(checkGit === 'true');
        }
        loadTags();

        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
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

    const uniqueTags = Array.from(new Set(Object.values(allTags).flat())).sort();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverModal(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverModal(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverModal(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const path = e.dataTransfer.files[0].path;
            if (path) {
                const success = await window.unreal.addDroppedProject(path);
                if (success) {
                    loadProjects();
                    setIsAddModalOpen(false);
                }
            }
        }
    };

    const handleAddProjectFile = async () => {
        const success = await window.unreal.addProjectFile();
        if (success) {
            loadProjects();
            setIsAddModalOpen(false);
        }
    };

    const loadProjects = async () => {
        try {
            const data = await window.unreal.getProjects();
            setProjects(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);


    const handleLaunch = async (path: string) => {
        await window.unreal.launchProject(path);
    };

    const handleEditClick = (project: Project, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingProject(project);
        setEditName(project.name);
        setEditThumb(project.thumbnail);
    };

    const handleSaveEdit = async () => {
        if (!editingProject) return;
        await window.unreal.updateProjectDetails(editingProject.path, {
            name: editName,
            thumbnail: editThumb
        });
        setEditingProject(null);
        loadProjects();
    };

    const handleSelectImage = async () => {
        const img = await window.unreal.selectImage();
        if (img) setEditThumb(img);
    };

    const toggleTagFilter = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const projectTags = allTags[p.path] || [];

        // Check if project has ALL selected tags
        const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => projectTags.includes(tag));

        return matchesSearch && matchesTags;
    });

    // Context Menu Actions
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

    return (
        <div className="relative" onClick={closeContextMenu}>
            {/* Context Menu */}
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    projectName={ctxMenu.project.name}
                    onClose={closeContextMenu}
                    onLaunch={() => handleAction(async () => window.unreal.launchProject(ctxMenu.project.path))}
                    onShowInExplorer={() => handleAction(async () => window.unreal.launchProject(ctxMenu.project.path.replace(/[\\\/][^\\\/]+$/, '')))}
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
                    onRemove={() => handleAction(async () => {
                        if (confirm(t('dialogs.removeProjectMessage'))) {
                            await window.unreal.removePath('project', ctxMenu.project.path);
                            // No need to alert, list should refresh
                        }
                    })} />
            )}

            {/* Quick Config Modal */}
            {configProject && (
                <ConfigEditorModal
                    projectPath={configProject.path}
                    onClose={() => setConfigProject(null)}
                />
            )}

            {/* Tag Manager Modal */}
            {tagModalProject && (
                <TagManagerModal
                    projectPath={tagModalProject.path}
                    allTags={allTags}
                    onUpdateTags={setAllTags}
                    onClose={() => setTagModalProject(null)}
                />
            )}

            {/* Project Modal */}
            {isAddModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsAddModalOpen(false)}
                >
                    <div
                        className="bg-slate-900 border border-slate-700 rounded-xl p-8 w-[480px] shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6 text-center">{t('projects.addProject')}</h3>

                        <div
                            className={`
                                h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                                ${isDragOverModal
                                    ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-xl shadow-blue-500/20'
                                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 hover:shadow-lg'
                                }
                            `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={handleAddProjectFile}
                        >
                            <div className="bg-blue-600/20 p-4 rounded-full mb-4">
                                <FolderPlus size={48} className="text-blue-400" />
                            </div>

                            <p className="text-lg font-medium text-slate-200 mb-2">
                                {t('projects.dragDrop')}
                            </p>

                            <div className="flex items-center space-x-2 w-full px-12 mb-2">
                                <div className="h-px bg-slate-700 flex-1"></div>
                                <span className="text-xs text-slate-500 font-bold uppercase">{t('projects.or')}</span>
                                <div className="h-px bg-slate-700 flex-1"></div>
                            </div>

                            <button className="text-blue-400 hover:text-blue-300 font-medium">
                                {t('projects.addProject')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {
                editingProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">{t('projects.editProjectTitle')}</h3>
                                <button onClick={() => setEditingProject(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">{t('projects.editProjectNameLabel')}</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">{t('projects.editProjectImageLabel')}</label>
                                    <div
                                        onClick={handleSelectImage}
                                        className="h-32 bg-slate-800 border border-dashed border-slate-600 rounded flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors relative overflow-hidden"
                                    >
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
                                <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded">{t('projects.edit')}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="flex items-center space-x-4 mb-2">
                <h2 className="text-xl font-bold text-slate-200 tracking-wide">{t('projects.title').toUpperCase()}</h2>

                <div className="h-px bg-slate-700 flex-1 ml-4 mr-4"></div>

                <div className="relative flex items-center space-x-2 z-20">
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`p-2 rounded transition-colors relative ${selectedTags.length > 0 ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
                            title="Filter by Tags"
                        >
                            <Filter size={20} />
                            {selectedTags.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                                    {selectedTags.length}
                                </span>
                            )}
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto custom-scrollbar">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                                    {t('dialogs.tagsTitle')}
                                </div>
                                {uniqueTags.length === 0 ? (
                                    <p className="text-slate-500 text-sm px-2 italic">{t('dialogs.noTags')}</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1">
                                        {uniqueTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTagFilter(tag)}
                                                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 border ${selectedTags.includes(tag)
                                                    ? 'bg-orange-600 text-white border-orange-500 hover:bg-orange-500'
                                                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-700'
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

                    <input
                        type="text"
                        placeholder={t('projects.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-800 text-sm text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-amber-500 w-64"
                    />
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        title={t('projects.addProject')}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Active Filter Tags Row */}
            {
                selectedTags.length > 0 && (
                    <div className="flex items-center space-x-2 mb-6 bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
                        <span className="text-[10px] text-slate-500 uppercase font-bold px-2 tracking-wider border-r border-slate-700 mr-2">Filters</span>
                        <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar flex-1">
                            {selectedTags.map(tag => (
                                <div key={tag} className="flex items-center bg-orange-600/20 text-orange-400 border border-orange-600/40 text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                    <span>{tag}</span>
                                    <button
                                        onClick={() => toggleTagFilter(tag)}
                                        className="ml-1.5 hover:text-orange-200 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setSelectedTags([])}
                            className="text-[10px] text-slate-500 hover:text-slate-300 underline whitespace-nowrap px-2"
                        >
                            Clear All
                        </button>
                    </div>
                )
            }

            {
                filteredProjects.length === 0 ? (
                    <div className="text-slate-500 border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/50">
                        <h3 className="text-lg font-medium text-slate-300">{t('projects.noProjects')}</h3>
                        <p className="mt-2 text-sm"> {t('projects.dragDrop')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                onContextMenu={(e) => handleContextMenu(e, project)}
                                onClick={() => handleLaunch(project.path)}
                                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 relative cursor-pointer"
                            >
                                <div className="h-48 relative bg-slate-800 overflow-hidden">
                                    {project.thumbnail ? (
                                        <img
                                            src={project.thumbnail}
                                            alt={project.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 group-hover:text-slate-500 transition-colors">
                                                <span className="text-3xl font-bold opacity-20">UE</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute top-2 right-2 flex space-x-2">
                                        <span className="bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded font-medium border border-white/10">
                                            {project.version}
                                        </span>
                                    </div>

                                    {allTags[project.path] && allTags[project.path].length > 0 && (
                                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 z-10">
                                            {allTags[project.path].slice(0, 3).map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleTagFilter(tag);
                                                    }}
                                                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${selectedTags.includes(tag)
                                                        ? 'bg-orange-600 text-white border-orange-500'
                                                        : 'bg-orange-600 text-white border-white/10 hover:bg-orange-500 hover:border-orange-400'
                                                        }`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                            {allTags[project.path].length > 3 && (
                                                <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded border border-white/10">
                                                    +{allTags[project.path].length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}



                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 backdrop-blur-sm">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLaunch(project.path);
                                            }}
                                            className="bg-amber-500 hover:bg-amber-400 text-black rounded-full p-4 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl"
                                        >
                                            <Play fill="currentColor" size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-200 truncate" title={project.name}>{project.name}</h3>
                                        <p className="text-xs text-slate-500 truncate mt-1">{project.path}</p>
                                    </div>

                                    <div className="flex items-center space-x-1">
                                        {showGit && onOpenGit && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenGit(project);
                                                }}
                                                className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                                                title={t('projects.gitHistory')}
                                            >
                                                <GitBranch size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleEditClick(project, e)}
                                            className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
};
