# EasyRyde — Design Tokens

> **Segment**: 06-DESIGN-SYSTEM · **Status**: REFRESHED 2026-08-14 — v1 "tokens missing in RN" is CLOSED (full token families now ship in `@easyryde/shared`)  
> **Source**: `mobile/packages/shared/src/constants/index.ts`, `designTokens.ts`, `theme/BusinessThemeContext.tsx`; web admin `tailwind.config.js`

---

## 1. Brand & Color (verified current)

| Token | Light (rider/app default) | Dark (driver app) | Business themes |
|---|---|---|---|
| Primary | green `#0A7C4E` (rides) | dark `#16a34a` tint (driver tabs) | rides `#7C3AED` purple · food `#EA580C` orange · admin `#6366F1` indigo |
| Error | `#E5484D` | same | — |
| Background | `#050E1A` (auth screens), light screens default | dark family `COLORS_DARK` | per business |

> ⚠️ **Known tension**: `BUSINESS_THEMES` (rides=purple) vs TOKENS v1 (orange `#FF6B35` from HTML demo era). The **shipping reality** is business themes (purple/indigo/orange) + green primary in shared `COLORS`. HTML-orange is legacy. `BUSINESS-THEMES.md` documents this — do not reintroduce hardcoded orange.

## 2. Token Families

| Family | Light (`index.ts`) | Dark (`designTokens.ts`) |
|---|---|---|
| Colors | COLORS (brand/state/surface) | COLORS_DARK |
| Gradients | GRADIENTS | — |
| Glass | GLASS | GLASS_DARK |
| Typography | FONTS (Poppins/Inter) + TYPOGRAPHY (+sizes/weights) | TYPOGRAPHY_DARK |
| Spacing | SPACING 4–64 scale | SPACING_DARK |
| Radius | RADIUS (sm/md/lg/xl) | RADIUS_DARK |
| Shadows | SHADOWS (elevation) | SHADOWS_DARK |
| Borders | BORDERS | — |
| Animation | ANIMATION (durations/easings) | ANIMATION_DARK |
| Z-Index | Z_INDEX | — |

## 3. Domain Constants (non-color tokens)

`VEHICLE_TYPES` (economy/comfort/premium/xl) · `RIDE_CATEGORIES` · `RIDE_STATUS_LABELS/COLORS` (12 states) · `PAYMENT_METHODS` (cash, wallet, payfast, ozow, stripe) · `PHALABORWA_LOCATIONS` (9 seeded places) · `PHALABORWA_CENTER` (-23.9470, 31.0830) · `API_TIMEOUT=15000` · `MAP_REGION`.

## 4. Web Admin (Vite)

Tailwind custom `primary` palette (blue-50→950) in `tailwind.config.js`; system font stack (`index.css`). Not token-synced with RN — known divergence (DESIGN-ISSUES D-01).

## 5. Usage Rules

1. Import tokens from `@easyryde/shared` — never re-declare colors in screens (lint-checkable).
2. Dark family = driver app default via `designTokens.ts`; light = rider.
3. Business theming overrides only brand colors/logo (`BusinessThemeProvider slug`), not layout tokens.
4. New tokens go to `constants/index.ts` + `designTokens.ts` in one change.

## References

- Themes: `THEME.md`, `BUSINESS-THEMES.md` · Components: `COMPONENT-CATALOG.md` · Issues: `DESIGN-ISSUES.md`