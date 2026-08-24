# EasyRyde — Theming Architecture

> **Segment**: 06-DESIGN-SYSTEM · **Status**: VERIFIED 2026-08-14  
> **Linked**: `TOKENS.md`, `BUSINESS-THEMES.md` (per-brand), `DESIGN-ISSUES.md`

---

## 1. Theme Hierarchy

```
ThemeProvider (ThemeContext)         — static light palette from constants (NO runtime switching)
  └─ BusinessThemeProvider slug       — business identity (rides|food|admin): colors/logo/branding
       └─ Apps may import dark family (designTokens) statically (driver app uses dark tokens)
```

- **No light/dark runtime toggle** — driver app is dark-styled, rider is light-styled. Confirmed in `ThemeContext.tsx` (static `theme` object).
- Business themes: `businessThemes.ts` — per slug brand palette; `BusinessTheme.ts` types in `packages/theme` and `types/business.ts` (`Cajori Restaurant`, `Baobab Kitchen`, `Mama's Pizza` identities exist for food tenants).

## 2. Theme Inventory per App

| App | Provider chain | Palette |
|---|---|---|
| rider | ErrorBoundary>SafeArea>Auth>Theme>BusinessTheme(rides) | light + business purple |
| driver | SafeArea>Auth>Theme>BusinessTheme(rides)>ErrorBoundary | dark family + green tint |
| admin (Expo) | BusinessTheme(admin) | light + indigo |
| admin (Vite web) | Tailwind custom blue palette | independent |
| web/ (advanced) | Tailwind + leaflet | independent |

## 3. Rules

1. `ThemeProvider` = layout tokens; `BusinessThemeProvider` = brand tokens; keep separation.
2. New business (stays/rentals) → add slug + palette in `businessThemes.ts` + `BUSINESS_THEMES` — no new theme machinery.
3. Do NOT add runtime dark-mode toggle without a design decision (reach: 3 apps, 2 web panels).
4. Accessibility: contrast must hold against both `COLORS` and `COLORS_DARK` for shared components (check with `TokenPairs` test in theme `__tests__`).

## References

- Tokens: `TOKENS.md` · Brands: `BUSINESS-THEMES.md` · Visual QA history: `../../VISUAL-QA-REPORT.md` (root), `../04-QA-AUDIT/MOBILE-GAP-ANALYSIS.md`