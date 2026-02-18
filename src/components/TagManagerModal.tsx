import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Tag, Plus, Trash2 } from 'lucide-react';

interface TagManagerModalProps {
    projectPath: string;
    allTags: Record<string, string[]>;
    onUpdateTags: (newTags: Record<string, string[]>) => void;
    onClose: () => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({ projectPath, allTags, onUpdateTags, onClose }) => {
    const { t } = useTranslation();
    const [currentTags, setCurrentTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        if (allTags[projectPath]) {
            setCurrentTags(allTags[projectPath]);
        } else {
            setCurrentTags([]);
        }
    }, [projectPath, allTags]);

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        if (currentTags.includes(newTag.trim())) return;

        const updatedTags = [...currentTags, newTag.trim()];
        setCurrentTags(updatedTags);

        const newAllTags = { ...allTags, [projectPath]: updatedTags };
        onUpdateTags(newAllTags);
        window.unreal.saveProjectTags(newAllTags);
        setNewTag('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
        setCurrentTags(updatedTags);

        const newAllTags = { ...allTags, [projectPath]: updatedTags };
        onUpdateTags(newAllTags);
        window.unreal.saveProjectTags(newAllTags);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddTag();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Tag className="text-orange-400" />
                    {t('dialogs.tagManagerTitle')}
                </h3>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('dialogs.tagNamePlaceholder')}
                        className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-orange-500"
                    />
                    <button
                        onClick={handleAddTag}
                        className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-lg transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/*Global Tags*/}
                {(() => {
                    const globalTags = Array.from(new Set(Object.values(allTags).flat()))
                        .filter(tag => !currentTags.includes(tag))
                        .sort();

                    if (globalTags.length === 0) return null;

                    return (
                        <div className="mb-6">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-wider">
                                {t('dialogs.suggestedTags') || 'ETİKETLER'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {globalTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => {
                                            setNewTag(tag);
                                            const updatedTags = [...currentTags, tag];
                                            setCurrentTags(updatedTags);
                                            const newAllTags = { ...allTags, [projectPath]: updatedTags };
                                            onUpdateTags(newAllTags);
                                            window.unreal.saveProjectTags(newAllTags);
                                            setNewTag('');
                                        }}
                                        className="text-[10px] bg-slate-800/50 hover:bg-orange-900/20 text-slate-400 hover:text-orange-400 border border-slate-700 hover:border-orange-500/50 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 group"
                                    >
                                        <Plus size={10} className="opacity-0 group-hover:opacity-100 transition-opacity w-0 group-hover:w-auto overflow-hidden" />
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {currentTags.length === 0 ? (
                        <p className="text-slate-500 text-sm italic text-center py-4">{t('dialogs.noTags')}</p>
                    ) : (
                        currentTags.map(tag => (
                            <div key={tag} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 group hover:border-slate-600 hover:bg-slate-800 transition-all">
                                <span className="text-slate-200 text-sm font-medium flex items-center gap-2">
                                    <Tag size={14} className="text-slate-500 group-hover:text-orange-400 transition-colors" />
                                    {tag}
                                </span>
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="text-slate-500 hover:text-red-400 p-1 rounded-md hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
