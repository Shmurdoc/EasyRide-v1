export declare function generateRouteCoords(from: {
    lat: number;
    lng: number;
}, to: {
    lat: number;
    lng: number;
}): Array<{
    latitude: number;
    longitude: number;
}>;
export declare function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare function formatDistance(km: number): string;
export declare function formatDuration(minutes: number): string;
export declare function formatZAR(amount: number | string): string;
export declare function getGreeting(): string;
