import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface DialogConfig {
    type: 'alert' | 'confirm';
    variant?: 'default' | 'destructive' | 'success';
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmationModal: React.FC<{ config: DialogConfig }> = ({ config }) => {
    const { t } = useTranslation();
    const variant = config.variant || 'default';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl w-[420px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-full mb-5 shadow-inner ${variant === 'destructive'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-red-500/10'
                        : variant === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10'
                            : 'bg-primary/10 text-primary border border-primary/20 shadow-primary/10'
                        }`}>
                        {variant === 'destructive'
                            ? <AlertTriangle size={36} strokeWidth={1.5} />
                            : variant === 'success'
                                ? <CheckCircle2 size={36} strokeWidth={1.5} />
                                : <Info size={36} strokeWidth={1.5} />}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{config.title}</h3>
                    <div className="text-sm text-slate-300 leading-relaxed mb-8">
                        {config.message}
                    </div>

                    <div className="flex w-full gap-3">
                        {config.type === 'confirm' && (
                            <button
                                onClick={config.onClose}
                                className="flex-1 py-3 text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl transition-all border border-white/5"
                                autoFocus={true}
                            >
                                {config.cancelText || t('config.cancel')}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                config.onClose();
                                config.onConfirm();
                            }}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all border
                                ${variant === 'destructive'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300'
                                    : variant === 'success'
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500/50 shadow-emerald-500/20 shadow-lg'
                                        : 'bg-[var(--accent-color)] text-white hover:brightness-110 border-white/10 shadow-[var(--accent-color)]/20 shadow-lg'}`}
                            autoFocus={config.type === 'alert'}
                        >
                            {config.confirmText || (config.type === 'alert' ? 'OK' : t('config.save'))}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
