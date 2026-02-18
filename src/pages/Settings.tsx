import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, Trash2, Plus, Globe, Play, FolderOpen, FileText, Code, Eraser, Copy, Settings as SettingsIcon, Tag } from 'lucide-react';

interface ConfigPaths {
    enginePaths: string[];
    projectPaths: string[];
}

interface ContextMenuConfig {
    launch: boolean;
    showInExplorer: boolean;
    showLogs: boolean;
    generateProjectFiles: boolean;
    cleanCache: boolean;
    clone: boolean;
    editConfig: boolean;
    manageTags: boolean;
    removeProject: boolean;
}

const defaultMenuConfig: ContextMenuConfig = {
    launch: true,
    showInExplorer: true,
    showLogs: true,
    generateProjectFiles: true,
    cleanCache: true,
    clone: true,
    editConfig: true,
    manageTags: true,
    removeProject: true
};

const menuItems: { key: keyof ContextMenuConfig; icon: React.ElementType; color: string }[] = [
    { key: 'launch', icon: Play, color: 'text-green-400' },
    { key: 'showInExplorer', icon: FolderOpen, color: 'text-blue-400' },
    { key: 'generateProjectFiles', icon: Code, color: 'text-purple-400' },
    { key: 'showLogs', icon: FileText, color: 'text-slate-400' },
    { key: 'editConfig', icon: SettingsIcon, color: 'text-slate-400' },
    { key: 'manageTags', icon: Tag, color: 'text-orange-400' },
    { key: 'clone', icon: Copy, color: 'text-cyan-400' },
    { key: 'cleanCache', icon: Eraser, color: 'text-yellow-400' },
    { key: 'removeProject', icon: Trash2, color: 'text-red-400' },
];

export const SettingsPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [paths, setPaths] = useState<ConfigPaths>({ enginePaths: [], projectPaths: [] });
    const [loading, setLoading] = useState(true);
    const [menuConfig, setMenuConfig] = useState<ContextMenuConfig>(defaultMenuConfig);

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
        const storedConfig = localStorage.getItem('contextMenuConfig');
        if (storedConfig) {
            setMenuConfig({ ...defaultMenuConfig, ...JSON.parse(storedConfig) });
        }
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

    const toggleContextMenu = (key: keyof ContextMenuConfig) => {
        const newConfig = { ...menuConfig, [key]: !menuConfig[key] };
        setMenuConfig(newConfig);
        localStorage.setItem('contextMenuConfig', JSON.stringify(newConfig));
        window.dispatchEvent(new Event('storage'));
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
                <h3 className="text-lg font-semibold text-slate-200 mb-4">{t('settings.contextMenu')}</h3>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <p className="text-sm text-slate-400 mb-6">{t('settings.contextMenuDesc')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {menuItems.map(({ key, icon: Icon, color }) => {
                            const isActive = menuConfig[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => toggleContextMenu(key)}
                                    className={`
                                        group relative overflow-hidden rounded-lg p-3 text-left transition-all duration-200 text-slate-200 border
                                        ${isActive
                                            ? 'bg-slate-800 border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)]'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 opacity-60 hover:opacity-100'}
                                    `}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`p-2 rounded-md ${isActive ? 'bg-slate-700/50' : 'bg-slate-800'}`}>
                                            <Icon size={18} className={isActive ? color : 'text-slate-500'} />
                                        </div>
                                        <div className={`
                                            w-8 h-4 rounded-full relative transition-colors duration-200
                                            ${isActive ? 'bg-blue-600' : 'bg-slate-700'}
                                        `}>
                                            <div className={`
                                                absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200
                                                ${isActive ? 'translate-x-4' : 'translate-x-0'}
                                            `} />
                                        </div>
                                    </div>
                                    <span className={`text-xs font-medium ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {t(`contextMenu.${key}`)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

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
