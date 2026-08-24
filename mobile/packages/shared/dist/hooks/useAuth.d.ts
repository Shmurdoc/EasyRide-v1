import { type ReactNode } from 'react';
import type { User } from '../types';
interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}
interface AuthContextValue extends AuthState {
    login: (email: string, password: string) => Promise<User>;
    register: (data: {
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
        phone_number: string;
    }) => Promise<User>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    refreshToken: () => Promise<string | null>;
}
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextValue;
export {};
