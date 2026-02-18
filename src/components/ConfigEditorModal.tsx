import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Disc } from 'lucide-react';

interface ConfigEditorModalProps {
    projectPath: string;
    onClose: () => void;
}

export const ConfigEditorModal: React.FC<ConfigEditorModalProps> = ({ projectPath, onClose }) => {
    const { t } = useTranslation();
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig();
    }, [projectPath]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await window.unreal.readIniFile(projectPath);
            setConfig(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await window.unreal.writeIniFile(projectPath, config);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    if (!projectPath) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Disc className="text-primary" />
                    {t('dialogs.configEditorTitle')}
                </h3>

                {loading ? (
                    <div className="text-center py-8 text-slate-400">Loading config...</div>
                ) : (
                    <div className="space-y-4">
                        {/* Ray Tracing Toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                            <span className="text-sm font-medium text-slate-200">{t('config.rayTracing')}</span>
                            <div
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${config.rayTracing ? 'bg-primary' : 'bg-slate-600'}`}
                                onClick={() => handleChange('rayTracing', !config.rayTracing)}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${config.rayTracing ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>

                        {/* RHI Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('config.rhi')}</label>
                            <select
                                value={config.rhi || 'DefaultGraphicsRHI_DX12'}
                                onChange={(e) => handleChange('rhi', e.target.value)}
                                className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                            >
                                <option value="DefaultGraphicsRHI_DX11">DirectX 11</option>
                                <option value="DefaultGraphicsRHI_DX12">{t('config.dx12')}</option>
                                <option value="DefaultGraphicsRHI_Vulkan">Vulkan</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-800">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                        {t('config.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="px-4 py-2 text-sm bg-primary hover:bg-primary/80 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : t('config.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
