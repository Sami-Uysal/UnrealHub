import React, { useEffect, useState } from 'react';
import { Folder, Trash2, Plus } from 'lucide-react';

interface ConfigPaths {
    enginePaths: string[];
    projectPaths: string[];
}

export const SettingsPage: React.FC = () => {
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

    if (loading) return <div className="text-slate-400">Ayarlar yükleniyor...</div>;

    const PathSection = ({ title, type, items, onAdd, onRemove }: { title: string, type: 'engine' | 'project', items: string[], onAdd: () => void, onRemove: (t: any, p: string) => void }) => (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
                <button
                    onClick={onAdd}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                >
                    <Plus size={16} />
                    <span>Klasör Ekle</span>
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                {items.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                        Henüz eklenmiş bir klasör yok.
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
                    ? "Bu klasörlerdeki Unreal Engine kurulumları otomatik taranır."
                    : "Bu klasörlerdeki projeler (.uproject) otomatik taranır."}
            </p>
        </div>
    );

    return (
        <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-white mb-8">Ayarlar</h2>

            <PathSection
                title="Motor Arama Klasörleri"
                type="engine"
                items={paths.enginePaths}
                onAdd={handleAddEnginePath}
                onRemove={handleRemovePath}
            />

            <PathSection
                title="Proje Arama Klasörleri"
                type="project"
                items={paths.projectPaths}
                onAdd={handleAddProjectPath}
                onRemove={handleRemovePath}
            />
        </div>
    );
};
