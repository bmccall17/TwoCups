# UI Debt Registry

This document tracks known UI compromises and technical debt that deviate from the standard layout patterns established in the systemic cleanup.

---

## Known Exceptions

### 1. Sacred Geometry Background (HomeScreen)

**Location:** `src/screens/HomeScreen.tsx`

**What:** The sacred geometry SVG backgrounds use absolute positioning with transform tricks to create the visual effect.

**Why it's acceptable:** This is a deliberate visual design choice, not structural layout. The absolute positioning doesn't affect content flow or cause layout bugs.

**Pattern:**
```tsx
<View style={styles.sacredGeometryContainer}>
  <Svg style={StyleSheet.absoluteFill} ...>
    {/* Rotated/transformed SVG elements */}
  </Svg>
</View>
```

**Risk:** Low. Contained to one screen, purely decorative.

---

### 2. FlatList Screens (HistoryScreen, GemHistoryScreen)

**Location:**
- `src/screens/HistoryScreen.tsx`
- `src/screens/GemHistoryScreen.tsx`

**What:** These screens use FlatList directly instead of the `<Screen scroll>` component, with manual SafeAreaView wrapping.

**Why it's acceptable:** FlatList requires direct control over contentContainerStyle for virtualized list performance. Wrapping FlatList inside ScrollView would break virtualization.

**Pattern:**
```tsx
<SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
  <FlatList
    contentContainerStyle={{ paddingBottom: tabBarHeight }}
    ...
  />
</SafeAreaView>
```

**Mitigation:** These screens use `useTabBarHeight()` hook exported from Screen.tsx to ensure correct bottom padding.

**Risk:** Low. Pattern is documented and hook ensures consistency.

---

### 3. CustomTabBar Text Labels

**Location:** `src/components/common/CustomTabBar.tsx:76`

**What:** Uses raw `<Text>` instead of `<AppText>` for tab labels.

**Why it's acceptable:** Tab labels have fixed, small styling that doesn't participate in the app's font size accessibility system. Using AppText would add unnecessary overhead and potentially break the tab bar's visual balance.

**Pattern:**
```tsx
<Text style={[styles.label, isFocused && styles.labelActive]}>
  {label}
</Text>
```

**Risk:** Very low. Intentional exception for fixed navigation chrome.

---

## Future Considerations

### Potential Improvements (Low Priority)

1. **Create a `<ListScreen>` variant** - A Screen wrapper specifically for FlatList screens that handles SafeAreaView and provides tabBarHeight via render prop or context.

2. **Sacred geometry as a reusable component** - If other screens need similar backgrounds, extract to a `<SacredGeometryBackground>` component.

---

## Adding New Exceptions

When adding a new UI debt item:

1. Document the **location** (file path and line number if specific)
2. Explain **what** the deviation is
3. Explain **why** it's acceptable or necessary
4. Show the **pattern** being used
5. Assess the **risk** level (Low/Medium/High)
6. Note any **mitigation** steps taken

Keep this document updated as debt is paid down or new exceptions arise.
