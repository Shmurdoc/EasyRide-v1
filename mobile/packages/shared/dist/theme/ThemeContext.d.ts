import React from 'react';
export declare const theme: {
    readonly colors: {
        readonly ink: "#0F1713";
        readonly ink2: "#44514A";
        readonly muted: "#8A978F";
        readonly bg: "#F2F4F1";
        readonly card: "#FFFFFF";
        readonly line: "#E5EAE4";
        readonly brand: "#0A7C4E";
        readonly brandLight: "#12A86B";
        readonly brandDark: "#0B3B2A";
        readonly brandLightBg: "#E7F5EE";
        readonly primary: "#0A7C4E";
        readonly primaryLight: "#12A86B";
        readonly primaryDark: "#0B3B2A";
        readonly primaryGlow: "rgba(10, 124, 78, 0.25)";
        readonly success: "#0A7C4E";
        readonly successLight: "#12A86B";
        readonly successGlow: "rgba(10, 124, 78, 0.25)";
        readonly error: "#E5484D";
        readonly errorDark: "#B72B30";
        readonly errorGlow: "rgba(229, 72, 77, 0.25)";
        readonly warning: "#F5A524";
        readonly info: "#2E6BF0";
        readonly amber: "#F5A524";
        readonly purple: "#7C3AED";
        readonly teal: "#0E9488";
        readonly text: "#0F1713";
        readonly textSecondary: "#44514A";
        readonly textMuted: "#8A978F";
        readonly textDim: "#C6CFC8";
        readonly textOnDark: "#FFFFFF";
        readonly surface: "#FFFFFF";
        readonly surfaceElevated: "#FFFFFF";
        readonly surfaceLight: "#F2F4F1";
        readonly surfaceBorder: "#E5EAE4";
        readonly border: "#E5EAE4";
        readonly borderLight: "#E5EAE4";
        readonly borderFocus: "rgba(10, 124, 78, 0.5)";
        readonly glass: "rgba(255, 255, 255, 0.86)";
        readonly glassBorder: "rgba(229, 234, 228, 0.8)";
        readonly overlay: "rgba(8, 12, 10, 0.5)";
        readonly white: "#FFFFFF";
        readonly black: "#0F1713";
        readonly orange: "#0A7C4E";
        readonly orangeDark: "#0B3B2A";
        readonly green: "#0A7C4E";
        readonly greenLight: "#12A86B";
        readonly red: "#E5484D";
        readonly blue: "#2E6BF0";
    };
    readonly typography: {
        readonly fontFamily: "Inter_400Regular";
        readonly hero: {
            readonly fontFamily: "Poppins_800ExtraBold";
            readonly fontSize: 24;
            readonly lineHeight: 30;
            readonly letterSpacing: 0.2;
        };
        readonly h1: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 20;
            readonly lineHeight: 26;
            readonly letterSpacing: 0.1;
        };
        readonly h2: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 17;
            readonly lineHeight: 22;
        };
        readonly h3: {
            readonly fontFamily: "Poppins_600SemiBold";
            readonly fontSize: 15;
            readonly lineHeight: 20;
        };
        readonly h4: {
            readonly fontFamily: "Poppins_600SemiBold";
            readonly fontSize: 14;
            readonly lineHeight: 19;
        };
        readonly section: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 16.5;
            readonly lineHeight: 22;
        };
        readonly bodyLg: {
            readonly fontFamily: "Inter_500Medium";
            readonly fontSize: 14;
            readonly lineHeight: 21;
        };
        readonly body: {
            readonly fontFamily: "Inter_400Regular";
            readonly fontSize: 13;
            readonly lineHeight: 19;
        };
        readonly bodySmall: {
            readonly fontFamily: "Inter_400Regular";
            readonly fontSize: 13;
            readonly lineHeight: 19;
        };
        readonly small: {
            readonly fontFamily: "Inter_500Medium";
            readonly fontSize: 11.5;
            readonly lineHeight: 16;
        };
        readonly xs: {
            readonly fontFamily: "Inter_600SemiBold";
            readonly fontSize: 10.5;
            readonly lineHeight: 14;
        };
        readonly micro: {
            readonly fontFamily: "Inter_700Bold";
            readonly fontSize: 9.5;
            readonly lineHeight: 13;
        };
        readonly price: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 16;
            readonly lineHeight: 22;
        };
        readonly badge: {
            readonly fontFamily: "Inter_700Bold";
            readonly fontSize: 10.5;
            readonly lineHeight: 14;
        };
        readonly kicker: {
            readonly fontFamily: "Inter_700Bold";
            readonly fontSize: 10.5;
            readonly lineHeight: 14;
            readonly letterSpacing: 1.6;
        };
        readonly button: {
            readonly fontFamily: "Inter_700Bold";
            readonly fontSize: 14;
            readonly lineHeight: 20;
        };
        readonly buttonLarge: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 16;
            readonly lineHeight: 22;
            readonly letterSpacing: 0.5;
        };
        readonly caption: {
            readonly fontFamily: "Inter_400Regular";
            readonly fontSize: 12;
            readonly lineHeight: 16;
        };
        readonly label: {
            readonly fontFamily: "Inter_500Medium";
            readonly fontSize: 13;
            readonly lineHeight: 18;
            readonly letterSpacing: 0.8;
        };
        readonly eta: {
            readonly fontFamily: "Poppins_800ExtraBold";
            readonly fontSize: 42;
            readonly lineHeight: 48;
            readonly letterSpacing: -1;
        };
    };
    readonly spacing: {
        readonly xs: 4;
        readonly sm: 8;
        readonly md: 12;
        readonly base: 16;
        readonly lg: 24;
        readonly xl: 32;
        readonly '2xl': 48;
        readonly '3xl': 64;
    };
    readonly radius: {
        readonly xs: 6;
        readonly sm: 8;
        readonly md: 12;
        readonly lg: 18;
        readonly xl: 22;
        readonly '2xl': 28;
        readonly full: 9999;
        readonly tile: 20;
    };
    readonly shadows: {
        readonly subtle: {
            readonly shadowColor: "#0F1713";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 1;
            };
            readonly shadowOpacity: 0.06;
            readonly shadowRadius: 3;
            readonly elevation: 1;
        };
        readonly moderate: {
            readonly shadowColor: "#0F1713";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 6;
            };
            readonly shadowOpacity: 0.1;
            readonly shadowRadius: 18;
            readonly elevation: 4;
        };
        readonly elevated: {
            readonly shadowColor: "#0F1713";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 18;
            };
            readonly shadowOpacity: 0.18;
            readonly shadowRadius: 44;
            readonly elevation: 8;
        };
        readonly glow: {
            readonly shadowColor: "#0A7C4E";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 0;
            };
            readonly shadowOpacity: 0.45;
            readonly shadowRadius: 24;
            readonly elevation: 8;
        };
        readonly glowSuccess: {
            readonly shadowColor: "#0A7C4E";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 0;
            };
            readonly shadowOpacity: 0.35;
            readonly shadowRadius: 16;
            readonly elevation: 6;
        };
        readonly glowError: {
            readonly shadowColor: "#E5484D";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 0;
            };
            readonly shadowOpacity: 0.35;
            readonly shadowRadius: 16;
            readonly elevation: 6;
        };
    };
    readonly borders: {
        readonly standard: {
            readonly borderWidth: 1;
            readonly borderColor: "#E5EAE4";
            readonly borderStyle: "solid";
        };
        readonly light: {
            readonly borderWidth: 1;
            readonly borderColor: "#E5EAE4";
            readonly borderStyle: "solid";
        };
        readonly focus: {
            readonly borderWidth: 1.5;
            readonly borderColor: "rgba(10, 124, 78, 0.5)";
            readonly borderStyle: "solid";
        };
        readonly glass: {
            readonly borderWidth: 1;
            readonly borderColor: "rgba(229, 234, 228, 0.8)";
            readonly borderStyle: "solid";
        };
    };
    readonly animation: {
        readonly screenEnter: {
            readonly duration: 380;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly screenExit: {
            readonly duration: 380;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly sheetEnter: {
            readonly duration: 340;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly sheetExit: {
            readonly duration: 300;
            readonly easing: "ease-out";
        };
        readonly pressScale: 0.92;
        readonly pressScaleCard: 0.97;
        readonly pressScaleChip: 0.9;
        readonly pressScaleBig: 0.95;
        readonly pressScaleBtn: 0.98;
        readonly pressDuration: 150;
        readonly sosPulse: {
            readonly duration: 2400;
            readonly easing: "ease-in-out";
            readonly loop: true;
        };
        readonly breathe: {
            readonly duration: 2400;
            readonly easing: "ease-in-out";
            readonly loop: true;
        };
        readonly bob: {
            readonly duration: 2200;
            readonly easing: "ease-in-out";
            readonly loop: true;
        };
        readonly shimmer: 1200;
        readonly successPop: {
            readonly duration: 450;
            readonly easing: readonly [0.2, 1.4, 0.4, 1];
        };
        readonly progressFill: {
            readonly duration: 1000;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly toastEnter: {
            readonly duration: 350;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly toastExit: {
            readonly duration: 350;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly spring: {
            readonly speed: 50;
            readonly bounciness: 4;
        };
        readonly springFast: {
            readonly speed: 70;
            readonly bounciness: 4;
        };
        readonly springSlow: {
            readonly speed: 30;
            readonly bounciness: 6;
        };
        readonly durationFast: 200;
        readonly durationNormal: 300;
        readonly durationSlow: 500;
        readonly pulse: {
            readonly min: 0.3;
            readonly max: 1;
            readonly duration: 1200;
        };
        readonly pulseFast: {
            readonly min: 0.4;
            readonly max: 1;
            readonly duration: 800;
        };
        readonly modal: {
            readonly enter: 250;
            readonly exit: 200;
        };
    };
    readonly zIndex: {
        readonly base: 0;
        readonly surface: 10;
        readonly dropdown: 50;
        readonly header: 100;
        readonly modal: 1000;
        readonly overlay: 2000;
        readonly toast: 3000;
        readonly tooltip: 4000;
    };
};
export type Theme = typeof theme;
export declare function ThemeProvider({ children }: {
    children: React.ReactNode;
}): React.FunctionComponentElement<React.ProviderProps<{
    readonly colors: {
        readonly ink: "#0F1713";
        readonly ink2: "#44514A";
        readonly muted: "#8A978F";
        readonly bg: "#F2F4F1";
        readonly card: "#FFFFFF";
        readonly line: "#E5EAE4";
        readonly brand: "#0A7C4E";
        readonly brandLight: "#12A86B";
        readonly brandDark: "#0B3B2A";
        readonly brandLightBg: "#E7F5EE";
        readonly primary: "#0A7C4E";
        readonly primaryLight: "#12A86B";
        readonly primaryDark: "#0B3B2A";
        readonly primaryGlow: "rgba(10, 124, 78, 0.25)";
        readonly success: "#0A7C4E";
        readonly successLight: "#12A86B";
        readonly successGlow: "rgba(10, 124, 78, 0.25)";
        readonly error: "#E5484D";
        readonly errorDark: "#B72B30";
        readonly errorGlow: "rgba(229, 72, 77, 0.25)";
        readonly warning: "#F5A524";
        readonly info: "#2E6BF0";
        readonly amber: "#F5A524";
        readonly purple: "#7C3AED";
        readonly teal: "#0E9488";
        readonly text: "#0F1713";
        readonly textSecondary: "#44514A";
        readonly textMuted: "#8A978F";
        readonly textDim: "#C6CFC8";
        readonly textOnDark: "#FFFFFF";
        readonly surface: "#FFFFFF";
        readonly surfaceElevated: "#FFFFFF";
        readonly surfaceLight: "#F2F4F1";
        readonly surfaceBorder: "#E5EAE4";
        readonly border: "#E5EAE4";
        readonly borderLight: "#E5EAE4";
        readonly borderFocus: "rgba(10, 124, 78, 0.5)";
        readonly glass: "rgba(255, 255, 255, 0.86)";
        readonly glassBorder: "rgba(229, 234, 228, 0.8)";
        readonly overlay: "rgba(8, 12, 10, 0.5)";
        readonly white: "#FFFFFF";
        readonly black: "#0F1713";
        readonly orange: "#0A7C4E";
        readonly orangeDark: "#0B3B2A";
        readonly green: "#0A7C4E";
        readonly greenLight: "#12A86B";
        readonly red: "#E5484D";
        readonly blue: "#2E6BF0";
    };
    readonly typography: {
        readonly fontFamily: "Inter_400Regular";
        readonly hero: {
            readonly fontFamily: "Poppins_800ExtraBold";
            readonly fontSize: 24;
            readonly lineHeight: 30;
            readonly letterSpacing: 0.2;
        };
        readonly h1: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 20;
            readonly lineHeight: 26;
            readonly letterSpacing: 0.1;
        };
        readonly h2: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 17;
            readonly lineHeight: 22;
        };
        readonly h3: {
            readonly fontFamily: "Poppins_600SemiBold";
            readonly fontSize: 15;
            readonly lineHeight: 20;
        };
        readonly h4: {
            readonly fontFamily: "Poppins_600SemiBold";
            readonly fontSize: 14;
            readonly lineHeight: 19;
        };
        readonly section: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 16.5;
            readonly lineHeight: 22;
        };
        readonly bodyLg: {
            readonly fontFamily: "Inter_500Medium";
            readonly fontSize: 14;
            readonly lineHeight: 21;
        };
        readonly body: {
            readonly fontFamily: "Inter_400Regular";
            readonly fontSize: 13;
            readonly lineHeight: 19;
        };
        readonly bodySmall: {
            readonly fontFamily: "Inter_400Regular";
            readonly fontSize: 13;
            readonly lineHeight: 19;
        };
        readonly small: {
            readonly fontFamily: "Inter_500Medium";
            readonly fontSize: 11.5;
            readonly lineHeight: 16;
        };
        readonly xs: {
            readonly fontFamily: "Inter_600SemiBold";
            readonly fontSize: 10.5;
            readonly lineHeight: 14;
        };
        readonly micro: {
            readonly fontFamily: "Inter_700Bold";
            readonly fontSize: 9.5;
            readonly lineHeight: 13;
        };
        readonly price: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 16;
            readonly lineHeight: 22;
        };
        readonly badge: {
            readonly fontFamily: "Inter_700Bold";
            readonly fontSize: 10.5;
            readonly lineHeight: 14;
        };
        readonly kicker: {
            readonly fontFamily: "Inter_700Bold";
            readonly fontSize: 10.5;
            readonly lineHeight: 14;
            readonly letterSpacing: 1.6;
        };
        readonly button: {
            readonly fontFamily: "Inter_700Bold";
            readonly fontSize: 14;
            readonly lineHeight: 20;
        };
        readonly buttonLarge: {
            readonly fontFamily: "Poppins_700Bold";
            readonly fontSize: 16;
            readonly lineHeight: 22;
            readonly letterSpacing: 0.5;
        };
        readonly caption: {
            readonly fontFamily: "Inter_400Regular";
            readonly fontSize: 12;
            readonly lineHeight: 16;
        };
        readonly label: {
            readonly fontFamily: "Inter_500Medium";
            readonly fontSize: 13;
            readonly lineHeight: 18;
            readonly letterSpacing: 0.8;
        };
        readonly eta: {
            readonly fontFamily: "Poppins_800ExtraBold";
            readonly fontSize: 42;
            readonly lineHeight: 48;
            readonly letterSpacing: -1;
        };
    };
    readonly spacing: {
        readonly xs: 4;
        readonly sm: 8;
        readonly md: 12;
        readonly base: 16;
        readonly lg: 24;
        readonly xl: 32;
        readonly '2xl': 48;
        readonly '3xl': 64;
    };
    readonly radius: {
        readonly xs: 6;
        readonly sm: 8;
        readonly md: 12;
        readonly lg: 18;
        readonly xl: 22;
        readonly '2xl': 28;
        readonly full: 9999;
        readonly tile: 20;
    };
    readonly shadows: {
        readonly subtle: {
            readonly shadowColor: "#0F1713";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 1;
            };
            readonly shadowOpacity: 0.06;
            readonly shadowRadius: 3;
            readonly elevation: 1;
        };
        readonly moderate: {
            readonly shadowColor: "#0F1713";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 6;
            };
            readonly shadowOpacity: 0.1;
            readonly shadowRadius: 18;
            readonly elevation: 4;
        };
        readonly elevated: {
            readonly shadowColor: "#0F1713";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 18;
            };
            readonly shadowOpacity: 0.18;
            readonly shadowRadius: 44;
            readonly elevation: 8;
        };
        readonly glow: {
            readonly shadowColor: "#0A7C4E";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 0;
            };
            readonly shadowOpacity: 0.45;
            readonly shadowRadius: 24;
            readonly elevation: 8;
        };
        readonly glowSuccess: {
            readonly shadowColor: "#0A7C4E";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 0;
            };
            readonly shadowOpacity: 0.35;
            readonly shadowRadius: 16;
            readonly elevation: 6;
        };
        readonly glowError: {
            readonly shadowColor: "#E5484D";
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 0;
            };
            readonly shadowOpacity: 0.35;
            readonly shadowRadius: 16;
            readonly elevation: 6;
        };
    };
    readonly borders: {
        readonly standard: {
            readonly borderWidth: 1;
            readonly borderColor: "#E5EAE4";
            readonly borderStyle: "solid";
        };
        readonly light: {
            readonly borderWidth: 1;
            readonly borderColor: "#E5EAE4";
            readonly borderStyle: "solid";
        };
        readonly focus: {
            readonly borderWidth: 1.5;
            readonly borderColor: "rgba(10, 124, 78, 0.5)";
            readonly borderStyle: "solid";
        };
        readonly glass: {
            readonly borderWidth: 1;
            readonly borderColor: "rgba(229, 234, 228, 0.8)";
            readonly borderStyle: "solid";
        };
    };
    readonly animation: {
        readonly screenEnter: {
            readonly duration: 380;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly screenExit: {
            readonly duration: 380;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly sheetEnter: {
            readonly duration: 340;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly sheetExit: {
            readonly duration: 300;
            readonly easing: "ease-out";
        };
        readonly pressScale: 0.92;
        readonly pressScaleCard: 0.97;
        readonly pressScaleChip: 0.9;
        readonly pressScaleBig: 0.95;
        readonly pressScaleBtn: 0.98;
        readonly pressDuration: 150;
        readonly sosPulse: {
            readonly duration: 2400;
            readonly easing: "ease-in-out";
            readonly loop: true;
        };
        readonly breathe: {
            readonly duration: 2400;
            readonly easing: "ease-in-out";
            readonly loop: true;
        };
        readonly bob: {
            readonly duration: 2200;
            readonly easing: "ease-in-out";
            readonly loop: true;
        };
        readonly shimmer: 1200;
        readonly successPop: {
            readonly duration: 450;
            readonly easing: readonly [0.2, 1.4, 0.4, 1];
        };
        readonly progressFill: {
            readonly duration: 1000;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly toastEnter: {
            readonly duration: 350;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly toastExit: {
            readonly duration: 350;
            readonly easing: readonly [0.22, 0.9, 0.24, 1];
        };
        readonly spring: {
            readonly speed: 50;
            readonly bounciness: 4;
        };
        readonly springFast: {
            readonly speed: 70;
            readonly bounciness: 4;
        };
        readonly springSlow: {
            readonly speed: 30;
            readonly bounciness: 6;
        };
        readonly durationFast: 200;
        readonly durationNormal: 300;
        readonly durationSlow: 500;
        readonly pulse: {
            readonly min: 0.3;
            readonly max: 1;
            readonly duration: 1200;
        };
        readonly pulseFast: {
            readonly min: 0.4;
            readonly max: 1;
            readonly duration: 800;
        };
        readonly modal: {
            readonly enter: 250;
            readonly exit: 200;
        };
    };
    readonly zIndex: {
        readonly base: 0;
        readonly surface: 10;
        readonly dropdown: 50;
        readonly header: 100;
        readonly modal: 1000;
        readonly overlay: 2000;
        readonly toast: 3000;
        readonly tooltip: 4000;
    };
}>>;
export declare function useTheme(): Theme;
