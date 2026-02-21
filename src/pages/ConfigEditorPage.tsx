import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Settings, Disc, FileText, Puzzle, Save, Check, Plus, Trash2 } from 'lucide-react';

interface ConfigEditorPageProps {
    projectPath: string;
    projectName: string;
    onBack: () => void;
}

export interface IniProperty {
    id: string;
    type: 'property' | 'comment' | 'blank';
    key?: string;
    value?: string;
    raw?: string;
}

export interface IniSection {
    id: string;
    name: string;
    properties: IniProperty[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const parseIni = (content: string): IniSection[] => {
    const lines = content.split('\n');
    const sections: IniSection[] = [];
    let currentSection: IniSection = { id: generateId(), name: '', properties: [] };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const rawLine = line.endsWith('\r') ? line.slice(0, -1) : line;
        const trimmed = rawLine.trim();

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            if (currentSection.name || currentSection.properties.length > 0) {
                sections.push(currentSection);
            }
            currentSection = {
                id: generateId(),
                name: trimmed.substring(1, trimmed.length - 1),
                properties: []
            };
        } else if (trimmed === '') {
            currentSection.properties.push({ id: generateId(), type: 'blank', raw: rawLine });
        } else if (trimmed.startsWith(';') || trimmed.startsWith('#') || trimmed.startsWith('//')) {
            currentSection.properties.push({ id: generateId(), type: 'comment', raw: rawLine });
        } else {
            const eqIndex = rawLine.indexOf('=');
            if (eqIndex !== -1) {
                const key = rawLine.substring(0, eqIndex).trim();
                const val = rawLine.substring(eqIndex + 1).trim();
                currentSection.properties.push({ id: generateId(), type: 'property', key, value: val, raw: rawLine });
            } else {
                currentSection.properties.push({ id: generateId(), type: 'property', key: rawLine.trim(), value: '', raw: rawLine });
            }
        }
    }

    if (currentSection.name || currentSection.properties.length > 0) {
        sections.push(currentSection);
    }
    return sections;
};

const serializeIni = (sections: IniSection[]): string => {
    let result = '';
    for (const section of sections) {
        if (section.name) {
            result += `[${section.name}]\n`;
        }
        for (const prop of section.properties) {
            if (prop.type === 'blank') {
                result += `\n`;
            } else if (prop.type === 'comment') {
                result += `${prop.raw || ';'}\n`;
            } else if (prop.type === 'property') {
                result += `${prop.key}=${prop.value}\n`;
            }
        }
    }
    return result.trim() + '\n';
};

export const ConfigEditorPage: React.FC<ConfigEditorPageProps> = ({ projectPath, projectName, onBack }) => {
    const { t } = useTranslation();

    const [configFiles, setConfigFiles] = useState<string[]>([]);
    const [selectedTab, setSelectedTab] = useState<'visual' | 'plugins' | string>('visual');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [engineConfig, setEngineConfig] = useState<any>({});

    const [plugins, setPlugins] = useState<{ Name: string, Enabled: boolean }[]>([]);
    const [newPluginName, setNewPluginName] = useState('');

    const [rawContent, setRawContent] = useState('');
    const [parsedIni, setParsedIni] = useState<IniSection[]>([]);
    const [editorMode, setEditorMode] = useState<'structured' | 'raw'>('structured');
    const [hasUnsavedRawChanges, setHasUnsavedRawChanges] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, [projectPath]);

    useEffect(() => {
        if (selectedTab !== 'visual' && selectedTab !== 'plugins') {
            loadRawFile(selectedTab);
        }
    }, [selectedTab]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const files = await window.unreal.getProjectConfigs(projectPath);
            setConfigFiles(files);

            const data = await window.unreal.readIniFile(projectPath);
            setEngineConfig(data);

            const pluginsData = await window.unreal.readUprojectPlugins(projectPath);
            setPlugins(pluginsData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadRawFile = async (fileName: string) => {
        setLoading(true);
        setHasUnsavedRawChanges(false);
        try {
            const content = await window.unreal.readRawIniFile(projectPath, fileName);
            setRawContent(content);
            setParsedIni(parseIni(content));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveVisual = async () => {
        setSaving(true);
        try {
            await window.unreal.writeIniFile(projectPath, engineConfig);
            showSaveSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleSavePlugins = async () => {
        setSaving(true);
        try {
            await window.unreal.writeUprojectPlugins(projectPath, plugins);
            showSaveSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRaw = async () => {
        if (selectedTab === 'visual' || selectedTab === 'plugins') return;
        setSaving(true);
        try {
            const contentToSave = editorMode === 'structured' ? serializeIni(parsedIni) : rawContent;
            await window.unreal.writeRawIniFile(projectPath, selectedTab, contentToSave);

            if (editorMode === 'structured') {
                setRawContent(contentToSave);
            } else {
                setParsedIni(parseIni(contentToSave));
            }

            setHasUnsavedRawChanges(false);
            showSaveSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const switchEditorMode = (newMode: 'structured' | 'raw') => {
        if (newMode === 'structured' && editorMode === 'raw') {
            setParsedIni(parseIni(rawContent));
        } else if (newMode === 'raw' && editorMode === 'structured') {
            setRawContent(serializeIni(parsedIni));
        }
        setEditorMode(newMode);
    };

    const handleStructuredChange = () => {
        setHasUnsavedRawChanges(true);
        setParsedIni([...parsedIni]);
    };

    const showSaveSuccess = () => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    const handleVisualChange = (key: string, value: any) => {
        setEngineConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const Toggle = ({ label, configKey }: { label: string; configKey: string }) => (
        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-sm font-medium text-slate-200">{label}</span>
            <div
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${engineConfig[configKey] ? 'bg-[var(--accent-color)]' : 'bg-slate-700'}`}
                onClick={() => handleVisualChange(configKey, !engineConfig[configKey])}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${engineConfig[configKey] ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-white/5 px-5 py-3.5 bg-gradient-to-r from-slate-900/80 to-slate-950 shrink-0 backdrop-blur-md">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-white active:scale-95"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                        <Settings size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white leading-tight">{t('dialogs.configEditorTitle') || 'Config Editor'}</h2>
                        <p className="text-[11px] text-slate-500 leading-tight">{projectName}</p>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    {saveSuccess && (
                        <span className="text-xs text-green-400 flex items-center gap-1 animate-in fade-in slide-in-from-right-4 duration-300">
                            <Check size={14} /> {t('dialogs.success') || 'Saved!'}
                        </span>
                    )}
                    <button
                        onClick={() => {
                            if (selectedTab === 'visual') handleSaveVisual();
                            else if (selectedTab === 'plugins') handleSavePlugins();
                            else handleSaveRaw();
                        }}
                        disabled={loading || saving || (selectedTab !== 'visual' && selectedTab !== 'plugins' && !hasUnsavedRawChanges)}
                        className="px-4 py-1.5 text-xs font-semibold bg-[var(--accent-color)] hover:opacity-90 text-white rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_var(--accent-color)]/20"
                    >
                        <Save size={14} />
                        {saving ? '...' : (t('config.save') || 'Save')}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex min-h-0 gap-0">
                {/* Sidebar */}
                <div className="hidden md:flex w-64 border-r border-white/5 bg-slate-950 flex-col overflow-y-auto shrink-0 custom-scrollbar">
                    <div className="p-4 space-y-6">
                        {/* Quick Settings */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-1">{t('projects.filters') || 'Settings'}</div>
                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedTab('visual')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200
                                        ${selectedTab === 'visual'
                                            ? 'bg-indigo-500/10 text-indigo-400 font-medium shadow-sm border border-indigo-500/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}
                                >
                                    <Disc size={16} className={selectedTab === 'visual' ? 'text-indigo-400' : 'text-slate-500'} />
                                    <span>{t('config.tabConfig') || 'General / Rendering'}</span>
                                </button>
                                <button
                                    onClick={() => setSelectedTab('plugins')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200
                                        ${selectedTab === 'plugins'
                                            ? 'bg-indigo-500/10 text-indigo-400 font-medium shadow-sm border border-indigo-500/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}
                                >
                                    <Puzzle size={16} className={selectedTab === 'plugins' ? 'text-indigo-400' : 'text-slate-500'} />
                                    <span>{t('config.tabPlugins') || 'Plugins'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Raw config files */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-1">{t('config.rawFiles') || 'Config Files (Raw)'}</div>
                            <div className="space-y-1">
                                {configFiles.length === 0 ? (
                                    <div className="px-3 text-xs text-slate-600 italic">{t('config.noConfigFiles') || 'No config files found.'}</div>
                                ) : (
                                    configFiles.map(file => (
                                        <button
                                            key={file}
                                            onClick={() => setSelectedTab(file)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200
                                                ${selectedTab === file
                                                    ? 'bg-blue-500/10 text-blue-400 font-medium shadow-sm border border-blue-500/20'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}
                                        >
                                            <FileText size={16} className={selectedTab === file ? 'text-blue-400' : 'text-slate-600'} />
                                            <span className="truncate">{file}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto bg-slate-900/40 relative flex flex-col custom-scrollbar">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center z-50">
                            <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-[var(--accent-color)]"></div>
                                <span className="text-sm font-medium text-slate-500">{t('config.loading') || 'Loading...'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full h-full animate-in fade-in duration-300">
                            {selectedTab === 'visual' && (
                                <div className="space-y-8 pb-12">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-2">{t('config.visualTitle') || 'Visual & Rendering Settings'}</h3>
                                        <p className="text-sm text-slate-400 mb-6">{t('config.visualDesc') || 'Modify common engine settings. These changes are saved directly to DefaultEngine.ini.'}</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t('config.rendering') || 'Rendering Options'}</h4>
                                                <Toggle label={t('config.rayTracing') || 'Ray Tracing'} configKey="rayTracing" />
                                                <Toggle label={t('config.lumen') || 'Lumen'} configKey="lumen" />
                                                <Toggle label={t('config.nanite') || 'Nanite'} configKey="nanite" />
                                                <Toggle label={t('config.virtualShadowMaps') || 'Virtual Shadow Maps'} configKey="virtualShadowMaps" />
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t('config.graphics') || 'Graphics Options'}</h4>

                                                <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-2">
                                                    <label className="text-sm font-medium text-slate-200">{t('config.antiAliasing') || 'Anti-Aliasing Method'}</label>
                                                    <select
                                                        value={engineConfig.antiAliasing ?? 4}
                                                        onChange={(e) => handleVisualChange('antiAliasing', parseInt(e.target.value))}
                                                        className="w-full bg-slate-950 text-white border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--accent-color)] appearance-none cursor-pointer"
                                                    >
                                                        <option value={0}>{t('config.aaNone') || 'None'}</option>
                                                        <option value={1}>FXAA</option>
                                                        <option value={2}>TAA</option>
                                                        <option value={4}>TSR</option>
                                                    </select>
                                                </div>

                                                <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-2">
                                                    <label className="text-sm font-medium text-slate-200">{t('config.rhi') || 'Target RHI'}</label>
                                                    <select
                                                        value={engineConfig.rhi || 'DefaultGraphicsRHI_DX12'}
                                                        onChange={(e) => handleVisualChange('rhi', e.target.value)}
                                                        className="w-full bg-slate-950 text-white border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--accent-color)] appearance-none cursor-pointer"
                                                    >
                                                        <option value="DefaultGraphicsRHI_DX11">DirectX 11</option>
                                                        <option value="DefaultGraphicsRHI_DX12">{t('config.dx12') || 'DirectX 12'}</option>
                                                        <option value="DefaultGraphicsRHI_Vulkan">Vulkan</option>
                                                    </select>
                                                </div>

                                                <Toggle label="VSync" configKey="vsync" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedTab === 'plugins' && (
                                <div className="space-y-6 pb-12 flex flex-col h-full">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-2">{t('config.pluginsTitle') || 'Project Plugins'}</h3>
                                        <p className="text-sm text-slate-400">{t('config.pluginsDesc') || 'Manage explicitly enabled or disabled plugins for this project.'}</p>
                                    </div>

                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            placeholder={t('config.pluginNamePlaceholder') || 'Plugin Name (e.g. Water)'}
                                            value={newPluginName}
                                            onChange={(e) => setNewPluginName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newPluginName.trim()) {
                                                    const name = newPluginName.trim();
                                                    if (!plugins.find(p => p.Name.toLowerCase() === name.toLowerCase())) {
                                                        setPlugins([{ Name: name, Enabled: true }, ...plugins]);
                                                    }
                                                    setNewPluginName('');
                                                }
                                            }}
                                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent-color)] shadow-inner"
                                        />
                                        <button
                                            onClick={() => {
                                                if (newPluginName.trim()) {
                                                    const name = newPluginName.trim();
                                                    if (!plugins.find(p => p.Name.toLowerCase() === name.toLowerCase())) {
                                                        setPlugins([{ Name: name, Enabled: true }, ...plugins]);
                                                    }
                                                    setNewPluginName('');
                                                }
                                            }}
                                            className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors border border-white/5"
                                        >
                                            {t('config.addPlugin') || 'Add Plugin'}
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-8">
                                        {plugins.length === 0 ? (
                                            <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-2xl border-dashed">
                                                <Puzzle size={32} className="mx-auto text-slate-600 mb-3" />
                                                <div className="text-slate-400 font-medium">{t('config.noPlugins') || 'No explicitly configured plugins.'}</div>
                                                <div className="text-slate-500 text-xs mt-1">{t('config.noPluginsDesc') || 'Add a plugin name above to enable or disable it specifically for this project.'}</div>
                                            </div>
                                        ) : (
                                            plugins.map((plugin, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:bg-slate-900/80 transition-colors">
                                                    <span className="font-semibold text-slate-200">{plugin.Name}</span>
                                                    <div
                                                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 shadow-inner ${plugin.Enabled ? 'bg-[var(--accent-color)]' : 'bg-slate-700'}`}
                                                        onClick={() => {
                                                            const p = [...plugins];
                                                            p[index].Enabled = !p[index].Enabled;
                                                            setPlugins(p);
                                                        }}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${plugin.Enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedTab !== 'visual' && selectedTab !== 'plugins' && (
                                <div className="flex-1 flex flex-col h-full bg-slate-950 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                                    <div className="px-4 py-2 border-b border-white/5 bg-slate-900/50 flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs text-slate-400">{selectedTab}</span>
                                            {hasUnsavedRawChanges && <span className="text-[10px] uppercase font-bold text-[var(--accent-color)] tracking-wider">{t('config.unsavedChanges') || 'Unsaved Changes'}</span>}
                                        </div>
                                        <div className="flex bg-slate-950 rounded-lg p-1 border border-white/5">
                                            <button
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${editorMode === 'structured' ? 'bg-[var(--accent-color)] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                                onClick={() => switchEditorMode('structured')}
                                            >
                                                {t('config.structured') || 'Structured'}
                                            </button>
                                            <button
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${editorMode === 'raw' ? 'bg-[var(--accent-color)] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                                onClick={() => switchEditorMode('raw')}
                                            >
                                                {t('config.rawText') || 'Raw Text'}
                                            </button>
                                        </div>
                                    </div>

                                    {editorMode === 'raw' ? (
                                        <textarea
                                            className="flex-1 w-full bg-transparent text-slate-300 font-mono text-xs sm:text-sm p-4 focus:outline-none resize-none custom-scrollbar leading-relaxed"
                                            value={rawContent}
                                            onChange={(e) => {
                                                setRawContent(e.target.value);
                                                setHasUnsavedRawChanges(true);
                                            }}
                                            spellCheck={false}
                                        />
                                    ) : (
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                                            {parsedIni.length === 0 ? (
                                                <div className="text-center py-12 text-slate-500 text-sm">{t('config.emptyFile') || 'File is empty or could not be parsed.'}</div>
                                            ) : (
                                                parsedIni.map((section, sIndex) => (
                                                    <div key={section.id} className="bg-slate-900/40 rounded-xl border border-white/5 overflow-hidden">
                                                        <div className="bg-slate-900/80 px-4 py-2 border-b border-white/5 flex justify-between items-center group">
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <span className="text-slate-500 font-mono text-sm">[</span>
                                                                <input
                                                                    type="text"
                                                                    value={section.name}
                                                                    onChange={(e) => {
                                                                        const p = [...parsedIni];
                                                                        p[sIndex].name = e.target.value;
                                                                        setParsedIni(p);
                                                                        handleStructuredChange();
                                                                    }}
                                                                    className="bg-transparent text-indigo-400 font-bold font-mono text-sm focus:outline-none min-w-[50px] flex-grow"
                                                                    placeholder={t('config.sectionName') || 'SectionName'}
                                                                />
                                                                <span className="text-slate-500 font-mono text-sm">]</span>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const p = [...parsedIni];
                                                                    p.splice(sIndex, 1);
                                                                    setParsedIni(p);
                                                                    handleStructuredChange();
                                                                }}
                                                                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                                title={t('config.deleteSection') || 'Delete Section'}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="p-2 space-y-1">
                                                            {section.properties.map((prop, pIndex) => (
                                                                <div key={prop.id} className="flex items-center gap-2 group/prop px-2 py-0.5 rounded-lg hover:bg-white/[0.02]">
                                                                    {prop.type === 'comment' ? (
                                                                        <input
                                                                            type="text"
                                                                            value={prop.raw || ''}
                                                                            onChange={(e) => {
                                                                                const p = [...parsedIni];
                                                                                p[sIndex].properties[pIndex].raw = e.target.value;
                                                                                setParsedIni(p);
                                                                                handleStructuredChange();
                                                                            }}
                                                                            className="flex-1 bg-transparent text-green-500/70 font-mono text-xs italic px-2 py-1 focus:outline-none focus:bg-white/5 rounded"
                                                                        />
                                                                    ) : prop.type === 'blank' ? (
                                                                        <div className="h-4 w-full"></div>
                                                                    ) : (
                                                                        <div className="flex flex-1 gap-2 items-center">
                                                                            <input
                                                                                type="text"
                                                                                value={prop.key || ''}
                                                                                onChange={(e) => {
                                                                                    const p = [...parsedIni];
                                                                                    p[sIndex].properties[pIndex].key = e.target.value;
                                                                                    setParsedIni(p);
                                                                                    handleStructuredChange();
                                                                                }}
                                                                                className="w-1/3 bg-white/[0.03] border border-transparent focus:border-white/10 text-blue-300 font-mono text-xs px-2 py-1.5 rounded outline-none"
                                                                                placeholder={t('config.key') || 'Key'}
                                                                            />
                                                                            <span className="text-slate-600 font-mono text-xs">=</span>
                                                                            {prop.value?.toLowerCase() === 'true' || prop.value?.toLowerCase() === 'false' ? (
                                                                                <div className="flex bg-slate-900 rounded-lg p-1 border border-white/5 mx-1">
                                                                                    <button
                                                                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${prop.value?.toLowerCase() === 'true' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                                                                                        onClick={() => {
                                                                                            const p = [...parsedIni];
                                                                                            p[sIndex].properties[pIndex].value = prop.value?.toLowerCase() === 'true' ? 'False' : 'True'; // Keep original case if possible, but Unreal defaults to True/False usually. Let's strictly use True/False for toggles to be safe.
                                                                                            // Actually let's just force pascal case 'True'/'False'
                                                                                            p[sIndex].properties[pIndex].value = 'True';
                                                                                            setParsedIni(p);
                                                                                            handleStructuredChange();
                                                                                        }}
                                                                                    >
                                                                                        True
                                                                                    </button>
                                                                                    <button
                                                                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${prop.value?.toLowerCase() === 'false' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                                                                                        onClick={() => {
                                                                                            const p = [...parsedIni];
                                                                                            p[sIndex].properties[pIndex].value = 'False';
                                                                                            setParsedIni(p);
                                                                                            handleStructuredChange();
                                                                                        }}
                                                                                    >
                                                                                        False
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    value={prop.value || ''}
                                                                                    onChange={(e) => {
                                                                                        const p = [...parsedIni];
                                                                                        p[sIndex].properties[pIndex].value = e.target.value;
                                                                                        setParsedIni(p);
                                                                                        handleStructuredChange();
                                                                                    }}
                                                                                    className="flex-1 bg-white/[0.03] border border-transparent focus:border-[var(--accent-color)] focus:bg-white/10 text-slate-300 font-mono text-xs px-2 py-1.5 rounded outline-none"
                                                                                    placeholder={t('config.value') || 'Value'}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {prop.type !== 'blank' && (
                                                                        <div className="flex gap-1 ml-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const p = [...parsedIni];
                                                                                    p[sIndex].properties.splice(pIndex, 1);
                                                                                    setParsedIni(p);
                                                                                    handleStructuredChange();
                                                                                }}
                                                                                className="text-slate-600 hover:text-red-400 opacity-0 group-hover/prop:opacity-100 transition-opacity p-1"
                                                                                title={t('config.deleteProperty') || 'Delete Property'}
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}

                                                            <div className="pt-2 px-3">
                                                                <button
                                                                    onClick={() => {
                                                                        const p = [...parsedIni];
                                                                        p[sIndex].properties.push({ id: generateId(), type: 'property', key: '', value: '' });
                                                                        setParsedIni(p);
                                                                        handleStructuredChange();
                                                                    }}
                                                                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-400 transition-colors py-1"
                                                                >
                                                                    <Plus size={12} /> {t('config.addProperty') || 'Add Property'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}

                                            <div className="pt-4 flex justify-center">
                                                <button
                                                    onClick={() => {
                                                        const p = [...parsedIni];
                                                        p.push({ id: generateId(), name: 'NewSection', properties: [] });
                                                        setParsedIni(p);
                                                        handleStructuredChange();
                                                    }}
                                                    className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-white/10 transition-all rounded-lg px-6 py-2 shadow-lg"
                                                >
                                                    <Plus size={16} /> {t('config.addNewSection') || 'Add New Section'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
