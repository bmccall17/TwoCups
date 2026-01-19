# Layout Audit - Phase 0 & 1

## Screens Inventory

### Tab Screens (5)
| Screen | File | Uses tabBarHeight | Scrollable |
|--------|------|-------------------|------------|
| Home | `HomeScreen.tsx` | ✅ Yes | ScrollView |
| Give | `LogAttemptScreen.tsx` | ✅ Yes | ScrollView |
| Receive | `AcknowledgeScreen.tsx` | ✅ Yes | ScrollView |
| History | `HistoryScreen.tsx` | ✅ Yes | FlatList |
| Settings | `SettingsScreen.tsx` | ✅ Yes | ScrollView |

### Stack Screens (3)
| Screen | File | Uses tabBarHeight | Scrollable |
|--------|------|-------------------|------------|
| MakeRequest | `MakeRequestScreen.tsx` | ❌ **NO** | ScrollView |
| ManageSuggestions | `ManageSuggestionsScreen.tsx` | ❌ **NO** | ScrollView |
| GemHistory | `GemHistoryScreen.tsx` | ❌ **NO** | FlatList |

### Auth Screens (3) - Out of scope
- LoginScreen
- SignUpScreen
- PairingScreen

---

## Known UI Bugs Backlog

### Layout Issues
| Bug | Severity | Screen(s) | Root Cause |
|-----|----------|-----------|------------|
| Sign Out button buried by navbar | High | Settings | Bottom content cut off by tab bar |
| Content cut off at bottom | High | MakeRequest, ManageSuggestions, GemHistory | Missing `useBottomTabBarHeight()` |
| Navbar layout issues (web) | Medium | All | CustomTabBar positioning |

### Typography Issues
- ✅ Resolved - AppText migration complete

### Touch Target Issues
- None identified in audit

### Z-Index/Overlay Issues
| Bug | Severity | Screen(s) | Root Cause |
|-----|----------|-----------|------------|
| Sacred geometry backgrounds use transform hacks | Low | Home | `transform: [{translateX}, {translateY}]` for centering |

### Scroll Issues
- Inconsistent scroll patterns (ScrollView vs FlatList)
- Nested ScrollViews in LogAttemptScreen (horizontal category chips inside vertical scroll)

---

## DOM Depth Audit

### Per-Screen Analysis

#### HomeScreen.tsx
- **Depth:** ~8-10 levels
- **Wrapper Views:** 12+
- **Absolute Positioning:** 2 (vesicaPiscisContainer, collectiveGeometryBackground)
- **Pattern:** SafeAreaView → ScrollView → View → View → View → Component

```
SafeAreaView
├── SacredGeometryBackground (absolute)
└── ScrollView
    └── content (View)
        ├── header (View)
        ├── connectionSection (View)
        │   └── cupsPairContainer (View)
        │       ├── vesicaPiscisContainer (View, absolute)
        │       └── cupsPair (View)
        │           ├── cupWrapper (View)
        │           ├── connectionIndicator (View)
        │           └── cupWrapper (View)
        ├── SectionDivider
        ├── collectiveHero (View)
        │   ├── collectiveGeometryBackground (View, absolute)
        │   └── collectiveContent (View)
        └── gemsSimple (TouchableOpacity)
```

#### LogAttemptScreen.tsx
- **Depth:** ~7-8 levels
- **Wrapper Views:** 10+
- **Absolute Positioning:** 0
- **Pattern:** SafeAreaView → ScrollView → sections → cards → content

#### AcknowledgeScreen.tsx
- **Depth:** ~9-10 levels (deepest due to CollapsibleSection)
- **Wrapper Views:** 15+
- **Absolute Positioning:** 0
- **Pattern:** SafeAreaView → ScrollView → CollapsibleSection → content → cards → nested

#### HistoryScreen.tsx ⭐ (Cleanest)
- **Depth:** ~6-7 levels
- **Wrapper Views:** 5
- **Absolute Positioning:** 0
- **Pattern:** SafeAreaView → FlatList → headerContainer → components
- **Note:** Uses `gap` for spacing - good!

#### SettingsScreen.tsx ⭐ (Reference quality)
- **Depth:** ~6-7 levels
- **Wrapper Views:** 8
- **Absolute Positioning:** 0
- **Pattern:** SafeAreaView → ScrollView → sections → cards → content

#### GemHistoryScreen.tsx
- **Depth:** ~7-8 levels
- **Wrapper Views:** 8
- **Absolute Positioning:** 0
- **Bug:** Missing tabBarHeight handling

#### MakeRequestScreen.tsx
- **Depth:** ~8-9 levels
- **Wrapper Views:** 12+
- **Absolute Positioning:** 0
- **Bug:** Missing tabBarHeight handling

#### ManageSuggestionsScreen.tsx
- **Depth:** ~7-8 levels
- **Wrapper Views:** 10
- **Absolute Positioning:** 0
- **Bug:** Missing tabBarHeight handling

---

## Top 5 Structural Causes

### 1. No Shared Screen Container (HIGH IMPACT)
Every screen manually implements:
```tsx
// This pattern repeated 8 times:
const tabBarHeight = useBottomTabBarHeight();
return (
  <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight }]}>
```

**Fix:** Create `<Screen>` component that handles all of this.

### 2. Wrapper Views for Spacing (MEDIUM IMPACT)
Views exist only to apply margins/padding:
```tsx
<View style={styles.header}>           // marginBottom: spacing.xl
  <View style={styles.sectionTitle}>   // marginBottom: spacing.md
```

**Fix:** Use `<Stack gap={spacing.md}>` or pass spacing to Section/Card components.

### 3. Inconsistent Scrolling Patterns (MEDIUM IMPACT)
- HomeScreen, LogAttempt, Acknowledge, Settings, MakeRequest, ManageSuggestions: `ScrollView`
- HistoryScreen, GemHistoryScreen: `FlatList`

No clear rule for when to use which.

**Fix:** `<Screen scroll>` vs `<Screen>` pattern with clear guidelines.

### 4. Absolute Positioning Hacks (LOW IMPACT)
Sacred geometry backgrounds use transform hacks:
```tsx
transform: [{ translateX: -100 }, { translateY: -100 }]
```

**Fix:** Use proper centering with flexbox or background component that handles positioning.

### 5. Per-Screen Style Duplication (LOW IMPACT)
Every screen defines nearly identical styles:
```tsx
container: { flex: 1, backgroundColor: colors.background }
scrollContent: { flexGrow: 1, padding: spacing.lg }
header: { marginBottom: spacing.xl }
```

**Fix:** Extract to shared primitives.

---

## Golden Screens (Reference Quality)

Recommended as stable reference points:

1. **HistoryScreen** - Cleanest structure, uses FlatList properly, uses `gap`
2. **SettingsScreen** - Clean section/card pattern, proper modal handling
3. **HomeScreen** - (after cleanup) - Good visual hierarchy

---

## Layout Contract Proposal

### The `Screen` Component

```tsx
interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;           // ScrollView vs static View
  padding?: boolean;          // Apply default horizontal padding (default: true)
  safeArea?: boolean;         // Apply SafeAreaView (default: true)
  tabBarInset?: boolean;      // Account for tab bar (default: true for tab screens)
  backgroundColor?: string;   // Override background color
}

// Usage:
<Screen scroll>
  <Section title="Profile">
    <Card>...</Card>
  </Section>
</Screen>
```

### Supporting Primitives

| Component | Purpose | Replaces |
|-----------|---------|----------|
| `Screen` | Container with safe area + tab bar inset | SafeAreaView + useBottomTabBarHeight + ScrollView |
| `Stack` | Vertical layout with gap | Wrapper Views with marginBottom |
| `Row` | Horizontal layout with gap | Wrapper Views with flexDirection: 'row' |
| `Section` | Title + content container | header Views + sectionTitle styles |
| `Card` | Surface with radius/padding | card styles |
| `Divider` | Simple line separator | borderTop styles |

### Acceptance Criteria

1. **No screen manually guesses bottom padding**
2. **No screen imports `useBottomTabBarHeight` directly**
3. **No wrapper Views that exist only for spacing**
4. **DOM depth reduced by ~30-50%**
5. **All essential controls visible above tab bar**

---

## Migration Priority

### Batch 1 - Fix Critical Bugs (3 screens)
1. MakeRequestScreen - Add tabBarHeight
2. ManageSuggestionsScreen - Add tabBarHeight
3. GemHistoryScreen - Add tabBarHeight

### Batch 2 - High Traffic (3 screens)
1. HomeScreen - Migrate to Screen + Stack
2. AcknowledgeScreen - Migrate to Screen + Stack
3. SettingsScreen - Migrate to Screen + Stack (fix Sign Out bug)

### Batch 3 - Remaining (2 screens)
1. LogAttemptScreen
2. HistoryScreen (already clean, light touch)

---

## Questions for You

1. **Golden Screens:** I've suggested HistoryScreen, SettingsScreen, HomeScreen. Do you agree, or would you pick different ones?

2. **Known Bugs:** Are there any other UI bugs you've noticed that I should add to the backlog?

3. **Layout Contract:** Does the proposed `Screen` + primitives approach look right to you?

Once you confirm, I'll proceed to Phase 2 (creating the primitives).
