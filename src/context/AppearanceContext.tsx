import React, { createContext, useContext, useEffect, useState } from 'react';

export type AccentColor = 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'red';
export type BgEffect = 'gradient' | 'flat' | 'glass';
export type FontSize = 'normal' | 'large' | 'xlarge';

interface AppearanceState {
    accentColor: AccentColor;
    compactMode: boolean;
    bgEffect: BgEffect;
    reduceAnimations: boolean;
    fontSize: FontSize;
    setAccentColor: (c: AccentColor) => void;
    setCompactMode: (b: boolean) => void;
    setBgEffect: (e: BgEffect) => void;
    setReduceAnimations: (b: boolean) => void;
    setFontSize: (s: FontSize) => void;
}

const AppearanceContext = createContext<AppearanceState | undefined>(undefined);

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [accentColor, setAccentColor] = useState<AccentColor>(() =>
        (localStorage.getItem('appearance_accent') as AccentColor) || 'blue'
    );
    const [compactMode, setCompactMode] = useState<boolean>(() =>
        localStorage.getItem('appearance_compact') === 'true'
    );
    const [bgEffect, setBgEffect] = useState<BgEffect>(() =>
        (localStorage.getItem('appearance_bg') as BgEffect) || 'gradient'
    );
    const [reduceAnimations, setReduceAnimations] = useState<boolean>(() =>
        localStorage.getItem('appearance_animations') === 'true'
    );
    const [fontSize, setFontSize] = useState<FontSize>(() =>
        (localStorage.getItem('appearance_font') as FontSize) || 'normal'
    );

    useEffect(() => {
        localStorage.setItem('appearance_accent', accentColor);
        document.documentElement.style.setProperty('--accent-color', `var(--${accentColor}-500)`);
    }, [accentColor]);

    useEffect(() => localStorage.setItem('appearance_compact', String(compactMode)), [compactMode]);
    useEffect(() => localStorage.setItem('appearance_bg', bgEffect), [bgEffect]);
    useEffect(() => localStorage.setItem('appearance_animations', String(reduceAnimations)), [reduceAnimations]);
    useEffect(() => localStorage.setItem('appearance_font', fontSize), [fontSize]);

    return (
        <AppearanceContext.Provider value={{
            accentColor, compactMode, bgEffect, reduceAnimations, fontSize,
            setAccentColor, setCompactMode, setBgEffect, setReduceAnimations, setFontSize
        }}>
            {children}
        </AppearanceContext.Provider>
    );
};

export const useAppearance = () => {
    const context = useContext(AppearanceContext);
    if (!context) throw new Error('useAppearance must be used within AppearanceProvider');
    return context;
};
