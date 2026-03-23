import { ipcMain, BrowserWindow, app, dialog } from 'electron';
import https from 'node:https';
import { URL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';

// Download state
let activeDownloadAbort: AbortController | null = null;

function getVaultDir(): string {
    const configPath = path.join(app.getPath('userData'), 'vault_config.json');
    try {
        if (fs.existsSync(configPath)) {
            const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (cfg.vaultDir && fs.existsSync(cfg.vaultDir)) return cfg.vaultDir;
        }
    } catch { /* ignore */ }
    // Default: ProgramData Epic vault
    return path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'VaultCache');
}

function setVaultDir(dir: string) {
    const configPath = path.join(app.getPath('userData'), 'vault_config.json');
    fs.writeFileSync(configPath, JSON.stringify({ vaultDir: dir }, null, 2));
}

// Epic Games OAuth credentials (from Epic Games Launcher — same as Legendary/EAM)
const EPIC_CLIENT_ID = '34a02cf8f4414e29b15921876da36f9a';
const EPIC_CLIENT_SECRET = 'daafbccc737745039dffe53d94fc76cf';
const BASIC_AUTH = Buffer.from(`${EPIC_CLIENT_ID}:${EPIC_CLIENT_SECRET}`).toString('base64');

// Epic API endpoints (reverse-engineered from Legendary)
const OAUTH_HOST = 'account-public-service-prod03.ol.epicgames.com';
const LIBRARY_HOST = 'library-service.live.use1a.on.epicgames.com';
const CATALOG_HOST = 'catalog-public-service-prod06.ol.epicgames.com';

// Login URL
const LOGIN_URL = `https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect%3FclientId%3D${EPIC_CLIENT_ID}%26responseType%3Dcode`;

// Token storage path
function getTokenPath(): string {
    return path.join(app.getPath('userData'), 'epic_token.json');
}

// Library cache path
function getLibraryCachePath(): string {
    return path.join(app.getPath('userData'), 'epic_library_cache.json');
}

function saveLibraryCache(items: any[]) {
    try {
        fs.writeFileSync(getLibraryCachePath(), JSON.stringify({ timestamp: Date.now(), items }, null, 2));
    } catch (e) {
        console.error('Failed to save library cache:', e);
    }
}

function loadLibraryCache(): { timestamp: number; items: any[] } | null {
    try {
        const cachePath = getLibraryCachePath();
        if (fs.existsSync(cachePath)) {
            return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        }
    } catch (e) {
        console.error('Failed to load library cache:', e);
    }
    return null;
}

interface EpicToken {
    access_token: string;
    refresh_token: string;
    account_id: string;
    displayName: string;
    expires_at: number;
    refresh_expires_at: number;
}

let currentToken: EpicToken | null = null;

function saveToken(token: EpicToken) {
    currentToken = token;
    try {
        fs.writeFileSync(getTokenPath(), JSON.stringify(token, null, 2));
    } catch (e) {
        console.error('Failed to save token:', e);
    }
}

function loadToken(): EpicToken | null {
    if (currentToken) return currentToken;
    try {
        const tokenPath = getTokenPath();
        if (fs.existsSync(tokenPath)) {
            const data = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
            currentToken = data;
            return data;
        }
    } catch (e) {
        console.error('Failed to load token:', e);
    }
    return null;
}

function clearToken() {
    currentToken = null;
    try {
        const tokenPath = getTokenPath();
        if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
    } catch { /* ignore */ }
}

// Make HTTPS request helper
function epicRequest(options: {
    hostname: string;
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: options.hostname,
            path: options.path,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...options.headers,
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode || 0, data });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

// Exchange authorization code for token
async function exchangeCode(code: string): Promise<EpicToken> {
    const res = await epicRequest({
        hostname: OAUTH_HOST,
        path: '/account/api/oauth/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${BASIC_AUTH}`,
        },
        body: `grant_type=authorization_code&code=${code}&token_type=eg1`,
    });

    if (res.status !== 200) {
        throw new Error(`OAuth failed: ${JSON.stringify(res.data)}`);
    }

    const token: EpicToken = {
        access_token: res.data.access_token,
        refresh_token: res.data.refresh_token,
        account_id: res.data.account_id,
        displayName: res.data.displayName || '',
        expires_at: Date.now() + (res.data.expires_in * 1000),
        refresh_expires_at: Date.now() + (res.data.refresh_expires_in * 1000),
    };

    saveToken(token);
    return token;
}

// Refresh token
async function refreshToken(): Promise<EpicToken | null> {
    const token = loadToken();
    if (!token?.refresh_token) return null;

    // Check if refresh token is still valid
    if (Date.now() > token.refresh_expires_at) {
        clearToken();
        return null;
    }

    try {
        const res = await epicRequest({
            hostname: OAUTH_HOST,
            path: '/account/api/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${BASIC_AUTH}`,
            },
            body: `grant_type=refresh_token&refresh_token=${token.refresh_token}&token_type=eg1`,
        });

        if (res.status !== 200) {
            clearToken();
            return null;
        }

        const newToken: EpicToken = {
            access_token: res.data.access_token,
            refresh_token: res.data.refresh_token,
            account_id: res.data.account_id,
            displayName: res.data.displayName || token.displayName,
            expires_at: Date.now() + (res.data.expires_in * 1000),
            refresh_expires_at: Date.now() + (res.data.refresh_expires_in * 1000),
        };

        saveToken(newToken);
        return newToken;
    } catch {
        clearToken();
        return null;
    }
}

// Get a valid access token (auto-refresh if needed)
async function getValidToken(): Promise<string | null> {
    let token = loadToken();
    if (!token) return null;

    // If access token expired, try refresh
    if (Date.now() > token.expires_at - 60000) {
        token = await refreshToken();
        if (!token) return null;
    }

    return token.access_token;
}

// Fetch library items (all owned assets)
async function fetchLibraryItems(accessToken: string): Promise<any[]> {
    const allItems: any[] = [];
    let cursor: string | null = null;

    do {
        const queryParams = new URLSearchParams({ includeMetadata: 'true' });
        if (cursor) queryParams.set('cursor', cursor);

        const res = await epicRequest({
            hostname: LIBRARY_HOST,
            path: `/library/api/public/items?${queryParams.toString()}`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (res.status !== 200) {
            console.error('Library request failed:', res.status, res.data);
            break;
        }

        const records = res.data?.records || [];
        allItems.push(...records);

        cursor = res.data?.responseMetadata?.nextCursor || null;
    } while (cursor);

    return allItems;
}

// Fetch catalog info for items (to get title, description, images)
async function fetchCatalogInfo(accessToken: string, namespace: string, catalogItemId: string): Promise<any> {
    const res = await epicRequest({
        hostname: CATALOG_HOST,
        path: `/catalog/api/shared/namespace/${namespace}/bulk/items?id=${catalogItemId}&includeDLCDetails=true&includeMainGameDetails=true&country=US&locale=en`,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (res.status === 200 && res.data[catalogItemId]) {
        return res.data[catalogItemId];
    }
    return null;
}

export function registerEpicAuthHandlers() {
    // Check if user is logged in
    ipcMain.handle('epic-auth-status', async () => {
        const token = loadToken();
        if (!token) return { loggedIn: false };

        // Try to validate/refresh
        const valid = await getValidToken();
        if (!valid) return { loggedIn: false };

        return {
            loggedIn: true,
            displayName: token.displayName,
            accountId: token.account_id,
        };
    });

    // Start OAuth login flow
    ipcMain.handle('epic-auth-login', async () => {
        return new Promise<{ success: boolean; displayName?: string; error?: string }>((resolve) => {
            let resolved = false;

            const handleCode = async (code: string) => {
                if (resolved) return;
                resolved = true;
                try {
                    if (!authWindow.isDestroyed()) authWindow.close();
                } catch { /* ignore */ }
                try {
                    const token = await exchangeCode(code);
                    resolve({ success: true, displayName: token.displayName });
                } catch (e: any) {
                    resolve({ success: false, error: e.message });
                }
            };

            const extractCodeFromUrl = (url: string): string | null => {
                try {
                    const parsed = new URL(url);
                    return parsed.searchParams.get('code');
                } catch {
                    const match = url.match(/[?&]code=([^&]+)/);
                    return match ? match[1] : null;
                }
            };

            // Try to extract code from page body (Epic returns JSON at /api/redirect)
            const tryExtractFromPage = async () => {
                if (resolved || authWindow.isDestroyed()) return;
                try {
                    const body = await authWindow.webContents.executeJavaScript(
                        'document.body ? document.body.innerText : ""'
                    );
                    if (body) {
                        try {
                            const json = JSON.parse(body);
                            if (json.authorizationCode) {
                                handleCode(json.authorizationCode);
                                return;
                            }
                        } catch { /* not JSON, ignore */ }
                        // Also try regex on raw text
                        const match = body.match(/"authorizationCode"\s*:\s*"([a-f0-9]{32})"/);
                        if (match) handleCode(match[1]);
                    }
                } catch { /* page not ready yet */ }
            };

            // Open a browser window for Epic login
            const authWindow = new BrowserWindow({
                width: 800,
                height: 700,
                title: 'Epic Games Login',
                autoHideMenuBar: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                },
            });

            authWindow.loadURL(LOGIN_URL);

            // 1. Intercept redirects (URL has ?code=...)
            authWindow.webContents.on('will-redirect', (event, url) => {
                const code = extractCodeFromUrl(url);
                if (code) {
                    event.preventDefault();
                    handleCode(code);
                }
            });

            // 2. Intercept navigation to localhost or redirect page
            authWindow.webContents.on('will-navigate', (event, url) => {
                if (url.includes('localhost')) {
                    const code = extractCodeFromUrl(url);
                    if (code) {
                        event.preventDefault();
                        handleCode(code);
                    }
                }
            });

            // 3. After navigation completes, check page content for JSON auth code
            authWindow.webContents.on('did-navigate', (_, url) => {
                // Check URL params first
                const code = extractCodeFromUrl(url);
                if (code) {
                    handleCode(code);
                    return;
                }
                // Check if we landed on the redirect page (shows JSON body)
                if (url.includes('/api/redirect') || url.includes('/id/api/')) {
                    // Small delay to let page render
                    setTimeout(tryExtractFromPage, 300);
                }
            });

            // 4. Also check in-page navigations (SPA)
            authWindow.webContents.on('did-navigate-in-page', (_, url) => {
                if (url.includes('/api/redirect') || url.includes('/id/api/')) {
                    setTimeout(tryExtractFromPage, 300);
                }
            });

            // 5. Catch failed loads (localhost ERR_CONNECTION_REFUSED)
            authWindow.webContents.on('did-fail-load', (_, _errorCode, _errorDesc, validatedURL) => {
                if (validatedURL) {
                    const code = extractCodeFromUrl(validatedURL);
                    if (code) handleCode(code);
                }
            });

            // 6. Monitor page content changes for logged-in users (auto-redirect)
            authWindow.webContents.on('did-finish-load', () => {
                const url = authWindow.webContents.getURL();
                if (url.includes('/api/redirect') || url.includes('localhost')) {
                    tryExtractFromPage();
                }
            });

            authWindow.on('closed', () => {
                if (!resolved) {
                    resolved = true;
                    resolve({ success: false, error: 'Login cancelled' });
                }
            });
        });
    });

    // Logout
    ipcMain.handle('epic-auth-logout', async () => {
        const accessToken = await getValidToken();
        if (accessToken) {
            // Kill session on Epic's side
            try {
                await epicRequest({
                    hostname: OAUTH_HOST,
                    path: `/account/api/oauth/sessions/kill/${accessToken}`,
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });
            } catch { /* ignore */ }
        }
        clearToken();
        // Also clear library cache
        try {
            const cachePath = getLibraryCachePath();
            if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        } catch { /* ignore */ }
        return { success: true };
    });

    // Get cached library (instant, from disk)
    ipcMain.handle('epic-get-library-cached', async () => {
        const token = loadToken();
        if (!token) return { error: 'not_logged_in', items: [], cached: false };

        const cache = loadLibraryCache();
        if (cache && cache.items.length > 0) {
            return { error: null, items: cache.items, cached: true, timestamp: cache.timestamp };
        }
        return { error: null, items: [], cached: false };
    });

    // Get full library (all owned assets — installed or not)
    ipcMain.handle('epic-get-library', async () => {
        const accessToken = await getValidToken();
        if (!accessToken) return { error: 'not_logged_in', items: [] };

        try {
            const rawItems = await fetchLibraryItems(accessToken);

            // Filter to only UE Marketplace assets (namespace 'ue') — exclude games
            const items = rawItems.filter((item: any) => item.namespace === 'ue');

            // Step 1: Deduplicate by catalogItemId — group versions of same asset
            const grouped = new Map<string, {
                catalogItemId: string;
                namespace: string;
                appNames: string[];
                versions: string[];
                title: string;
            }>();

            for (const item of items) {
                const catId = item.catalogItemId || item.appName || '';
                const ns = item.namespace || '';
                const key = `${ns}:${catId}`;

                if (grouped.has(key)) {
                    const existing = grouped.get(key)!;
                    existing.appNames.push(item.appName || '');
                    // Extract version from appName (e.g. "FootIK_4.25" → "4.25")
                    const ver = extractVersionFromAppName(item.appName || '');
                    if (ver && !existing.versions.includes(ver)) {
                        existing.versions.push(ver);
                    }
                } else {
                    const ver = extractVersionFromAppName(item.appName || '');
                    grouped.set(key, {
                        catalogItemId: catId,
                        namespace: ns,
                        appNames: [item.appName || ''],
                        versions: ver ? [ver] : [],
                        title: cleanTitle(item.appName || item.title || 'Unknown'),
                    });
                }
            }

            console.log(`Library: ${items.length} raw items → ${grouped.size} unique assets`);

            // Step 2: Batch-fetch catalog info for thumbnails and proper titles
            const uniqueItems = Array.from(grouped.values());
            const catalogCache = new Map<string, any>();

            // Fetch catalog in batches of 50 (Epic API limit)
            const namespaceGroups = new Map<string, string[]>();
            for (const item of uniqueItems) {
                if (!item.namespace || !item.catalogItemId) continue;
                const ids = namespaceGroups.get(item.namespace) || [];
                ids.push(item.catalogItemId);
                namespaceGroups.set(item.namespace, ids);
            }

            for (const [ns, ids] of namespaceGroups) {
                // Process in chunks of 50
                for (let i = 0; i < ids.length; i += 50) {
                    const chunk = ids.slice(i, i + 50);
                    try {
                        const idParams = chunk.map(id => `id=${id}`).join('&');
                        const res = await epicRequest({
                            hostname: CATALOG_HOST,
                            path: `/catalog/api/shared/namespace/${ns}/bulk/items?${idParams}&includeDLCDetails=true&includeMainGameDetails=true&country=US&locale=en`,
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                            },
                        });

                        if (res.status === 200 && typeof res.data === 'object') {
                            for (const [id, info] of Object.entries(res.data)) {
                                catalogCache.set(`${ns}:${id}`, info);
                            }
                        }
                    } catch (e) {
                        console.error(`Catalog batch fetch failed for namespace ${ns}:`, e);
                    }
                }
            }

            console.log(`Fetched catalog info for ${catalogCache.size} items`);

            // Step 3: Build final items with catalog data
            const transformed = uniqueItems.map(item => {
                const catInfo: any = catalogCache.get(`${item.namespace}:${item.catalogItemId}`) || {};

                // Sort versions
                item.versions.sort((a, b) => {
                    const pa = a.split('.').map(Number);
                    const pb = b.split('.').map(Number);
                    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                        if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
                    }
                    return 0;
                });

                const versionStr = item.versions.length > 2
                    ? `${item.versions[0]} - ${item.versions[item.versions.length - 1]}`
                    : item.versions.join(', ');

                return {
                    id: item.catalogItemId,
                    namespace: item.namespace,
                    appName: item.appNames[0] || '',
                    title: catInfo.title || item.title,
                    description: catInfo.description || '',
                    thumbnail: findThumbnail(catInfo),
                    categories: catInfo.categories?.map((c: any) => c.path?.replace(/\//g, ' › ') || c)?.join(', ') || '',
                    developer: catInfo.developer || catInfo.seller?.name || '',
                    releaseDate: catInfo.releaseDate || '',
                    compatibleVersions: versionStr || extractVersions(catInfo),
                    versions: item.versions,
                    installed: false,
                };
            });

            // Sort alphabetically by title
            transformed.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

            // Save to cache for instant load next time
            saveLibraryCache(transformed);

            return { error: null, items: transformed };
        } catch (e: any) {
            console.error('Failed to fetch library:', e);
            return { error: e.message, items: [] };
        }
    });

    // Get catalog details for a specific item
    ipcMain.handle('epic-get-asset-manifest', async (_, namespace: string, catalogItemId: string, appName: string) => {
        if (!currentToken) return { error: 'not_logged_in' };
        try {
            // Fetch asset download manifest (build metadata) from Epic Launcher API
            const response = await epicRequest({
                hostname: 'launcher-public-service-prod06.ol.epicgames.com',
                path: `/launcher/api/public/assets/v2/platform/Windows/namespace/${namespace}/catalogItem/${catalogItemId}/app/${appName}/label/Live`,
                method: 'GET',
                headers: {
                    Authorization: `bearer ${currentToken.access_token}`
                }
            });
            return { error: null, manifest: response.data };
        } catch (e: any) {
            console.error('Failed to fetch asset manifest:', e);
            return { error: e.message };
        }
    });

    ipcMain.handle('epic-get-catalog-info', async (_, namespace: string, catalogItemId: string) => {
        const accessToken = await getValidToken();
        if (!accessToken) return null;

        try {
            return await fetchCatalogInfo(accessToken, namespace, catalogItemId);
        } catch {
            return null;
        }
    });

    ipcMain.handle('epic-select-vault-dir', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select Vault Cache Directory',
            properties: ['openDirectory', 'createDirectory']
        });
        if (!result.canceled && result.filePaths.length > 0) {
            setVaultDir(result.filePaths[0]);
            return result.filePaths[0];
        }
        return null;
    });

    ipcMain.handle('epic-cancel-download', () => {
        if (activeDownloadAbort) {
            activeDownloadAbort.abort();
            activeDownloadAbort = null;
            return true;
        }
        return false;
    });

    ipcMain.handle('epic-download-asset', async (event, namespace: string, catalogItemId: string, appName: string) => {
        if (!currentToken) return { error: 'not_logged_in' };
        if (activeDownloadAbort) return { error: 'download_in_progress' };

        const debugLogPath = path.join(app.getPath('desktop'), 'unrealhub-download.log');
        const log = (msg: string) => {
            fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${msg}\n`);
            console.log(msg);
        };
        
        log(`--- STARTING DOWNLOAD --- App: ${appName}, Item: ${catalogItemId}, Namespace: ${namespace}`);

        const abortController = new AbortController();
        activeDownloadAbort = abortController;
        const sendProgress = (payload: any) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('download-asset-progress', payload);
            }
        };

        const downloadDir = path.join(getVaultDir(), appName, 'data');
        const manifestDir = path.join(getVaultDir(), appName);

        try {
            sendProgress({ status: 'fetching_manifest', percent: 0 });

            // 1. Get Build Info
            const buildUrl = `/launcher/api/public/assets/v2/platform/Windows/namespace/${namespace}/catalogItem/${catalogItemId}/app/${appName}/label/Live`;
            log(`Fetching Build Info: ${buildUrl}`);
            
            const buildRes = await epicRequest({
                hostname: 'launcher-public-service-prod06.ol.epicgames.com',
                path: buildUrl,
                headers: { Authorization: `bearer ${currentToken.access_token}` }
            });

            log(`Build Info Status: ${buildRes.status}`);

            if (buildRes.status !== 200 || !buildRes.data || !buildRes.data.elements || !buildRes.data.elements.length) {
                log(`Build Info Failed Data: ${JSON.stringify(buildRes.data || {})}`);
                throw new Error(`Failed to get download instructions from Epic Games (Status: ${buildRes.status})`);
            }

            const element = buildRes.data.elements[0];
            const manifests = element.manifests || [];
            if (!manifests.length) throw new Error('No manifest URLs found');

            const manifestUrl = manifests[0].uri;
            log(`Manifest URL: ${manifestUrl}`);
            const parsedManifestUrl = new URL(manifestUrl);
            const manifestQueryParams = parsedManifestUrl.search;
            
            const baseUrlMatch = manifestUrl.match(/^(https:\/\/[^/]+)/);
            if (!baseUrlMatch) throw new Error('Invalid manifest URL');
            const distributionBaseUrl = baseUrlMatch[1];
            
            // Wait, Legendary and EAM actually download the *.manifest files, which are JSON-based or Binary.
            // For UE Marketplace plugins, the manifest is a JSON file if the app is an asset pack/plugin.
            
            sendProgress({ status: 'downloading_metadata', percent: 5 });
            
            let manifestJson: any = null;
            
            // Fetch Manifest
            const manifestDataStr = await new Promise<string>((resolve, reject) => {
                const req = https.get(manifestUrl, { 
                    headers: { 'User-Agent': 'AssetManagerStudio/1.00+++Portal+Release-Live.64bit' },
                    signal: abortController.signal 
                }, (res) => {
                    if (res.statusCode !== 200) reject(new Error(`Manifest download failed: ${res.statusCode}`));
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                });
                req.on('error', reject);
            });

            try {
                // If the manifest starts with '{', it's JSON.
                if (manifestDataStr.trim().startsWith('{')) {
                    manifestJson = JSON.parse(manifestDataStr);
                } else {
                     throw new Error('Binary manifests are not supported yet, only JSON manifests are supported natively right now.');
                }
            } catch (e: any) {
                throw new Error(`Failed to parse manifest: ${e.message}`);
            }

            fs.mkdirSync(manifestDir, { recursive: true });
            fs.mkdirSync(downloadDir, { recursive: true });
            fs.writeFileSync(path.join(manifestDir, 'manifest.json'), manifestDataStr);
            
            const fileList = manifestJson.FileManifestList || [];
            const chunkHashList = manifestJson.ChunkHashList || {};
            const dataGroupList = manifestJson.DataGroupList || {};
            
            let totalBytes = 0;
            fileList.forEach((file: any) => {
                file.FileChunkParts.forEach((part: any) => {
                    let size = 0;
                    if (typeof part.Size === 'number') size = part.Size;
                    else if (typeof part.Size === 'string') size = parseInt(part.Size, 10);
                    totalBytes += size;
                });
            });

            let downloadedBytes = 0;
            const totalMB = totalBytes / (1024 * 1024);

            sendProgress({ 
                status: 'downloading_files', 
                percent: 0,
                downloadedMB: 0,
                totalMB: totalMB
            });

            // Make an agent config for Keep-Alive to avoid exhausting sockets
            const agent = new https.Agent({ keepAlive: true, maxSockets: 16 });

            // Helper to download a single file
            const downloadFile = async (file: any) => {
                if (abortController.signal.aborted) throw new Error('Aborted');
                
                const filePath = path.join(downloadDir, file.Filename);
                const fileDir = path.dirname(filePath);
                fs.mkdirSync(fileDir, { recursive: true });

                const ws = fs.createWriteStream(filePath);
                
                try {
                    for (const part of file.FileChunkParts) {
                        if (abortController.signal.aborted) break;
                        
                        const chunkGuid = part.Guid;
                        const hashHexStr = chunkHashList[chunkGuid];
                        if (!hashHexStr) continue;
                        
                        const hashHex = BigInt(hashHexStr).toString(16).padStart(16, '0').toUpperCase(); // Pad to 16 chars (64-bit uint)
                        const groupNum = String(dataGroupList[chunkGuid] || 0).padStart(2, '0');
                        
                        const chunkUrl = `${distributionBaseUrl}/Builds/Access/asset/ue/ChunksV3/${groupNum}/${hashHex}_${chunkGuid}.chunk${manifestQueryParams}`;

                        await new Promise<void>((resolve, reject) => {
                            if (abortController.signal.aborted) return reject(new Error('Aborted'));
                            
                            const req = https.get(chunkUrl, { 
                                headers: { 'User-Agent': 'AssetManagerStudio/1.00+++Portal+Release-Live.64bit' },
                                agent,
                                signal: abortController.signal
                            }, (res) => {
                                if (res.statusCode !== 200) {
                                    return reject(new Error(`Chunk failed: ${chunkUrl} [${res.statusCode}]`));
                                }

                                // Epic Chunk Format V3 parsing
                                let chunkData = Buffer.alloc(0);
                                res.on('data', d => chunkData = Buffer.concat([chunkData, d]));
                                res.on('end', () => {
                                    try {
                                        // Simple binary chunk parser (Epic format)
                                        // Header is usually 41 or 45 bytes in V3
                                        // uint32 Magic
                                        // uint32 Version
                                        // uint32 HeaderSize
                                        // uint32 CompressedSize
                                        // GUID (16 bytes)
                                        // ...
                                        // StoredAs (1 byte) -> 0=none, 1=compressed, 2=encrypted

                                        if (chunkData.length < 41) throw new Error('Chunk too small');
                                        
                                        const magic = chunkData.readUInt32LE(0);
                                        if (magic !== 0xB1FA7F22 && magic !== 2986228386) {
                                             // If no magic, assume raw
                                        }

                                        const headerSize = chunkData.readUInt32LE(8);
                                        const storedAsByte = chunkData.readUInt8(headerSize > 41 ? 40 : 36); // Approximation for UE chunk header

                                        let rawBinary = chunkData.subarray(headerSize);
                                        
                                        // Decompress if needed (zlib)
                                        if ((storedAsByte & 1) === 1) { // Compressed
                                            rawBinary = zlib.inflateSync(rawBinary);
                                        }

                                        // Now we have uncompressed chunk data, write to file stream
                                        let offset = 0;
                                        if (typeof part.Offset === 'number') offset = part.Offset;
                                        else if (typeof part.Offset === 'string') offset = parseInt(part.Offset, 10);
                                        
                                        let size = 0;
                                        if (typeof part.Size === 'number') size = part.Size;
                                        else if (typeof part.Size === 'string') size = parseInt(part.Size, 10);

                                        const targetData = rawBinary.subarray(offset, offset + size);
                                        ws.write(targetData, () => {
                                            downloadedBytes += targetData.length;
                                            
                                            sendProgress({ 
                                                status: 'downloading_files', 
                                                percent: (downloadedBytes / totalBytes) * 100,
                                                downloadedMB: downloadedBytes / (1024 * 1024),
                                                totalMB: totalMB
                                            });
                                            resolve();
                                        });

                                    } catch (err) {
                                        reject(err);
                                    }
                                });
                            });
                            req.on('error', reject);
                        });
                    }
                } finally {
                    ws.end();
                }
            };

            // Download files (limit concurrency to 4 files at a time to not explode memory, using native Promises)
            const concurrency = 4;
            const queue = [...fileList];
            
            const worker = async () => {
                while (queue.length > 0) {
                    if (abortController.signal.aborted) break;
                    const file = queue.shift();
                    if (file) await downloadFile(file);
                }
            };

            const workers = Array(Math.min(concurrency, queue.length)).fill(0).map(() => worker());
            await Promise.all(workers);

            if (abortController.signal.aborted) {
                activeDownloadAbort = null;
                return { error: 'aborted' };
            }

            sendProgress({ status: 'completed', percent: 100 });
            activeDownloadAbort = null;
            return { error: null, success: true };

        } catch (e: any) {
            log(`DOWNLOAD FAILED - Error: ${e.message}\nStack: ${e.stack}`);
            console.error('Download failed:', e);
            if (activeDownloadAbort === abortController) {
                activeDownloadAbort = null;
            }
            sendProgress({ status: 'error', error: e.message || 'Unknown error' });
            return { error: e.message || 'Unknown error' };
        }
    });
}

// Helper: find thumbnail from item metadata
function findThumbnail(item: any): string {
    if (item.metadata?.thumbnail) return item.metadata.thumbnail;
    if (item.keyImages) {
        const thumb = item.keyImages.find((i: any) =>
            i.type === 'Thumbnail' || i.type === 'DieselStoreFrontTall' || i.type === 'OfferImageTall' || i.type === 'Featured'
        );
        if (thumb) return thumb.url;
        // Fallback to any image
        if (item.keyImages.length > 0) return item.keyImages[0].url;
    }
    return '';
}

// Helper: extract compatible UE versions
function extractVersions(item: any): string {
    if (item.releaseInfo) {
        try {
            const versions = item.releaseInfo
                .map((r: any) => r.compatibleApps || [])
                .flat()
                .filter((v: string) => v && v.startsWith('UE_'))
                .map((v: string) => v.replace('UE_', ''))
                .sort();
            if (versions.length > 0) {
                return versions.length > 2
                    ? `${versions[0]} - ${versions[versions.length - 1]}`
                    : versions.join(', ');
            }
        } catch { /* ignore */ }
    }
    return '';
}

// Helper: extract UE version from appName (e.g. "FootIK_4.25" → "4.25")
function extractVersionFromAppName(appName: string): string {
    // Match patterns like _4.25, _5.3, _5.0 at the end
    const match = appName.match(/_(\d+\.\d+)(?:V\d+)?$/i);
    if (match) return match[1];
    // Match patterns like V1, V2 at the end
    const vMatch = appName.match(/V(\d+)$/);
    if (vMatch) return `v${vMatch[1]}`;
    return '';
}

// Helper: clean appName into a human-readable title
function cleanTitle(appName: string): string {
    // Remove version suffix like _4.25, _5.3
    let title = appName.replace(/_\d+\.\d+(?:V\d+)?$/i, '');
    // Remove trailing V1, V2 etc
    title = title.replace(/V\d+$/, '');
    // If it looks like a hex hash (20+ chars), keep as-is
    if (/^[a-f0-9]{20,}$/i.test(title)) return appName;
    // Replace underscores with spaces for display
    title = title.replace(/_/g, ' ');
    return title || appName;
}
