import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
    return (
        <div className="h-8 bg-transparent flex justify-between items-center select-none" style={{ WebkitAppRegion: 'drag' } as any}>
            <div className="px-4 text-xs text-slate-500 font-medium">
            </div>
            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    onClick={() => window.unreal.minimize()}
                    className="h-full w-12 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={() => window.unreal.maximize()}
                    className="h-full w-12 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                    <Square size={14} />
                </button>
                <button
                    onClick={() => window.unreal.close()}
                    className="h-full w-12 flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
