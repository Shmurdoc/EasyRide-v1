import type { TranslationKey } from './index';
export declare function useTranslation(): {
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
    locale: string;
};
