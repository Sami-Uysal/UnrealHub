import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScanSnapshot } from '../types';

export function ScanProgress({ snapshot, onRefresh }: {
    snapshot: ScanSnapshot<unknown>;
    onRefresh: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="min-w-0 flex-1" role="status">
                <p className="text-sm text-slate-300">
                    {t(snapshot.scanning ? 'scan.progress' : 'scan.complete', {
                        directories: snapshot.directories, found: snapshot.items.length,
                    })}
                </p>
                {snapshot.error && (
                    <p role="alert" className="mt-1 text-xs text-amber-400" title={snapshot.error}>
                        {t(snapshot.items.length ? 'scan.partialError' : 'scan.failed')}
                    </p>
                )}
                {snapshot.scanning && snapshot.currentPath && (
                    <p className="mt-1 truncate text-xs text-slate-500" title={snapshot.currentPath}>{snapshot.currentPath}</p>
                )}
            </div>
            <button
                type="button"
                disabled={snapshot.scanning}
                onClick={onRefresh}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
                <RefreshCw size={14} className={snapshot.scanning ? 'animate-spin' : ''} />
                {t(snapshot.scanning ? 'scan.scanning' : 'scan.refresh')}
            </button>
        </div>
    );
}
