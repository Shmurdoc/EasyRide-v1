# Test Fixes — Cycle 6

## Result

**Before:** 2 failed, 14 failed suites, 27 failed tests, 149 passed, 176 total
**After:** 0 failed, 12 passed suites, 0 failed tests, 176 passed, 176 total

## Files Modified

### Production Code
- `mobile/apps/rider/screens/PaymentScreen.tsx` — Fixed `setExpiry` → `setCardExpiry` (line 188–189)

### Test Code
- `mobile/apps/rider/__tests__/PaymentScreen.test.tsx` — No changes needed (production fix was sufficient)
- `mobile/apps/rider/__tests__/WalletScreen.test.tsx` — Changed `R 250.00` → `R250.00`, `R 0.00` → `R0.00` to match `formatZAR` output (`R${value}` with no space)
- `mobile/apps/rider/__tests__/RideTrackingScreen.test.tsx` — Fixed 4 tests: removed pickup-addr assertion (not shown in searching state), used `getAllByText` for "John Driver" (appears twice), added explicit `rides.get.mockResolvedValueOnce` for in-progress test
- `mobile/apps/rider/__tests__/RegisterScreen.test.tsx` — Added `@expo/vector-icons` mock; used `getAllByText` instead of `getByText` with `allowMultiple` (unsupported in RTL 12.x); used persistent `mockReturnValue` instead of `mockReturnValueOnce` for register mock; added `Alert` import; separated form-fill from submit into individual `waitFor` blocks to fix state-flushing timing
- `mobile/apps/rider/__tests__/RestaurantMenuScreen.test.tsx` — Changed empty menu to `mockResolvedValue` (not `Once`); changed error test to `mockResolvedValueOnce` then `mockRejectedValueOnce` (double load pattern); fixed cart tests by re-querying `getAllByText('add')` after each press to avoid stale DOM references
- `mobile/apps/rider/__tests__/BookRideScreen.test.tsx` — Added `@expo/vector-icons` mock and `react-native-safe-area-context` mock (preserving real module, only overriding `useSafeAreaInsets`)

## Key Learnings

1. **`formatZAR` returns `R250.00`** (no space after R) — from `packages/shared/src/utils/mapUtils.ts`
2. **RTL v12 does not support `getByText` with `allowMultiple: true`** — use `getAllByText` instead
3. **`clearAllMocks()` clears `mockReturnValue`/`mockImplementation`** — must re-set mock implementations in `beforeEach` or per-test if needed
4. **`mockReturnValueOnce` is consumed on first render** — if component re-renders after state changes, subsequent `useAuth()` calls fall back to default. Use `mockReturnValue` (persistent) when the mock must survive re-renders
5. **Stale element references after `fireEvent`** — when a button is conditionally replaced (e.g., "add" → qtyRow with "add" + "remove"), re-query after each press with `await waitFor(() => { btns = getAllByText('add'); })`
6. **`RestaurantMenuScreen` has two `foodDelivery.restaurant()` calls** — `RestaurantMenuScreenInner` loads for theme (swallows errors), `RestaurantMenuContent` loads again for display (shows Alert on error). Error tests must use `mockResolvedValueOnce` + `mockRejectedValueOnce`
