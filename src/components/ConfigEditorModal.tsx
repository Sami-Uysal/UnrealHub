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

    const Toggle = ({ label, configKey }: { label: string; configKey: string }) => (
        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-sm font-medium text-slate-200">{label}</span>
            <div
                className={`w-11 h-[22px] rounded-full p-[3px] cursor-pointer transition-colors duration-300 ${config[configKey] ? 'bg-[var(--accent-color)]' : 'bg-slate-600'}`}
                onClick={() => handleChange(configKey, !config[configKey])}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${config[configKey] ? 'translate-x-[18px]' : 'translate-x-0'}`} />
            </div>
        </div>
    );

    if (!projectPath) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[440px] shadow-2xl relative max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Disc className="text-[var(--accent-color)]" />
                    {t('dialogs.configEditorTitle')}
                </h3>

                {loading ? (
                    <div className="text-center py-8 text-slate-400">{t('config.loading')}</div>
                ) : (
                    <div className="space-y-5">
                        {/* Rendering Section */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">{t('config.rendering')}</h4>
                            <div className="space-y-2">
                                <Toggle label={t('config.rayTracing')} configKey="rayTracing" />
                                <Toggle label={t('config.lumen')} configKey="lumen" />
                                <Toggle label={t('config.nanite')} configKey="nanite" />
                                <Toggle label={t('config.virtualShadowMaps')} configKey="virtualShadowMaps" />
                            </div>
                        </div>

                        {/* Graphics Section */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">{t('config.graphics')}</h4>
                            <div className="space-y-2">
                                {/* Anti-Aliasing */}
                                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-1.5">
                                    <label className="text-sm font-medium text-slate-200">{t('config.antiAliasing')}</label>
                                    <select
                                        value={config.antiAliasing ?? 4}
                                        onChange={(e) => handleChange('antiAliasing', parseInt(e.target.value))}
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-[var(--accent-color)] appearance-none cursor-pointer"
                                    >
                                        <option value={0}>{t('config.aaNone')}</option>
                                        <option value={1}>FXAA</option>
                                        <option value={2}>TAA</option>
                                        <option value={4}>TSR</option>
                                    </select>
                                </div>

                                {/* RHI */}
                                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-1.5">
                                    <label className="text-sm font-medium text-slate-200">{t('config.rhi')}</label>
                                    <select
                                        value={config.rhi || 'DefaultGraphicsRHI_DX12'}
                                        onChange={(e) => handleChange('rhi', e.target.value)}
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-[var(--accent-color)] appearance-none cursor-pointer"
                                    >
                                        <option value="DefaultGraphicsRHI_DX11">DirectX 11</option>
                                        <option value="DefaultGraphicsRHI_DX12">{t('config.dx12')}</option>
                                        <option value="DefaultGraphicsRHI_Vulkan">Vulkan</option>
                                    </select>
                                </div>

                                <Toggle label="VSync" configKey="vsync" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-800">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                        {t('config.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="px-4 py-2 text-sm bg-[var(--accent-color)] hover:opacity-80 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={16} />
                        {saving ? '...' : t('config.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
