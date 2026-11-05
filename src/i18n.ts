import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import tr from './locales/tr.json';
import zhCN from './locales/zh-CN.json';

const updateDocumentLanguage = (language: string) => {
    document.documentElement.lang = language;
};

i18n.on('languageChanged', updateDocumentLanguage);

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            tr: { translation: tr },
            'zh-CN': { translation: zhCN },
        },
        supportedLngs: ['en', 'tr', 'zh-CN'],
        fallbackLng: 'tr', 
        interpolation: {
            escapeValue: false, 
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'], 
            lookupLocalStorage: 'i18nextLng', 
            convertDetectedLanguage: (language: string) =>
                /^zh(?:-|$)/i.test(language.replace(/_/g, '-')) ? 'zh-CN' : language,
        }
    });

export default i18n;
