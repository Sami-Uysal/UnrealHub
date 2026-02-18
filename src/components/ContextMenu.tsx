import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FileText, Trash2, Copy, Settings, Tag, Play, Eraser, Code } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onLaunch: () => void;
    onShowInExplorer: () => void;
    onShowLogs: () => void;
    onGenerateFiles: () => void;
    onCleanCache: () => void;
    onClone: () => void;
    onEditConfig: () => void;
    onManageTags: () => void;
    onRemove: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, onClose,
    onLaunch, onShowInExplorer, onShowLogs, onGenerateFiles,
    onCleanCache, onClone, onEditConfig, onManageTags, onRemove
}) => {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 text-sm text-slate-200 animate-in fade-in zoom-in-95 duration-100"
            style={style}
        >
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700/50 mb-1">
                {t('projects.title')}
            </div>

            <button onClick={onLaunch} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                <Play size={14} className="text-green-400" />
                {t('contextMenu.launch')}
            </button>

            <button onClick={onShowInExplorer} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                <FolderOpen size={14} className="text-blue-400" />
                {t('contextMenu.showInExplorer')}
            </button>

            <div className="my-1 border-t border-slate-700/50" />

            <button onClick={onGenerateFiles} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                <Code size={14} className="text-purple-400" />
                {t('contextMenu.generateProjectFiles')}
            </button>

            <div className="my-1 border-t border-slate-700/50" />

            <button onClick={onShowLogs} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                <FileText size={14} className="text-slate-400" />
                {t('contextMenu.showLogs')}
            </button>

            <button onClick={onEditConfig} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                <Settings size={14} className="text-slate-400" />
                {t('contextMenu.editConfig')}
            </button>

            <div className="my-1 border-t border-slate-700/50" />

            <button onClick={onManageTags} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                <Tag size={14} className="text-orange-400" />
                {t('contextMenu.manageTags')}
            </button>

            <button onClick={onClone} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                <Copy size={14} className="text-cyan-400" />
                {t('contextMenu.clone')}
            </button>

            <button onClick={onCleanCache} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2 transition-colors group">
                <Eraser size={14} className="text-yellow-400 group-hover:text-yellow-300" />
                {t('contextMenu.cleanCache')}
            </button>

            <div className="my-1 border-t border-slate-700/50" />

            <button onClick={onRemove} className="w-full text-left px-3 py-1.5 hover:bg-red-900/30 hover:text-red-200 text-red-400 flex items-center gap-2 transition-colors">
                <Trash2 size={14} />
                {t('contextMenu.removeProject')}
            </button>
        </div>
    );
};
