# Systemic Cleanup Pass - Progress Tracker

Below is a **phased workflow strategy** to untangle the nested "div soup" (RN Web Views), normalize layout, and eliminate issues like the buried **Sign Out** button across the app.

---

## Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 | ✅ Complete | Audit doc created, golden screens identified |
| Phase 1 | ✅ Complete | DOM depth audit, top 5 causes identified, layout contract proposed |
| Phase 2 | ✅ Complete | Screen, Stack, Row primitives created |
| Phase 3 | ✅ Complete | TabBarHeightContext created, Android fix applied |
| Phase 4 | ✅ Complete | All 8 screens migrated |
| Phase 5 | ⏳ Pending | Enforcement rules not yet implemented |

---

## North Star for the cleanup

**Goal:** Every screen uses a small set of shared layout primitives + consistent safe-area/tab-bar spacing + consistent typography components, so:

* DOM depth shrinks
* click targets behave
* spacing is predictable and elegant
* bugs like "button hidden behind nav" disappear everywhere at once

---

# Phase 0 — Lock the baseline ✅ COMPLETE

**Deliverables**

1. ✅ **Screens Inventory** - 8 screens documented (5 tab, 3 stack)
2. ✅ **Known UI Bugs Backlog** - Sign Out buried, missing tabBarHeight on 3 screens
3. ✅ **Golden Screens** - HistoryScreen, SettingsScreen identified as reference quality

**Audit Document:** `TwoCupsApp/docs/LAYOUT_AUDIT.md`

---

# Phase 1 — Audit + measure "DOM soup" ✅ COMPLETE

### A) Depth + wrappers audit ✅

| Screen | DOM Depth | Wrapper Views | Absolute Positioning |
|--------|-----------|---------------|---------------------|
| HomeScreen | ~8-10 levels | 12+ | 2 (sacred geometry) |
| LogAttemptScreen | ~7-8 levels | 10+ | 0 |
| AcknowledgeScreen | ~9-10 levels | 15+ | 0 |
| HistoryScreen | ~6-7 levels | 5 | 0 |
| SettingsScreen | ~6-7 levels | 8 | 0 |
| GemHistoryScreen | ~7-8 levels | 8 | 0 |
| MakeRequestScreen | ~8-9 levels | 12+ | 0 |
| ManageSuggestionsScreen | ~7-8 levels | 10 | 0 |

### B) Top 5 structural causes identified ✅

1. **No shared Screen container** - Every screen manually implements SafeAreaView + useBottomTabBarHeight
2. **Wrapper Views for spacing** - Views exist only for margins/padding
3. **Inconsistent scrolling patterns** - Mixed ScrollView/FlatList with no clear rule
4. **Absolute positioning hacks** - Sacred geometry uses transform tricks
5. **Per-screen style duplication** - container/scrollContent/header repeated everywhere

### C) Layout contract proposal ✅

**Accepted approach:** Standardize on `<Screen>` wrapper + `Stack`/`Row` primitives with gap-based spacing.

---

# Phase 2 — Create layout primitives ✅ COMPLETE

## 2.1 Screen Layout Contract ✅

**Created:** `src/components/common/Screen.tsx`

```tsx
<Screen scroll>                           // Scrollable with tab bar inset
<Screen>                                  // Static with tab bar inset
<Screen tabBarInset={false}>              // Stack screens (no tab bar)
<Screen scroll onRefresh={fn} refreshing> // Pull-to-refresh
```

**Handles:**
- SafeAreaView (top, left, right edges)
- Tab bar bottom inset (via TabBarHeightContext)
- Optional scrolling with RefreshControl
- Consistent padding

## 2.2 Primitives created ✅

| Primitive | File | Purpose |
|-----------|------|---------|
| `Screen` | `src/components/common/Screen.tsx` | Container with safe area + tab bar inset |
| `Stack` | `src/components/common/Stack.tsx` | Vertical gap-based layout |
| `Row` | `src/components/common/Row.tsx` | Horizontal gap-based layout |
| `useTabBarHeight` | exported from Screen | Hook for FlatList screens |
| `AppText` | (existing) | Typography - already migrated |
| `Button` | (existing) | Already has consistent styling |

**Not created (not needed):**
- `Section` - Using Stack with gap instead
- `Card` - Existing card styles sufficient
- `Spacer` - Stack gap handles spacing
- `Divider` - Existing SectionDivider sufficient

---

# Phase 3 — Navigation + Safe Area + Scroll normalization ✅ COMPLETE

## 3.1 Bottom inset strategy ✅

**Problem Found:** React Navigation's `BottomTabBarHeightContext` returns 0/undefined with custom tab bars.

**Solution Implemented:**

1. Created `src/context/TabBarHeightContext.tsx`:
   ```tsx
   export function TabBarHeightProvider({ children });
   export function useTabBarHeightContext(): number;
   export function useSetTabBarHeight(): (height: number) => void;
   ```

2. Updated `CustomTabBar.tsx` to report height:
   ```tsx
   const TAB_BAR_BASE_HEIGHT = 80;
   const totalHeight = TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 8);
   useEffect(() => setTabBarHeight(totalHeight), [totalHeight]);
   ```

3. Updated `Screen.tsx` to use custom context:
   ```tsx
   export function useTabBarHeight(): number {
     const customHeight = useTabBarHeightContext();  // Our context
     const rnHeight = React.useContext(BottomTabBarHeightContext);  // RN fallback
     return customHeight > 0 ? customHeight : (rnHeight ?? 0);
   }
   ```

4. Wrapped app in `TabBarHeightProvider` in `App.tsx`

**Acceptance criteria:**
- ✅ Any ScrollView content can reach the bottom without being hidden
- ✅ Any bottom-aligned CTA sits above the nav reliably
- ✅ Works on both web and Android

## 3.2 Scrolling standardized ✅

| Pattern | Usage |
|---------|-------|
| `<Screen scroll>` | HomeScreen, SettingsScreen, AcknowledgeScreen, LogAttemptScreen, MakeRequestScreen, ManageSuggestionsScreen |
| `<Screen>` (static) | Error states, loading states |
| FlatList + useTabBarHeight | HistoryScreen, GemHistoryScreen |

---

# Phase 4 — Systematic screen migration ✅ COMPLETE

### Migration complete (8/8 screens)

| Screen | Status | Notes |
|--------|--------|-------|
| SettingsScreen | ✅ | Sign Out bug fixed |
| HomeScreen | ✅ | 316→239 lines (24% reduction) |
| AcknowledgeScreen | ✅ | Collapsible sections preserved |
| LogAttemptScreen | ✅ | Full migration |
| HistoryScreen | ✅ | FlatList - uses useTabBarHeight hook |
| MakeRequestScreen | ✅ | tabBarInset={false} |
| ManageSuggestionsScreen | ✅ | tabBarInset={false} |
| GemHistoryScreen | ✅ | FlatList - partial migration |

### What "migration" meant per screen ✅

- ✅ Replace outer wrapper stacks with `Screen`
- ✅ Replace repeated padding/margins with `Stack` gap
- ✅ Convert Text → `AppText` (done in previous session)
- ✅ Remove redundant wrappers
- ✅ Confirm click targets and tab-bar insets

### Acceptance criteria met ✅

- ✅ DOM depth reduced (fewer wrapper Views)
- ✅ No essential controls hidden under nav (Sign Out visible)
- ✅ Absolute-position hacks documented (sacred geometry only)
- ✅ Visual parity maintained

---

# Phase 5 — Enforcement ⏳ PENDING

### 5.1 Lint rules / conventions ⏳

- [ ] Disallow raw `<Text>` except inside `AppText`
- [ ] Discourage inline style objects in JSX
- [ ] Warnings for deeply nested Views

### 5.2 PR checklist ⏳

- [ ] Create PR template with:
  - Before/after screenshots required
  - Notes on wrapper count reduction
  - Verified on web + mobile viewport sizes
  - Verified keyboard + scroll behavior (forms)

### 5.3 "UI Debt" bucket ⏳

- [ ] Document remaining hacks:
  - Sacred geometry absolute positioning (HomeScreen)
  - FlatList screens use SafeAreaView directly

---

## Sign Out Bug Resolution ✅

**Original Issue:** Sign Out button buried behind navbar on Android.

**Root Cause:** `useBottomTabBarHeight()` returns 0 with custom tab bars because React Navigation's context isn't populated.

**Fix Applied:**
1. Created `TabBarHeightContext` to share tab bar height
2. `CustomTabBar` measures and reports its height
3. `Screen` component reads from custom context
4. All tab screens now have correct bottom padding

**Verified On:**
- ✅ Desktop web
- ✅ Android emulator

---

## Files Changed Summary

### Created (5 files)
1. `src/components/common/Screen.tsx`
2. `src/components/common/Stack.tsx`
3. `src/components/common/Row.tsx`
4. `src/context/TabBarHeightContext.tsx`
5. `TwoCupsApp/docs/LAYOUT_AUDIT.md`

### Modified (11 files)
1. `src/components/common/index.ts`
2. `src/components/common/CustomTabBar.tsx`
3. `App.tsx`
4. `src/screens/SettingsScreen.tsx`
5. `src/screens/HomeScreen.tsx`
6. `src/screens/AcknowledgeScreen.tsx`
7. `src/screens/LogAttemptScreen.tsx`
8. `src/screens/HistoryScreen.tsx`
9. `src/screens/MakeRequestScreen.tsx`
10. `src/screens/ManageSuggestionsScreen.tsx`
11. `src/screens/GemHistoryScreen.tsx`

---

## What's Next

**High Priority:**
- Test all screens thoroughly on iOS
- Monitor for any regressions

**Low Priority (Phase 5):**
- Add ESLint rules for Text/AppText enforcement
- Create PR template with UI checklist
- Document remaining UI debt
