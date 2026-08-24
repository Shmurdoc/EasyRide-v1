# EasyRyde — Design Issues Register

> **Segment**: 06-DESIGN-SYSTEM · **Status**: 2026-08-14 · visual debt + inconsistencies  
> **Linked**: `../01-REQUIREMENTS/BACKLOG.md` (fix slots), `../../docs/flow/05-production-readiness/bug-inventory.md`

---

## 1. Open Issues (prioritized)

| ID | Issue | Evidence | Fix |
|---|---|---|---|
| D-01 | **Token sync RN↔web admin** — Vite panel uses Tailwind blue palette; RN tokens green/purple/orange. Brand inconsistent across surfaces | `tailwind.config.js` vs `constants/index.ts` | D-01: single source JSON + generator, or adopt business theme on web |
| D-02 | **No shared web admin component library** — `admin/src/components/Layout.tsx` is the only shared piece | admin src | extract sidebar/cards/charts |
| D-03 | **HTML-demo drift** — old demos (orange primary) still referenced in `docs/flow` READMEs; risk of re-introducing stale colors | TOKENS v1 history | mark demos legacy; point to BUSINESS_THEMES |
| D-04 | **Fonts** — Poppins/Inter via expo-google-fonts in rider; web uses system font stack | app.json + index.css | unified type ramp token |
| D-05 | **Map styling** — 3 map stacks (rn-maps/Google, @react-google-maps/api, leaflet) → marker/route visuals differ; Polyline fallback straight-line ugly on 10km+ trips | packages/maps | shared marker/polyline asset spec |
| D-06 | **No empty/error states parity** in admin web vs RN shared (EmptyState/ErrorState differ) | admin pages | reuse pattern docs |
| D-07 | **A11y debt** — touch targets <44pt in some dense list cells; contrast for inactive tabs | token audit | sweep per NFR-604 |
| D-08 | Splash/offline banners not themed per business slug | SplashScreen | pass slug into banners |

## 2. Resolved (regression guard)

| ID | Was | Now |
|---|---|---|
| D-R1 | RN token coverage "15%, spacing/shadows missing" | full families in shared (TOKENS.md) |
| D-R2 | Driver app light theme | dark `COLORS_DARK` family |
| D-R3 | Account screen mislabeled | Profile tab label `Account` fixed |

## 3. Review Cadence

- Design review before each release: run `../17.. VISUAL-QA` style sweep (`FINAL-VISUAL-QA.md`, `DESIGN-QA-REPORT.md` at root), screenshots against this register.
- Any screen PR touching colors/sizing must cite a token from TOKENS.md.

## References

- Tokens: `TOKENS.md` · Components: `COMPONENT-CATALOG.md` · Theming: `THEME.md`, `BUSINESS-THEMES.md`