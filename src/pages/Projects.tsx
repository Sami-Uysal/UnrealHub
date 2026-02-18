import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Image as ImageIcon, X, Plus, FolderPlus, GitBranch, Pencil } from 'lucide-react';
import { Project } from '../types';
import { ContextMenu } from '../components/ContextMenu';
import { ConfigEditorModal } from '../components/ConfigEditorModal';

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

    const [ctxMenu, setCtxMenu] = useState<{ x: number, y: number, project: Project } | null>(null);

    const [configProject, setConfigProject] = useState<Project | null>(null);

    useEffect(() => {
        const checkGit = localStorage.getItem('showGitIntegration');
        if (checkGit !== null) {
            setShowGit(checkGit === 'true');
        }
    }, []);

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

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
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
                    onManageTags={() => alert("Tag Manager Coming Soon")}
                    onRemove={() => handleAction(async () => {

                    })}
                />
            )}

            {/* Quick Config Modal */}
            {configProject && (
                <ConfigEditorModal
                    projectPath={configProject.path}
                    onClose={() => setConfigProject(null)}
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
                                h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all
                                ${isDragOverModal
                                    ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                                    : 'border-slate-600 bg-slate-800 hover:bg-slate-800/80 hover:border-slate-500'
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
                            <button onClick={() => setEditingProject(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">{t('projects.remove')}</button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded">{t('projects.edit')}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center space-x-4 mb-6">
                <h2 className="text-xl font-bold text-slate-200 tracking-wide">{t('projects.title').toUpperCase()}</h2>
                <div className="h-px bg-slate-700 flex-1 ml-4 mr-4"></div>
                <div className="relative flex items-center space-x-2">
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



            {filteredProjects.length === 0 ? (
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
                            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 hover:scale-[1.02] hover:border-slate-700 relative cursor-pointer"
                        >
                            <div className="h-48 relative bg-slate-800 overflow-hidden">
                                {project.thumbnail ? (
                                    <img
                                        src={project.thumbnail}
                                        alt={project.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
            )}
        </div>
    );
};
