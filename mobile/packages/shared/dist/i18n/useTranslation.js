"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTranslation = useTranslation;
const react_1 = require("react");
const index_1 = require("./index");
function useTranslation() {
    const translate = (0, react_1.useCallback)((key, params) => (0, index_1.t)(key, params), []);
    return { t: translate, locale: (0, index_1.getLocale)() };
}
