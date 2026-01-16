# Navbar Layout Issue - Parked

**Issue:** Bottom navbar tabs are squished to the left instead of evenly distributed across the screen width.

**Screenshot:** `Screenshot 2026-01-16 103613.png`

---

## Attempts Made

### Attempt 1: Shortened label + reduced font size
- Changed "Acknowledge" → "Ack"
- Reduced `fontSize` from 12px → 10px
- Added `tabBarItemStyle: { paddingHorizontal: 2 }`
- **Result:** Labels fit but still bunched to left

### Attempt 2: Added flex: 1 to tab items
- Changed `tabBarItemStyle: { flex: 1 }`
- **Result:** Still bunched to left (not working as expected)

---

## Files That Impact Navbar Layout

### Primary File
**`TwoCupsApp/App.tsx`** (lines 91-111)
```typescript
<MainTab.Navigator
  screenOptions={{
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingTop: 8,
      paddingBottom: 8,
      height: 64,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '500',
    },
    tabBarItemStyle: {
      flex: 1,
    },
  }}
>
```

### Tab Icon Component
**`TwoCupsApp/App.tsx`** (lines 56-62)
```typescript
function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
    </View>
  );
}
```

### Tab Icon Styles
**`TwoCupsApp/App.tsx`** (lines 284-295)
```typescript
const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
});
```

### Theme Colors (used by navbar)
**`TwoCupsApp/src/theme/index.ts`**
- `colors.surface` - tab bar background
- `colors.border` - top border
- `colors.primary` - active tab color
- `colors.textSecondary` - inactive tab color

---

## Possible Solutions to Try

1. **Check if `tabBarStyle` needs `width: '100%'`**
2. **Check React Navigation version** - may be a known issue
3. **Try `tabBarStyle: { flexDirection: 'row', justifyContent: 'space-around' }`**
4. **Inspect in browser DevTools** - see what CSS is actually being applied
5. **Check if parent container is constraining width**
6. **Try explicit width on tabBarStyle**

---

## Related Dependencies
- `@react-navigation/bottom-tabs`: ^7.9.1
- `@react-navigation/native`: ^7.1.26
- React Navigation docs: https://reactnavigation.org/docs/bottom-tab-navigator#tabbarstyle
