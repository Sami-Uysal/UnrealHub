import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, Trash2, Plus, Globe } from 'lucide-react';

interface ConfigPaths {
    enginePaths: string[];
    projectPaths: string[];
}

export const SettingsPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [paths, setPaths] = useState<ConfigPaths>({ enginePaths: [], projectPaths: [] });
    const [loading, setLoading] = useState(true);

    const loadPaths = async () => {
        try {
            const data = await window.unreal.getConfigPaths();
            setPaths(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPaths();
    }, []);

    const handleAddEnginePath = async () => {
        const added = await window.unreal.addEnginePath();
        if (added) await loadPaths();
    };

    const handleAddProjectPath = async () => {
        const added = await window.unreal.addProjectPath();
        if (added) await loadPaths();
    };

    const handleRemovePath = async (type: 'engine' | 'project', path: string) => {
        await window.unreal.removePath(type, path);
        await loadPaths();
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('i18nextLng', lng);
    };

    if (loading) return <div className="text-slate-400">{t('git.loading')}</div>;

    const PathSection = ({ title, type, items, onAdd, onRemove }: { title: string, type: 'engine' | 'project', items: string[], onAdd: () => void, onRemove: (t: any, p: string) => void }) => (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
                <button
                    onClick={onAdd}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                >
                    <Plus size={16} />
                    <span>{t('settings.addFolder')}</span>
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                {items.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                        {t('settings.noFolders')}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {items.map((path) => (
                            <div key={path} className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <Folder size={18} className="text-slate-500" />
                                    <span className="font-mono text-sm max-w-[400px] truncate" title={path}>{path}</span>
                                </div>
                                <button
                                    onClick={() => onRemove(type, path)}
                                    className="text-slate-500 hover:text-red-400 p-2 rounded-md hover:bg-slate-800 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
                {type === 'engine'
                    ? t('settings.engineDesc')
                    : t('settings.projectDesc')}
            </p>
        </div>
    );

    return (
        <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-white mb-8">{t('settings.title')}</h2>

            <div className="mb-10">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">{t('settings.appearance')}</h3>
                <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Globe className="text-slate-400" size={20} />
                        <div>
                            <h4 className="text-slate-200 font-medium">{t('settings.language')}</h4>
                            <p className="text-xs text-slate-500 mt-1">{t('settings.selectLanguage')}</p>
                        </div>
                    </div>
                    <div className="flex bg-slate-800 p-1 rounded-md">
                        <button
                            onClick={() => changeLanguage('tr')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${i18n.language === 'tr' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Türkçe
                        </button>
                        <button
                            onClick={() => changeLanguage('en')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${i18n.language === 'en' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            English
                        </button>
                    </div>
                </div>
            </div>

            <PathSection
                title={t('settings.enginePaths')}
                type="engine"
                items={paths.enginePaths}
                onAdd={handleAddEnginePath}
                onRemove={handleRemovePath}
            />

            <PathSection
                title={t('settings.projectPaths')}
                type="project"
                items={paths.projectPaths}
                onAdd={handleAddProjectPath}
                onRemove={handleRemovePath}
            />

            <div className="mb-10 pt-6 border-t border-slate-800">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">{t('settings.extraSettings')}</h3>
                <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg">
                    <div>
                        <h4 className="text-slate-200 font-medium">{t('settings.gitIntegration')}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                            {t('settings.gitIntegrationDesc')}
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={localStorage.getItem('showGitIntegration') !== 'false'}
                            onChange={(e) => {
                                localStorage.setItem('showGitIntegration', e.target.checked.toString());
                                window.dispatchEvent(new Event('storage'));
                                window.location.reload();
                            }}
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
        </div>
    );
};
