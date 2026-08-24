"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const SecureStore = __importStar(require("expo-secure-store"));
const api_1 = require("../api");
const TOKEN_KEY = 'auth_token';
const AuthContext = (0, react_1.createContext)(null);
function AuthProvider({ children }) {
    const [state, setState] = (0, react_1.useState)({
        user: null,
        token: null,
        isLoading: true,
        isAuthenticated: false,
    });
    (0, react_1.useEffect)(() => {
        api_1.api.setOnUnauthorized(() => {
            api_1.api.clearToken();
            SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => { });
            setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
        });
        loadStoredAuth();
    }, []);
    function loadStoredAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = yield SecureStore.getItemAsync(TOKEN_KEY);
                if (token) {
                    api_1.api.setToken(token);
                    const user = yield api_1.auth.me();
                    setState({ user, token, isLoading: false, isAuthenticated: true });
                }
                else {
                    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
                }
            }
            catch (err) {
                api_1.api.clearToken();
                yield SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => { });
                setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
            }
        });
    }
    const login = (0, react_1.useCallback)((email, password) => __awaiter(this, void 0, void 0, function* () {
        const { user, token } = yield api_1.auth.login(email, password);
        api_1.api.setToken(token);
        setState({ user, token, isLoading: false, isAuthenticated: true });
        return user;
    }), []);
    const register = (0, react_1.useCallback)((data) => __awaiter(this, void 0, void 0, function* () {
        const { user, token } = yield api_1.auth.register(data);
        api_1.api.setToken(token);
        setState({ user, token, isLoading: false, isAuthenticated: true });
        return user;
    }), []);
    const logout = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        try {
            yield api_1.auth.logout();
        }
        catch (_a) { }
        api_1.api.clearToken();
        yield SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => { });
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
    }), []);
    const refreshUser = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield api_1.auth.me();
            setState((prev) => (Object.assign(Object.assign({}, prev), { user })));
        }
        catch (_a) { }
    }), []);
    const refreshToken = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        try {
            const stored = yield SecureStore.getItemAsync(TOKEN_KEY);
            if (!stored) {
                setState((prev) => (Object.assign(Object.assign({}, prev), { token: null, isAuthenticated: false })));
                return null;
            }
            api_1.api.setToken(stored);
            yield api_1.auth.me();
            return stored;
        }
        catch (_a) {
            api_1.api.clearToken();
            yield SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => { });
            setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
            return null;
        }
    }), []);
    return ((0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: Object.assign(Object.assign({}, state), { login, register, logout, refreshUser, refreshToken }), children: children }));
}
function useAuth() {
    const ctx = (0, react_1.useContext)(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
