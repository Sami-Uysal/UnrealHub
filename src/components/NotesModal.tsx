import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, StickyNote } from 'lucide-react';

interface NotesModalProps {
    projectPath: string;
    projectName: string;
    onClose: () => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({ projectPath, projectName, onClose }) => {
    const { t } = useTranslation();
    const [notes, setNotes] = useState('');
    const [allNotes, setAllNotes] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            const data = await window.unreal.getProjectNotes();
            setAllNotes(data);
            setNotes(data[projectPath] || '');
        };
        load();
    }, [projectPath]);

    const handleSave = async () => {
        const updated = { ...allNotes, [projectPath]: notes };
        await window.unreal.saveProjectNotes(updated);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[520px] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <StickyNote size={20} className="text-amber-400" />
                        <h3 className="text-lg font-bold text-white">{t('dialogs.notesTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-xs text-slate-500 mb-3 truncate">{projectName}</p>

                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={t('dialogs.notesPlaceholder')}
                    className="w-full h-64 bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[var(--accent-color)] resize-none"
                />

                <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] text-slate-600">{notes.length} chars</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded transition-colors">
                            {t('config.cancel')}
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm bg-[var(--accent-color)] hover:opacity-90 text-white rounded-lg font-medium transition-all">
                            {t('config.save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
