import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Package, FolderOpen, ChevronDown, Box, Grid3X3, List, RefreshCw, LogIn, LogOut, Library, User, Globe, X, Download, Plus } from 'lucide-react';
import { useAppearance } from '../context/AppearanceContext';
import { VaultAssetInfo, EpicLibraryItem } from '../types';

type Tab = 'vault' | 'library';
type LibrarySort = 'az' | 'za' | 'newest' | 'developer';

export const MarketplacePage: React.FC = () => {
    const { t } = useTranslation();
    const { reduceAnimations } = useAppearance();

    const [activeTab, setActiveTab] = useState<Tab>('library');

    // Vault state
    const [vaultAssets, setVaultAssets] = useState<VaultAssetInfo[]>([]);
    const [vaultSearch, setVaultSearch] = useState('');
    const [vaultLoading, setVaultLoading] = useState(false);
    const [vaultView, setVaultView] = useState<'grid' | 'list'>('grid');

    // Epic Library state
    const [epicLoggedIn, setEpicLoggedIn] = useState(false);
    const [epicDisplayName, setEpicDisplayName] = useState('');
    const [epicLoginLoading, setEpicLoginLoading] = useState(false);
    const [libraryItems, setLibraryItems] = useState<EpicLibraryItem[]>([]);
    const [librarySearch, setLibrarySearch] = useState('');
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [librarySort, setLibrarySort] = useState<LibrarySort>('az');
    const [libraryRefreshing, setLibraryRefreshing] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<EpicLibraryItem | null>(null);
    const [assetTab, setAssetTab] = useState<'description' | 'technical' | 'images'>('description');

    // Download & Install State
    const [installModalOpen, setInstallModalOpen] = useState(false);
    const [installTargetId, setInstallTargetId] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0); 
    const [downloadStats, setDownloadStats] = useState({ downloadedMB: 0, totalMB: 0 });
    const [downloadingAsset, setDownloadingAsset] = useState<EpicLibraryItem | null>(null);

    // Local Hub State (for deployment)
    const [localProjects, setLocalProjects] = useState<{id: string, name: string, version: string}[]>([]);
    const [localEngines, setLocalEngines] = useState<{version: string, path: string}[]>([]);

    useEffect(() => {
        window.unreal.getProjects().then(setLocalProjects).catch(console.error);
        window.unreal.getEngines().then(setLocalEngines).catch(console.error);
    }, []);

    // Check Epic auth status on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const status = await window.unreal.epicAuthStatus();
                setEpicLoggedIn(status.loggedIn);
                if (status.displayName) setEpicDisplayName(status.displayName);
            } catch { /* ignore */ }
        };
        checkAuth();
    }, []);

    // Load library: cache-first, then background refresh
    useEffect(() => {
        if (activeTab !== 'library' || !epicLoggedIn) return;
        loadLibraryCacheFirst();
    }, [activeTab, epicLoggedIn]);

    // Filtered vault
    const filteredVault = useMemo(() => {
        if (!vaultSearch) return vaultAssets;
        const q = vaultSearch.toLowerCase();
        return vaultAssets.filter(a =>
            a.title.toLowerCase().includes(q) ||
            a.appName.toLowerCase().includes(q)
        );
    }, [vaultAssets, vaultSearch]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };


    const handleEpicLogin = async () => {
        setEpicLoginLoading(true);
        try {
            const result = await window.unreal.epicLogin();
            if (result.success) {
                setEpicLoggedIn(true);
                if (result.displayName) setEpicDisplayName(result.displayName);
            }
        } catch (e) {
            console.error('Epic login failed:', e);
        } finally {
            setEpicLoginLoading(false);
        }
    };

    const handleEpicLogout = async () => {
        await window.unreal.epicLogout();
        setEpicLoggedIn(false);
        setEpicDisplayName('');
        setLibraryItems([]);
    };

    const loadLibraryCacheFirst = async () => {
        // 1. Try loading from cache (instant)
        try {
            const cached = await window.unreal.epicGetLibraryCached();
            if (cached.cached && cached.items.length > 0) {
                setLibraryItems(cached.items);
                // Background refresh silently
                setLibraryRefreshing(true);
                window.unreal.epicGetLibrary().then(result => {
                    if (!result.error && result.items.length > 0) {
                        setLibraryItems(result.items);
                    }
                }).catch(() => {}).finally(() => setLibraryRefreshing(false));
                return;
            }
        } catch { /* no cache */ }

        // 2. No cache — full load with spinner
        loadLibrary();
    };

    const loadLibrary = async () => {
        setLibraryLoading(true);
        try {
            const result = await window.unreal.epicGetLibrary();
            if (!result.error) {
                setLibraryItems(result.items);
            } else if (result.error === 'not_logged_in') {
                setEpicLoggedIn(false);
            }
        } catch (e) {
            console.error('Failed to load library:', e);
        } finally {
            setLibraryLoading(false);
        }
    };

    // Filtered + sorted library
    const filteredLibrary = useMemo(() => {
        let result = libraryItems;
        if (librarySearch) {
            const q = librarySearch.toLowerCase();
            result = result.filter(item =>
                item.title.toLowerCase().includes(q) ||
                item.appName.toLowerCase().includes(q) ||
                item.categories.toLowerCase().includes(q) ||
                item.developer.toLowerCase().includes(q)
            );
        }
        // Apply sort
        const sorted = [...result];
        switch (librarySort) {
            case 'az':
                sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
                break;
            case 'za':
                sorted.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: 'base' }));
                break;
            case 'newest':
                sorted.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
                break;
            case 'developer':
                sorted.sort((a, b) => (a.developer || 'zzz').localeCompare(b.developer || 'zzz', undefined, { sensitivity: 'base' }));
                break;
        }
        return sorted;
    }, [libraryItems, librarySearch, librarySort]);

    const getAssetInstallInfo = (item: EpicLibraryItem) => {
        const cats = item.categories?.toLowerCase() || '';
        if (cats.includes('projects') || cats.includes('tutorials-examples')) return t('marketplace.createProject', 'Create Project');
        if (cats.includes('plugins') || cats.includes('engine') || item.namespace !== 'ue') return t('marketplace.installEngine', 'Install to engine');
        return t('marketplace.installProject', 'Install into a project');
    };

    const handleDownloadClick = () => {
        if (!selectedAsset) return;
        setInstallModalOpen(true);
    };

    const fetchVaultAssets = async () => {
        setVaultLoading(true);
        try {
            const assets = await window.unreal.getVaultAssets();
            setVaultAssets(assets);
        } catch (e) {
            console.error('Failed to load vault assets', e);
        } finally {
            setVaultLoading(false);
        }
    };

    // Real Download Handler
    useEffect(() => {
        window.unreal.onDownloadAssetProgress((payload) => {
            if (payload.status === 'completed') {
                setIsDownloading(false);
                setDownloadingAsset(null);
                setDownloadProgress(0);
                // Refresh vault
                fetchVaultAssets();
            } else if (payload.status === 'error' || payload.error === 'aborted') {
                setIsDownloading(false);
                setDownloadingAsset(null);
                setDownloadProgress(0);
                if (payload.error !== 'aborted') {
                    console.error('Download error:', payload.error);
                }
            } else if (payload.status === 'downloading_files') {
                setDownloadStats({ downloadedMB: payload.downloadedMB || 0, totalMB: payload.totalMB || 0 });
                setDownloadProgress(payload.percent || 0);
            }
        });
    }, []);

    const startAssetDownload = async () => {
        setInstallModalOpen(false);
        if (!selectedAsset) return;

        setDownloadingAsset(selectedAsset);
        setIsDownloading(true);
        setDownloadProgress(0);
        setDownloadStats({ downloadedMB: 0, totalMB: 0 });

        try {
            console.log(`Starting real download for: ${selectedAsset.title}`);
            const result = await window.unreal.epicDownloadAsset(
                selectedAsset.namespace, 
                selectedAsset.catalogItemId || selectedAsset.id, 
                selectedAsset.appName,
                selectedAsset.title
            );
            
            if (result.error) {
                console.error('Download failed to start:', result.error);
                setIsDownloading(false);
                setDownloadingAsset(null);
            }
        } catch (e) {
            console.error('Download error:', e);
            setIsDownloading(false);
            setDownloadingAsset(null);
        }
    };

    const cancelDownload = async () => {
        await window.unreal.epicCancelDownload();
        setIsDownloading(false);
        setDownloadingAsset(null);
        setDownloadProgress(0);
    };

    return (
        <div className="flex-1 min-h-0 relative flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-white tracking-tight">
                    {t('marketplace.title', 'MARKETPLACE')}
                </h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('vault')}
                    className={`
                        flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
                        ${!reduceAnimations ? 'transition-all duration-300' : ''}
                        ${activeTab === 'vault'
                            ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[var(--accent-color)]/20'
                            : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                        }
                    `}
                >
                    <Box size={16} />
                    {t('marketplace.vault', 'Vault Cache')}
                    {vaultAssets.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[11px] font-bold">
                            {vaultAssets.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    className={`
                        flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
                        ${!reduceAnimations ? 'transition-all duration-300' : ''}
                        ${activeTab === 'library'
                            ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[var(--accent-color)]/20'
                            : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                        }
                    `}
                >
                    <Library size={16} />
                    {t('marketplace.library', 'My Library')}
                    {epicLoggedIn && libraryItems.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[11px] font-bold">
                            {libraryItems.length}
                        </span>
                    )}
                </button>

                {/* Epic Account indicator */}
                {epicLoggedIn && (
                    <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                        <User size={12} className="text-emerald-400" />
                        <span>{epicDisplayName}</span>
                    </div>
                )}
            </div>

            {/* Tab Content */}
            {activeTab === 'vault' ? (
                /* Vault Tab */
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Vault Search + View Toggle */}
                    <div className="flex items-center gap-3 mb-6 shrink-0">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={vaultSearch}
                                onChange={e => setVaultSearch(e.target.value)}
                                placeholder={t('marketplace.searchVault', 'Search vault assets...')}
                                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent-color)]/50"
                            />
                        </div>
                        <div className="flex bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setVaultView('grid')}
                                className={`p-2.5 ${vaultView === 'grid' ? 'bg-[var(--accent-color)] text-white' : 'text-slate-400 hover:text-white'} ${!reduceAnimations ? 'transition-colors duration-200' : ''}`}
                            >
                                <Grid3X3 size={16} />
                            </button>
                            <button
                                onClick={() => setVaultView('list')}
                                className={`p-2.5 ${vaultView === 'list' ? 'bg-[var(--accent-color)] text-white' : 'text-slate-400 hover:text-white'} ${!reduceAnimations ? 'transition-colors duration-200' : ''}`}
                            >
                                <List size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                setVaultLoading(true);
                                window.unreal.getVaultAssets().then(d => { setVaultAssets(d); setVaultLoading(false); }).catch(() => setVaultLoading(false));
                            }}
                            className={`p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-[var(--accent-color)]/50 ${!reduceAnimations ? 'transition-all duration-300' : ''}`}
                        >
                            <RefreshCw size={16} className={vaultLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {vaultLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                                    <span className="text-slate-400 text-sm font-medium">{t('marketplace.scanningVault', 'Scanning vault cache...')}</span>
                                </div>
                            </div>
                        ) : filteredVault.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                            <Box size={48} className="text-slate-700 mb-4" />
                            <h3 className="text-lg font-bold text-slate-300 mb-2">{t('marketplace.noVault', 'No Vault Assets Found')}</h3>
                            <p className="text-sm text-slate-500 max-w-md text-center">
                                {t('marketplace.noVaultDesc', 'Vault cache is empty or not found. Assets downloaded from the Epic Games Launcher will appear here.')}
                            </p>
                            <div className="mt-4 text-xs text-slate-600 font-mono bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg">
                                C:\ProgramData\Epic\EpicGamesLauncher\VaultCache
                            </div>
                        </div>
                    ) : vaultView === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredVault.map(asset => (
                                <div
                                    key={asset.id}
                                    className={`
                                        group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden
                                        ${!reduceAnimations ? 'hover:border-[var(--accent-color)]/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-500' : ''}
                                    `}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-color)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative z-10 h-32 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                        <Box size={40} className={`text-slate-700 ${!reduceAnimations ? 'group-hover:text-[var(--accent-color)]/40 transition-colors duration-500' : ''}`} />
                                    </div>
                                    <div className="relative z-10 p-4">
                                        <h4 className="text-sm font-bold text-white truncate mb-1">{asset.title}</h4>
                                        <div className="text-[11px] text-slate-500 font-mono truncate mb-3">{asset.appName}</div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">{asset.buildVersion || 'Unknown version'}</span>
                                            {asset.sizeBytes > 0 && (
                                                <span className="text-slate-600 font-medium">{formatBytes(asset.sizeBytes)}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => window.unreal.showPluginInExplorer(asset.installPath)}
                                            className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 ${!reduceAnimations ? 'transition-all duration-200' : ''}`}
                                        >
                                            <FolderOpen size={12} />
                                            {t('marketplace.openFolder', 'Open Folder')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredVault.map(asset => (
                                <div key={asset.id} className={`flex items-center gap-4 bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 ${!reduceAnimations ? 'hover:border-slate-700 transition-all duration-300' : ''}`}>
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                        <Box size={18} className="text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-semibold text-white truncate block">{asset.title}</span>
                                        <span className="text-xs text-slate-500 font-mono truncate block">{asset.appName}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 shrink-0">{asset.buildVersion}</span>
                                    {asset.sizeBytes > 0 && (
                                        <span className="text-xs text-slate-600 font-medium shrink-0">{formatBytes(asset.sizeBytes)}</span>
                                    )}
                                    <button onClick={() => window.unreal.showPluginInExplorer(asset.installPath)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                                        <FolderOpen size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    </div>
                </div>
            ) : (
                /* My Library Tab */
                <div className="flex flex-col h-full min-h-0 flex-1">
                    {!epicLoggedIn ? (
                        /* Not Logged In */
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                <Globe size={36} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{t('marketplace.loginTitle', 'Connect Your Epic Account')}</h3>
                            <p className="text-sm text-slate-400 max-w-lg text-center mb-6 leading-relaxed">
                                {t('marketplace.loginDesc', 'Sign in with your Epic Games account to browse all your owned assets and plugins — including items not yet installed.')}
                            </p>
                            <button
                                onClick={handleEpicLogin}
                                disabled={epicLoginLoading}
                                className={`
                                    flex items-center gap-3 px-8 py-3.5 rounded-2xl font-bold text-sm
                                    bg-gradient-to-r from-blue-600 to-blue-500 text-white
                                    hover:from-blue-500 hover:to-blue-400 hover:shadow-lg hover:shadow-blue-500/30
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    ${!reduceAnimations ? 'transition-all duration-300 hover:-translate-y-0.5' : ''}
                                `}
                            >
                                {epicLoginLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <LogIn size={18} />
                                )}
                                {epicLoginLoading
                                    ? t('marketplace.loggingIn', 'Logging in...')
                                    : t('marketplace.loginButton', 'Sign in with Epic Games')
                                }
                            </button>
                            <p className="text-[11px] text-slate-600 mt-4 max-w-sm text-center">
                                {t('marketplace.loginNote', 'This uses the same authentication as the Epic Games Launcher. Your credentials are sent directly to Epic.')}
                            </p>
                        </div>
                    ) : (
                        /* Logged In — Show Library */
                        <div className="flex flex-col h-full min-h-0 flex-1">
                            {/* Search + Logout */}
                            {/* Toolbar matching AssetManager Studio style */}
                            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-300">Assets: {filteredLibrary.length}</span>
                                    {libraryLoading && <RefreshCw size={14} className="animate-spin text-slate-500 ml-2" />}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">Sort:</span>
                                        <div className="relative">
                                            <select
                                                value={librarySort}
                                                onChange={(e) => setLibrarySort(e.target.value as LibrarySort)}
                                                className="appearance-none bg-slate-900 border border-slate-700 rounded-md pl-2 pr-6 py-1 text-xs text-white focus:outline-none focus:border-[var(--accent-color)]/50 cursor-pointer"
                                            >
                                                <option value="az">{t('marketplace.sortAZ', 'A to Z')}</option>
                                                <option value="za">{t('marketplace.sortZA', 'Z to A')}</option>
                                                <option value="newest">{t('marketplace.sortNewest', 'Release Date')}</option>
                                                <option value="developer">{t('marketplace.sortDeveloper', 'Developer')}</option>
                                            </select>
                                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">Filter:</span>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={librarySearch}
                                                onChange={e => setLibrarySearch(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[var(--accent-color)]/50 w-48"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => loadLibrary()} 
                                        disabled={libraryRefreshing || libraryLoading}
                                        title={t('marketplace.refresh', 'Refresh Library')} 
                                        className="relative p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={libraryRefreshing ? 'animate-spin text-blue-400' : ''} />
                                        {!libraryLoading && libraryRefreshing && (
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-blue-500"></span>
                                            </div>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleEpicLogout}
                                        title={t('marketplace.logout', 'Logout')}
                                        className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
                                    >
                                        <LogOut size={12} />
                                    </button>
                                </div>
                            </div>

                            {libraryLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                                        <span className="text-slate-400 text-sm font-medium">{t('marketplace.loadingLibrary', 'Loading your library...')}</span>
                                    </div>
                                </div>
                            ) : filteredLibrary.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                                    <Library size={48} className="text-slate-700 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-300 mb-2">{t('marketplace.noLibrary', 'No Assets Found')}</h3>
                                    <p className="text-sm text-slate-500 max-w-md text-center">
                                        {librarySearch
                                            ? t('marketplace.noLibrarySearch', 'No assets match your search.')
                                            : t('marketplace.noLibraryDesc', 'Your Epic Games library appears empty. Try refreshing.')
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="flex gap-4 flex-1 min-h-0">
                                    {/* Left Side: Dense Grid */}
                                    <div className={`flex-1 overflow-y-auto pr-2 custom-scrollbar ${selectedAsset ? 'w-[calc(100%-450px)]' : 'w-full'}`}>
                                        <div className={`grid gap-4 pb-8 ${selectedAsset ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7'}`}>
                                            {filteredLibrary.map(item => (
                                                <div
                                                    key={item.id || item.appName}
                                                    onClick={() => {
                                                        setSelectedAsset(item);
                                                        setAssetTab('description');
                                                    }}
                                                    className={`
                                                        group relative bg-slate-900 border rounded-xl cursor-pointer overflow-hidden aspect-square flex flex-col transition-all duration-300
                                                        ${selectedAsset?.appName === item.appName ? 'border-[#00cf54]/60 shadow-[0_0_15px_rgba(0,207,84,0.15)] scale-[1.02]' : 'border-slate-800 hover:border-slate-500'}
                                                    `}
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="relative flex-1 bg-slate-800 flex items-center justify-center overflow-hidden">
                                                        {item.thumbnail ? (
                                                            <img
                                                                src={item.thumbnail}
                                                                alt={item.title}
                                                                className="absolute inset-0 w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <Package size={24} className="text-slate-600" />
                                                        )}
                                                    </div>
        
                                                    {/* Title Bar */}
                                                    <div className="bg-slate-950 px-2 py-1.5 h-10 flex items-center justify-center text-center">
                                                        <span className="text-[11px] font-medium text-slate-300 truncate w-full group-hover:text-white transition-colors">{item.title}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right Side: Detail Panel */}
                                    {selectedAsset && (
                                        <div className={`w-[450px] shrink-0 h-full min-h-0 bg-[#0d1117] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl ${!reduceAnimations ? 'animate-slideInRight' : ''}`}>
                                            {/* Panel Header Hero */}
                                            <div className="relative w-full aspect-[16/10] bg-slate-900 border-b border-slate-800 shrink-0 group">
                                                {selectedAsset.thumbnail ? (
                                                    <img src={selectedAsset.thumbnail} alt={selectedAsset.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                                        <Package size={48} className="text-slate-600" />
                                                    </div>
                                                )}
                                                {/* Sophisticated Gradient Backdrop */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/40 to-black/20" />
                                                
                                                {/* Close Button */}
                                                <button onClick={() => setSelectedAsset(null)} className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 text-white transition-colors z-10 border border-white/10">
                                                    <X size={14} />
                                                </button>
                                                
                                                {/* Info Title */}
                                                <div className="absolute bottom-4 left-6 right-6 z-10">
                                                    <div className="flex gap-2 mb-2 flex-wrap">
                                                        {(selectedAsset.categories || '').split(',').slice(0, 2).map((cat, i) => (
                                                            <span key={i} className="bg-white/10 backdrop-blur-md text-white/90 border border-white/10 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide font-semibold">
                                                                {cat.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg">{selectedAsset.title}</h2>
                                                    <p className="text-sm text-slate-300 font-medium mt-1">{selectedAsset.developer || t('marketplace.unknown', 'Unknown Developer')}</p>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="px-6 py-5 flex gap-3 border-b border-slate-800/50 shrink-0 bg-[#0d1117]">
                                                <button onClick={handleDownloadClick} className="flex-1 bg-white hover:bg-slate-200 text-black py-2.5 px-4 rounded-full text-[13px] font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform hover:scale-[1.02] hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                                    <Plus size={14} />
                                                    {getAssetInstallInfo(selectedAsset)}
                                                </button>
                                                <button onClick={handleDownloadClick} className="bg-slate-800 hover:bg-slate-700 text-white py-2.5 px-6 rounded-full text-[13px] font-bold transition-transform hover:scale-[1.02] hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-slate-700">
                                                    <Download size={14} />
                                                </button>
                                            </div>

                                            {/* Panel Tabs (Minimalist) */}
                                            <div className="flex items-center gap-6 px-6 border-b border-slate-800/50 shrink-0 bg-[#0d1117]">
                                                <button 
                                                    onClick={() => setAssetTab('description')} 
                                                    className={`py-3 text-[12px] font-bold border-b-2 transition-colors ${assetTab === 'description' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                                                >
                                                    {t('marketplace.tabDesc', 'Description')}
                                                </button>
                                                <button 
                                                    onClick={() => setAssetTab('technical')} 
                                                    className={`py-3 text-[12px] font-bold border-b-2 transition-colors ${assetTab === 'technical' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                                                >
                                                    {t('marketplace.tabTech', 'Technical')}
                                                </button>
                                                <button 
                                                    onClick={() => setAssetTab('images')} 
                                                    className={`py-3 text-[12px] font-bold border-b-2 transition-colors ${assetTab === 'images' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                                                >
                                                    {t('marketplace.tabImages', 'Images')}
                                                </button>
                                            </div>

                                            {/* Panel Content (Scrollable) */}
                                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-[12px] text-slate-300 leading-relaxed bg-[#0a0d14]">
                                                {assetTab === 'description' && (
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t('marketplace.supportedVersions', 'Supported Versions')}</span>
                                                                <span className="text-white font-medium">{selectedAsset.compatibleVersions || t('marketplace.unknown', 'Unknown')}</span>
                                                            </div>
                                                            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{t('marketplace.modifiedDate', 'Modified Date')}</span>
                                                                <span className="text-white font-medium">{selectedAsset.releaseDate?.split('T')[0] || t('marketplace.unknown', 'Unknown')}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="w-full h-[1px] bg-slate-800/50" />
                                                        
                                                        {selectedAsset.description ? (
                                                            <div className="whitespace-pre-wrap break-words text-[13px] leading-7">{selectedAsset.description}</div>
                                                        ) : (
                                                            <div className="italic text-slate-500">{t('marketplace.noDesc', 'No description provided.')}</div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {assetTab === 'technical' && (
                                                    <div className="space-y-4">
                                                        <div className="space-y-2 text-[12px]">
                                                            <div className="flex justify-between py-2 border-b border-white/5">
                                                                <span className="text-slate-500">{t('marketplace.appName', 'App Name (ID):')}</span>
                                                                <span className="text-white font-mono">{selectedAsset.appName}</span>
                                                            </div>
                                                            <div className="flex justify-between py-2 border-b border-white/5">
                                                                <span className="text-slate-500">{t('marketplace.catalogItemId', 'Catalog Item ID:')}</span>
                                                                <span className="text-white font-mono">{selectedAsset.catalogItemId || selectedAsset.id}</span>
                                                            </div>
                                                            <div className="flex justify-between py-2 border-b border-white/5">
                                                                <span className="text-slate-500">{t('marketplace.namespace', 'Namespace:')}</span>
                                                                <span className="text-white font-mono">{selectedAsset.namespace}</span>
                                                            </div>
                                                            <div className="flex justify-between py-2 border-b border-white/5">
                                                                <span className="text-slate-500">{t('marketplace.listingType', 'Listing Type:')}</span>
                                                                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{selectedAsset.namespace === 'ue' ? t('marketplace.assetPlugin', 'Asset/Plugin') : selectedAsset.namespace}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {assetTab === 'images' && (
                                                    <div className="flex flex-col gap-2">
                                                        {selectedAsset.thumbnail ? (
                                                            <img src={selectedAsset.thumbnail} alt={selectedAsset.title} className="w-full rounded-lg border border-slate-800" />
                                                        ) : (
                                                            <div className="p-4 text-center text-slate-500 bg-slate-900 rounded-lg">{t('marketplace.noImages', 'No additional images available.')}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Global Download Progress Bar */}
            {isDownloading && downloadingAsset && (
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#0a0d14] border-t border-[#00cf54]/30 flex items-center px-4 z-50 overflow-hidden shadow-[0_-5px_20px_rgba(0,207,84,0.1)]">
                    <div className="absolute inset-0 bg-[#00cf54]/10" style={{ width: `${downloadProgress}%`, transition: 'width 0.3s ease' }} />
                    <div className="relative z-10 flex justify-between items-center w-full text-[11px]">
                        <span className="text-[#00cf54] font-medium tracking-wide">
                            Downloading asset files, {downloadStats.downloadedMB} MB of {downloadStats.totalMB} MB ({(downloadProgress).toFixed(2)}%)
                        </span>
                        <div className="flex items-center gap-3">
                            <div className="w-56 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                <div className="h-full bg-[#00cf54] rounded-full shadow-[0_0_10px_#00cf54]" style={{ width: `${downloadProgress}%`, transition: 'width 0.3s ease' }} />
                            </div>
                            <span className="text-white font-bold font-mono w-10 text-right">{downloadProgress}%</span>
                            <button onClick={cancelDownload} className="ml-3 p-1.5 rounded-full bg-slate-800 hover:bg-red-900/40 hover:text-red-400 text-slate-400 border border-slate-700 transition-colors" title={t('marketplace.cancelDownload', 'Cancel Download')}>
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download/Install Modal */}
            {installModalOpen && selectedAsset && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0d1117] border border-slate-700/50 rounded-2xl w-[450px] shadow-2xl overflow-hidden animate-slideUp">
                        <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-white font-bold">
                                {t('marketplace.installTitle', { title: selectedAsset.title, defaultValue: `Install ${selectedAsset.title}` })}
                            </h3>
                            <button onClick={() => setInstallModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                {(() => {
                                    const isProjectAsset = selectedAsset.categories?.includes('projects');
                                    const isEnginePlugin = selectedAsset.categories?.includes('plugins') || selectedAsset.categories?.includes('codeplugins');
                                    
                                    let compatiblePrefixes: string[] = [];
                                    if (selectedAsset.versions && selectedAsset.versions.length > 0) {
                                        compatiblePrefixes = selectedAsset.versions.map(s => s.trim().split('.').slice(0, 2).join('.'));
                                    } else if (selectedAsset.compatibleVersions) {
                                        compatiblePrefixes = selectedAsset.compatibleVersions.split(',').map(s => s.trim().split('.').slice(0, 2).join('.')).filter(Boolean);
                                    }
                                    
                                    let options: { value: string, label: string }[] = [];
                                    let label = '';
                                    
                                    if (isEnginePlugin || isProjectAsset) {
                                        label = isProjectAsset ? t('marketplace.selectEngineForProj', 'Engine for New Project:') : t('marketplace.selectEngine', 'Target Engine:');
                                        const compatibleEngines = localEngines.filter(e => {
                                            const majorMinor = e.version.split('.').slice(0, 2).join('.');
                                            return compatiblePrefixes.length === 0 || compatiblePrefixes.includes(majorMinor);
                                        });
                                        options = compatibleEngines.map(e => ({ value: e.path, label: `Unreal Engine ${e.version}` }));
                                    } else {
                                        label = t('marketplace.selectProject', 'Target Project:');
                                        const compatibleProjs = localProjects.filter(p => {
                                            if (!p.version) return true;
                                            const majorMinor = p.version.split('.').slice(0, 2).join('.');
                                            return compatiblePrefixes.length === 0 || compatiblePrefixes.includes(majorMinor);
                                        });
                                        options = compatibleProjs.map(p => ({ value: p.id, label: `${p.name} (${p.version || 'Unknown'})` }));
                                    }

                                    return (
                                        <>
                                            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</label>
                                            <select 
                                                value={installTargetId}
                                                onChange={(e) => setInstallTargetId(e.target.value)}
                                                className="w-full bg-[#0a0d14] border border-slate-800 rounded-lg p-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="" disabled>{t('marketplace.selectTargetPlaceholder', 'Select a target...')}</option>
                                                {options.length === 0 ? (
                                                    <option disabled>{t('marketplace.noCompatibleTargets', 'No compatible targets found.')}</option>
                                                ) : (
                                                    options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
                                                )}
                                            </select>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/5 bg-[#0a0d14] flex justify-end gap-3 items-center">
                            <button onClick={() => setInstallModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-red-700 hover:bg-red-600 transition-colors shadow-lg">
                                {t('marketplace.cancel', 'Cancel')}
                            </button>
                            <button onClick={() => { setInstallModalOpen(false); startAssetDownload(); }} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#00cf54] text-white hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(0,207,84,0.3)]">
                                {t('marketplace.installIntoBtn', 'Install')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
