import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FileText, Trash2, Copy, Settings, Tag, Play, Eraser, StickyNote, FolderX } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    projectName: string;
    onClose: () => void;
    onLaunch: () => void;
    onShowInExplorer: () => void;
    onShowLogs: () => void;
    onCleanCache: () => void;
    onClone: () => void;
    onEditConfig: () => void;
    onManageTags: () => void;
    onNotes: () => void;
    onRemove: () => void;
    onSmartBackup: () => void;
    onDeleteProject: () => void;
    onKanban: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, projectName, onClose,
    onLaunch, onShowInExplorer, onShowLogs,
    onCleanCache, onClone, onEditConfig, onManageTags, onNotes, onRemove, onSmartBackup, onDeleteProject, onKanban
}) => {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuConfig, setMenuConfig] = React.useState<Record<string, boolean>>({});

    useEffect(() => {
        const loadConfig = () => {
            const stored = localStorage.getItem('contextMenuConfig');
            if (stored) {
                setMenuConfig(JSON.parse(stored));
            } else {
                setMenuConfig({
                    launch: true, showInExplorer: true, showLogs: true,
                    cleanCache: true, clone: true,
                    editConfig: true, manageTags: true, notes: true, kanban: true, smartBackup: true, removeProject: true, deleteProject: true
                });
            }
        };

        loadConfig();
        window.addEventListener('storage', loadConfig);
        return () => window.removeEventListener('storage', loadConfig);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    const isVisible = (key: string) => menuConfig[key] !== false;

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl py-2 text-sm text-slate-200 animate-in fade-in zoom-in-95 duration-200 origin-top-left"
            style={style}
        >
            <div className="px-3 py-2 border-b border-slate-700/50 mb-1">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
                    {projectName}
                </div>
            </div>

            <div className="p-1 space-y-0.5">
                {isVisible('launch') && (
                    <button onClick={onLaunch} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <Play size={15} className="text-green-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.launch')}</span>
                    </button>
                )}

                {isVisible('showInExplorer') && (
                    <button onClick={onShowInExplorer} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <FolderOpen size={15} className="text-primary group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.showInExplorer')}</span>
                    </button>
                )}

                {(isVisible('showLogs') || isVisible('editConfig')) && <div className="my-1 border-t border-slate-700/30 mx-2" />}

                {isVisible('showLogs') && (
                    <button onClick={onShowLogs} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <FileText size={15} className="text-slate-400 group-hover:text-slate-200 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.showLogs')}</span>
                    </button>
                )}

                {isVisible('editConfig') && (
                    <button onClick={onEditConfig} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <Settings size={15} className="text-slate-400 group-hover:text-slate-200 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.editConfig')}</span>
                    </button>
                )}

                {(isVisible('manageTags') || isVisible('notes') || isVisible('clone') || isVisible('cleanCache')) && <div className="my-1 border-t border-slate-700/30 mx-2" />}

                {isVisible('manageTags') && (
                    <button onClick={onManageTags} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <Tag size={15} className="text-orange-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.manageTags')}</span>
                    </button>
                )}

                {isVisible('notes') && (
                    <button onClick={onNotes} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <StickyNote size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.notes')}</span>
                    </button>
                )}

                {isVisible('kanban') && (
                    <button onClick={onKanban} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <FileText size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('kanban.title')}</span>
                    </button>
                )}

                {isVisible('clone') && (
                    <button onClick={onClone} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <Copy size={15} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.clone')}</span>
                    </button>
                )}

                {isVisible('cleanCache') && (
                    <button onClick={onCleanCache} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <Eraser size={15} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.cleanCache')}</span>
                    </button>
                )}

                {isVisible('smartBackup') && (
                    <button onClick={onSmartBackup} className="w-full text-left px-3 py-2 hover:bg-slate-800/80 rounded-md flex items-center gap-3 transition-all group">
                        <FolderOpen size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.smartBackup')}</span>
                    </button>
                )}

                {isVisible('removeProject') && (
                    <>
                        <div className="my-1 border-t border-slate-700/30 mx-2" />
                        <button onClick={onRemove} className="w-full text-left px-3 py-2 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded-md flex items-center gap-3 transition-all group">
                            <Trash2 size={15} className="group-hover:scale-110 transition-transform" />
                            <span className="font-medium">{t('contextMenu.removeProject')}</span>
                        </button>
                    </>
                )}

                {isVisible('deleteProject') && (
                    <button onClick={onDeleteProject} className="w-full text-left px-3 py-2 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded-md flex items-center gap-3 transition-all group">
                        <FolderX size={15} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{t('contextMenu.deleteProject')}</span>
                    </button>
                )}
            </div>
        </div>
    );
};
