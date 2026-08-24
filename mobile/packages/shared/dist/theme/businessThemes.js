"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSINESS_THEMES = void 0;
exports.getBusinessTheme = getBusinessTheme;
exports.BUSINESS_THEMES = {
    rides: {
        id: 'biz-rides',
        name: 'EasyRyde Rides',
        slug: 'rides',
        colors: {
            primary: '#7C3AED',
            primaryLight: '#A78BFA',
            primaryDark: '#5B21B6',
            accent: '#8B5CF6',
            accentLight: '#C4B5FD',
            gradient: ['#5B21B6', '#7C3AED'],
            gradientLight: ['#5B21B6', '#7C3AED', '#A78BFA'],
            gradientDark: ['#2E1065', '#5B21B6'],
            glow: 'rgba(124, 58, 237, 0.35)',
            tabActive: '#7C3AED',
            tabInactive: '#9CA3AF',
            badge: '#7C3AED',
            badgeText: '#FFFFFF',
            marker: '#7C3AED',
            sos: '#DC2626',
            earn: '#7C3AED',
            surface: '#FFFFFF',
            surfaceLight: '#F5F3FF',
            surfaceBorder: '#E5E7EB',
            text: '#1F2937',
            textSecondary: '#6B7280',
            textMuted: '#9CA3AF',
            bg: '#F9FAFB',
        },
        logo: {
            icon: '\ud83d\ude97',
            text: 'EasyRyde',
            mark: 'ER',
            full: 'EasyRyde Rides',
        },
        branding: {
            tagline: 'Your ride, your way',
            keywords: ['ride', 'hail', 'pickup', 'dropoff', 'carpool'],
        },
    },
    food: {
        id: 'biz-food',
        name: 'EasyRyde Food',
        slug: 'food',
        colors: {
            primary: '#EA580C',
            primaryLight: '#FB923C',
            primaryDark: '#C2410C',
            accent: '#F97316',
            accentLight: '#FED7AA',
            gradient: ['#C2410C', '#EA580C'],
            gradientLight: ['#C2410C', '#EA580C', '#FB923C'],
            gradientDark: ['#7C2D12', '#C2410C'],
            glow: 'rgba(234, 88, 12, 0.35)',
            tabActive: '#EA580C',
            tabInactive: '#9CA3AF',
            badge: '#EA580C',
            badgeText: '#FFFFFF',
            marker: '#EA580C',
            sos: '#DC2626',
            earn: '#EA580C',
            surface: '#FFFFFF',
            surfaceLight: '#FFF7ED',
            surfaceBorder: '#E5E7EB',
            text: '#1F2937',
            textSecondary: '#6B7280',
            textMuted: '#9CA3AF',
            bg: '#F9FAFB',
        },
        logo: {
            icon: '\ud83c\udf54',
            text: 'EasyRyde',
            mark: 'EF',
            full: 'EasyRyde Food',
        },
        branding: {
            tagline: 'Food delivered fast',
            keywords: ['food', 'delivery', 'restaurant', 'takeout', 'order'],
        },
    },
};
function getBusinessTheme(slug) {
    return exports.BUSINESS_THEMES[slug];
}
