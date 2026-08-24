export declare function formatCurrency(amount: number, currency?: string): string;
export declare function formatDate(dateString: string): string;
export declare function formatTime(dateString: string): string;
export declare function formatDateTime(dateString: string): string;
export { formatDistance, formatDuration, formatZAR, calculateDistance, generateRouteCoords, getGreeting } from './mapUtils';
export type {} from './mapUtils';
export declare function truncate(str: string, maxLength: number): string;
export declare function validateEmail(email: string): boolean;
export declare function validatePhone(phone: string): boolean;
export declare function decodePolyline(encoded: string): {
    latitude: number;
    longitude: number;
}[];
export declare function generateId(): string;
