export interface BusinessIdentity {
    id: string;
    name: string;
    type: 'restaurant' | 'stay' | 'rental' | 'trip' | 'shop' | 'bar' | 'beauty' | 'service';
    primaryColor: string;
    gradientStart: string;
    gradientEnd: string;
    accentColor: string;
    logo: string;
    verified: boolean;
}
export declare const BUSINESSES: BusinessIdentity[];
export declare function getBusinessById(id: string): BusinessIdentity | undefined;
export declare function getBusinessesByType(type: BusinessIdentity['type']): BusinessIdentity[];
