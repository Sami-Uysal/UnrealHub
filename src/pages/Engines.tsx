import React, { useEffect, useState } from 'react';
import { Engine } from '../types';



export const EnginesPage: React.FC = () => {
    const [engines, setEngines] = useState<Engine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEngines = async () => {
            try {
                const data = await window.unreal.getEngines();
                setEngines(data);
            } finally {
                setLoading(false);
            }
        };
        loadEngines();
    }, []);



    if (loading) return <div className="text-slate-400">Motorlar taranıyor...</div>;

    return (
        <div>
            <div className="flex items-center space-x-4 mb-6">
                <h2 className="text-xl font-bold text-slate-200 tracking-wide">MOTOR SÜRÜMLERİ</h2>
                <div className="h-px bg-slate-700 flex-1 ml-4"></div>
            </div>

            {engines.length === 0 ? (
                <div className="text-slate-500 border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/50">
                    <h3 className="text-lg font-medium text-slate-300">Motor Bulunamadı</h3>
                    <p className="mt-2 text-sm">Ayarlar sayfasından motor kurulu klasörleri ekleyebilirsiniz.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {engines.map((engine) => (
                        <div key={engine.path} className="bg-slate-800/50 border-l-4 border-amber-500 p-4 md:p-6 rounded-r-xl flex items-center justify-between relative overflow-hidden group min-w-0">
                            {/* Background Logo */}
                            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-white">
                                <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4ZM10.5 7V17H13.5V7H10.5ZM8 9V15H9.5V9H8ZM14.5 9V15H16V9H14.5Z" />
                                </svg>
                            </div>
                            <div className="flex items-center space-x-4 z-10 relative min-w-0 flex-shrink">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-900 flex items-center justify-center shadow-xl overflow-hidden p-2 flex-shrink-0">
                                    <img src="ue-logo.png" alt="UE" className="w-full h-full object-contain filter invert" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-2xl md:text-3xl font-light text-white tracking-tighter truncate">{engine.version}</h3>
                                </div>
                            </div>

                            <div className="flex items-center z-10 flex-shrink-0 ml-4">
                                <button
                                    onClick={() => window.unreal.launchEngine(engine.path)}
                                    className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded flex items-center justify-center hover:scale-105 transition-transform text-sm whitespace-nowrap"
                                >
                                    <span>Başlat</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
