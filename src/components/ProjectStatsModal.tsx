import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, PieChart, FileCode, Map as MapIcon, Box, Cuboid } from 'lucide-react';

interface ProjectStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectPath: string;
    projectName: string;
}

export const ProjectStatsModal: React.FC<ProjectStatsModalProps> = ({ isOpen, onClose, projectPath, projectName }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState<{ blueprints: number, assets: number, maps: number, cpp: number, h: number } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;

        const fetchStats = async () => {
            setLoading(true);
            setStats(null);
            try {
                const s = await window.unreal.getProjectStats(projectPath);
                if (isMounted) setStats(s);
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchStats();
        return () => { isMounted = false; };
    }, [isOpen, projectPath]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <PieChart className="text-purple-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{t('dialogs.statsTitle')}</h2>
                            <p className="text-xs text-slate-400 font-mono truncate max-w-[200px]">{projectName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t('dialogs.statsHeaderTitle')}</h3>

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-8 opacity-60">
                            <div className="w-8 h-8 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin mb-3"></div>
                            <span className="text-sm font-medium animate-pulse">{t('dialogs.statsCalculating')}</span>
                        </div>
                    )}

                    {!loading && stats && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg shrink-0"><Cuboid size={20} /></div>
                                <div className="min-w-0">
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{t('dialogs.statsBlueprints')}</div>
                                    <div className="text-xl font-bold text-slate-200">{stats.blueprints}</div>
                                </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl flex items-center gap-3">
                                <div className="p-2.5 bg-green-500/20 text-green-400 rounded-lg shrink-0"><Box size={20} /></div>
                                <div className="min-w-0">
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{t('dialogs.statsAssets')}</div>
                                    <div className="text-xl font-bold text-slate-200">{stats.assets}</div>
                                </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0"><MapIcon size={20} /></div>
                                <div className="min-w-0">
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{t('dialogs.statsMaps')}</div>
                                    <div className="text-xl font-bold text-slate-200">{stats.maps}</div>
                                </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl flex flex-col gap-1 justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileCode size={14} className="text-rose-400" />
                                    <span className="text-[10px] text-slate-400 uppercase font-semibold truncate">{t('dialogs.statsCpp')}</span>
                                </div>
                                <div className="flex gap-4">
                                    <div>
                                        <div className="text-sm font-bold text-slate-200">{stats.cpp}</div>
                                        <div className="text-[9px] text-slate-500">.cpp</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-200">{stats.h}</div>
                                        <div className="text-[9px] text-slate-500">.h</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
