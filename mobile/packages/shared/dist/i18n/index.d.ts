export type TranslationKey = string;
export declare function setLocale(localeCode: string): void;
export declare function getLocale(): string;
export declare function t(key: TranslationKey, params?: Record<string, string | number>): string;
export { useTranslation } from './useTranslation';
