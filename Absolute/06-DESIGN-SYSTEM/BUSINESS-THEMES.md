# Business Isolation Themes — Design Document

> **Document**: 06-DESIGN-SYSTEM/BUSINESS-THEMES.md  
> **Status**: COMPLETE (v2 — admin theme added)  
> **Ticket**: TASK-DSN-001  
> **Owner**: designer-1785371307946  

---

## 1. Objective

Create a per-business theming system so each EasyRyde line of business (Rides, Food, etc.) has its own distinct visual identity — colors, logo, branding — that can be switched at the app level or driven by backend configuration.

---

## 2. Theme Architecture

```
ThemeProvider (base tokens — typography, spacing, radii, shadows)
  └── BusinessThemeProvider (per-business colors, logos, branding)
        └── Screens use useBusinessTheme() to access active theme
```

### Layer Separation

| Layer | File | Purpose |
|-------|------|---------|
| Base Theme | `ThemeContext.tsx` | Typography, spacing, radius, shadows (shared across all businesses) |
| Business Themes | `businessThemes.ts` | Per-business color palettes, logo strings, brand taglines |
| Business Context | `BusinessThemeContext.tsx` | Provider/consumer that selects and exposes the active theme |
| Backend Driver | `BusinessIdentity` type | Runtime business selection from backend config |

---

## 3. Theme Shape

```typescript
interface BusinessTheme {
  id: string;           // unique identifier
  name: string;         // display name
  slug: string;         // programmatic key ('rides' | 'food' | 'admin')
  colors: {             // complete color palette
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    gradient: readonly [string, string];
    gradientLight: readonly [string, string, string];
    gradientDark: readonly [string, string];
    glow: string;
    tabActive: string;
    tabInactive: string;
    badge: string;
    badgeText: string;
    marker: string;
    sos: string;
    earn: string;
    surface: string;
    surfaceLight: string;
    surfaceBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    bg: string;
  };
  logo: {
    icon: string;       // emoji icon
    text: string;       // brand name
    mark: string;       // monogram (e.g. "ER", "EF")
    full: string;       // full brand name
  };
  branding: {
    tagline: string;    // marketing tagline
    keywords: string[]; // associated keywords
  };
}
```

---

## 4. Implemented Business Themes

### EasyRyde Rides — Purple (`slug: 'rides'`)

| Token | Value |
|-------|-------|
| Primary | `#7C3AED` |
| Primary Light | `#A78BFA` |
| Primary Dark | `#5B21B6` |
| Accent | `#8B5CF6` |
| Gradient | `['#5B21B6', '#7C3AED']` |
| Surface Light | `#F5F3FF` (purple tint) |
| Glow | `rgba(124, 58, 237, 0.35)` |

### EasyRyde Admin — Indigo (`slug: 'admin'`)

| Token | Value |
|-------|-------|
| Primary | `#6366f1` |
| Primary Light | `#818cf8` |
| Primary Dark | `#4f46e5` |
| Accent | `#6366f1` |
| Gradient | `['#4f46e5', '#6366f1']` |
| Surface | `#1a1a1e` (dark mode) |
| Glow | `rgba(99, 102, 241, 0.35)` |

### EasyRyde Food — Orange (`slug: 'food'`)

| Token | Value |
|-------|-------|
| Primary | `#EA580C` |
| Primary Light | `#FB923C` |
| Primary Dark | `#C2410C` |
| Accent | `#F97316` |
| Gradient | `['#C2410C', '#EA580C']` |
| Surface Light | `#FFF7ED` (orange tint) |
| Glow | `rgba(234, 88, 12, 0.35)` |

---

## 5. Usage

### In a screen component

```tsx
import { useBusinessTheme } from '@easyryde/shared';

function MyScreen() {
  const { activeTheme } = useBusinessTheme();
  const { colors: biz } = activeTheme;

  return (
    <LinearGradient colors={biz.gradient}>
      <Text style={{ color: biz.primary }}>{activeTheme.logo.mark}</Text>
    </LinearGradient>
  );
}
```

### In App.tsx

```tsx
<ThemeProvider>
  <BusinessThemeProvider slug="rides">
    <AppContent />
  </BusinessThemeProvider>
</ThemeProvider>
```

### With per-business config from backend

```tsx
<BusinessThemeProvider slug={backendConfig.businessSlug as BusinessSlug}>
```

---

## 6. Screens Updated

### Rider LoginScreen (`screens/LoginScreen.tsx`)
- Logo mark, gradient, shadow — driven by `activeTheme.logo.mark` and `activeTheme.colors.gradient`
- Login button gradient — uses `biz.primaryDark → biz.primary`
- Input focus border/icon — uses `biz.primaryLight`
- Forgot password link — uses `biz.primaryLight`
- Sign Up link — uses `biz.primaryLight`

### Rider HomeScreen (`screens/HomeScreen.tsx`)
- Hero gradient — uses `activeTheme.colors.gradient`
- RefreshControl tint — uses `activeTheme.colors.primary`

### Rider App.tsx
- Wrapped with `<BusinessThemeProvider slug="rides">`

### Driver App.tsx
- Wrapped with `<BusinessThemeProvider slug="rides">`

### Admin LoginScreen (`screens/LoginScreen.tsx`)
- Logo circle — uses `biz.gradient` (indigo)
- Logo mark — uses `activeTheme.logo.mark` ("EA")
- Brand name — uses `activeTheme.logo.text`
- Tagline — uses `activeTheme.branding.tagline`
- Login button gradient — uses `biz.primaryDark → biz.primary`
- Input icon color — uses `biz.textMuted`
- All theme-driven through `useBusinessTheme()`

### Admin App.tsx
- Wrapped with `<BusinessThemeProvider slug="admin">`

### SplashScreen (`components/SplashScreen.tsx`)
- Background gradient — uses `biz.primaryDark → biz.bg → biz.primaryDark`
- Logo gradient — uses `biz.gradient`
- Logo text — uses `activeTheme.logo.mark.charAt(0)`
- Title — uses `activeTheme.logo.full`
- Subtitle — uses `activeTheme.branding.tagline`
- Dot animation — uses `biz.primary`

---

## 7. Backward Compatibility

- `ThemeProvider` / `useTheme` unchanged — all existing components using `useTheme()` continue to work
- `BusinessThemeProvider` is additive — wraps around existing providers
- `BusinessIdentity` type untouched — backward compatible with existing business data
- Base tokens (COLORS, GRADIENTS, etc.) remain as defaults — no breaking changes

---

## 8. Adding a New Business Theme

1. Add a new entry to `BUSINESS_THEMES` in `businessThemes.ts`
2. Add the slug to the `BusinessSlug` union type (`'rides' | 'food' | 'admin'`)
3. Wrap the app with `<BusinessThemeProvider slug="new-business">`
4. Screens using `useBusinessTheme()` automatically pick up the new colors

---

## 9. Quality Gates

- [x] Design tokens backward compatible — ThemeContext unchanged
- [x] Business theme can be switched at runtime — `slug` prop on provider
- [x] All existing screens still render correctly — fallback theme provided
- [x] Design document committed to `Absolute/06-DESIGN-SYSTEM/`

---

## 10. Theme Registry Location

```
mobile/packages/shared/src/theme/
├── ThemeContext.tsx              ← base theme (unchanged)
├── BusinessThemeContext.tsx      ← provider + consumer hook (enhanced)
├── businessThemes.ts            ← theme registry (NEW)
└── index.ts                     ← exports (updated)
```
