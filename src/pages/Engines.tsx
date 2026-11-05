import React, { useMemo } from 'react';
import { Engine } from '../types';
import { useTranslation } from 'react-i18next';
import { Play, FolderOpen, HardDrive } from 'lucide-react';
import { useAppearance } from '../context/AppearanceContext';
import { compareEngineVersions } from '../utils/engineVersions';
import { useScan } from '../hooks/useScan';
import { ScanProgress } from '../components/ScanProgress';

const getEngineScan = (refresh: boolean) => window.unreal.getEngineScan(refresh);

export const EnginesPage: React.FC = () => {
    const { t } = useTranslation();
    const { reduceAnimations } = useAppearance();
    const { snapshot, refresh } = useScan<Engine>(getEngineScan);
    const engines = snapshot.items;

    const groups = useMemo(() => (['source', 'installed'] as const).map(type => ({
        type,
        engines: engines.filter(engine => engine.type === type).sort((a, b) =>
            compareEngineVersions(b.version, a.version) || a.path.localeCompare(b.path)
        ),
    })), [engines]);

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-white tracking-tight">
                    {t('engines.title').toUpperCase()}
                </h2>
            </div>

            <ScanProgress snapshot={snapshot} onRefresh={() => { void refresh(); }} />

            {!snapshot.scanning && !snapshot.error && engines.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 mb-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                    <HardDrive size={48} className="text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-300 mb-2">{t('engines.noEngines')}</h3>
                    <p className="text-sm text-slate-500 max-w-md text-center">{t('engines.noEnginesDesc')}</p>
                </div>
            )}

            <div className="space-y-10">
                {groups.map(group => (
                    <section key={group.type} aria-labelledby={`engines-${group.type}`}>
                        <h3 id={`engines-${group.type}`} className="text-xl font-bold text-white mb-4">
                            {t(group.type === 'source' ? 'engines.sourceBuilds' : 'engines.installedBuilds')}
                            <span className="ml-3 text-sm font-medium text-slate-500">{group.engines.length}</span>
                        </h3>
                        {group.engines.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                {t(snapshot.scanning ? 'scan.waiting' : 'engines.noCategoryEngines')}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {group.engines.map((engine) => (
                                    <div
                                        key={engine.path}
                                        className={`
                                            group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden
                                            ${!reduceAnimations ? 'hover:border-[var(--accent-color)]/50 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] hover:shadow-[var(--accent-color)]/10 transition-all duration-500' : ''}
                                        `}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-color)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        <div className="relative z-10 p-6">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`
                                                        w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700
                                                        flex items-center justify-center shadow-lg overflow-hidden p-2.5
                                                        group-hover:border-[var(--accent-color)]/30 group-hover:shadow-[var(--accent-color)]/10
                                                        ${!reduceAnimations ? 'transition-all duration-500' : ''}
                                                    `}>
                                                        <img src="ue-logo.png" alt="UE" className="w-full h-full object-contain filter invert" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Unreal Engine</div>
                                                        <h3 className="text-3xl font-black text-white tracking-tight">{engine.version}</h3>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-6 text-xs text-slate-500 font-mono bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-800 truncate">
                                                <FolderOpen size={12} className="shrink-0 text-slate-600" />
                                                <span className="truncate">{engine.path}</span>
                                            </div>

                                            <button
                                                onClick={() => window.unreal.launchEngine(engine.path)}
                                                className={`
                                                    w-full flex items-center justify-center gap-2
                                                    bg-white text-slate-900
                                                    hover:bg-[var(--accent-color)] hover:text-white
                                                    py-3 rounded-xl font-bold shadow-lg shadow-black/20
                                                    ${!reduceAnimations ? 'transition-all duration-300' : ''}
                                                `}
                                            >
                                                <Play size={18} className="fill-current" />
                                                <span className="text-sm">{t('engines.launch')}</span>
                                            </button>
                            </div>
                        </div>
                    ))}
                            </div>
                        )}
                    </section>
                ))}
            </div>
        </div>
    );
};
