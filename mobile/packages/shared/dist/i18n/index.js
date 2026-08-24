"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTranslation = void 0;
exports.setLocale = setLocale;
exports.getLocale = getLocale;
exports.t = t;
const expo_localization_1 = require("expo-localization");
const en_1 = __importDefault(require("./en"));
let translations = en_1.default;
let locale = (_c = (_b = (_a = (0, expo_localization_1.getLocales)()) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.languageTag) !== null && _c !== void 0 ? _c : 'en-US';
function setLocale(localeCode) {
    locale = localeCode;
}
function getLocale() {
    return locale;
}
function getNestedValue(obj, path) {
    let current = obj;
    for (const key of path) {
        if (current == null || typeof current !== 'object')
            return undefined;
        current = current[key];
    }
    return typeof current === 'string' ? current : undefined;
}
function t(key, params) {
    const path = key.split('.');
    let value = getNestedValue(translations, path);
    if (!value) {
        return key;
    }
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            value = value.replace(`{${k}}`, String(v));
        }
    }
    return value;
}
// Re-export hook so consumers can import it from the package root via
// `import { useTranslation } from '@easyryde/shared'`.
var useTranslation_1 = require("./useTranslation");
Object.defineProperty(exports, "useTranslation", { enumerable: true, get: function () { return useTranslation_1.useTranslation; } });
