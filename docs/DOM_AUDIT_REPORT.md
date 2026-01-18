# TwoCups DOM Structure Audit & Refactor Plan

> **Generated:** 2026-01-18
> **Status:** Ready for Implementation
> **Overall DOM Health:** 7/10 (Good)

---

## Executive Summary

The TwoCups React Native codebase demonstrates **well-structured component architecture** with minimal excessive nesting. Most Views serve clear layout or styling purposes. The primary opportunity for improvement lies in **AcknowledgeScreen.tsx**, which has duplicate section structures that can be consolidated into reusable components.

**Key Findings:**
- 1 HIGH priority refactor (AcknowledgeScreen - architectural duplication)
- 2 MEDIUM priority optimizations (TimelineEntryCard, shared component extraction)
- 3 LOW priority cleanups (HomeScreen, minor consolidations)

**Estimated Impact:**
- ~150 lines of code reduction
- Improved maintainability through shared components
- No performance impact (DOM depth is already acceptable)

---

## 1. Full-Scope Audit

### Critical Issues

#### AcknowledgeScreen.tsx (HIGH PRIORITY)
**Location:** `src/screens/AcknowledgeScreen.tsx`

**Problem:** Lines 456-631 contain two completely different rendering paths for the same content (requests/suggestions):
1. When `hasPendingItems` is true: Uses `CollapsibleSection` components
2. When `hasPendingItems` is false: Uses `prominentSection` Views

This creates:
- ~175 lines of near-duplicate code
- Two different visual treatments for the same data
- Maintenance burden when updating list rendering

**Current Structure (Simplified):**
```
{hasPendingItems ? (
  <>
    <CollapsibleSection title="Needs Acknowledgement">...</CollapsibleSection>
    <CollapsibleSection title="My Requests">...</CollapsibleSection>
    <CollapsibleSection title="My Suggestions">...</CollapsibleSection>
  </>
) : (
  <>
    <View style={emptyStateCard}>...</View>
    <View style={prominentSection}>  // DUPLICATES CollapsibleSection structure
      <View style={sectionHeader}>...</View>  // DUPLICATES collapsibleTitleRow
      ...
    </View>
    <View style={prominentSection}>...</View>  // MORE DUPLICATION
  </>
)}
```

**Issues:**
- `sectionHeader` (lines 547-555, 590-598) duplicates `collapsibleTitleRow` (lines 89-97)
- `emptyListHint` appears identically at lines 580-585 and 623-627
- Bottom spacing uses explicit `<View style={{ height: 100 }} />` instead of ScrollView padding

---

#### TimelineEntryCard.tsx (MEDIUM PRIORITY)
**Location:** `src/components/history/TimelineEntryCard.tsx`

**Problem:** Lines 114-124 render two separate `expandIcon` Views based on `isExpanded` state:

```jsx
{isExpanded && (
  <View style={styles.expandedContent}>
    ...
    <View style={styles.expandIcon}>
      <Text style={styles.chevron}>▲</Text>
    </View>
  </View>
)}

{!isExpanded && (
  <View style={styles.expandIcon}>
    <Text style={styles.chevron}>▼</Text>
  </View>
)}
```

**Fix:** Single icon with conditional content:
```jsx
<View style={styles.expandIcon}>
  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
</View>
```

---

#### Repeated Pattern: Icon + Label + Badge (MEDIUM PRIORITY)
**Locations:**
- `HomeScreen.tsx` lines 142-146 (`collectiveHeader`)
- `AcknowledgeScreen.tsx` lines 89-97 (`collapsibleTitleRow`)
- `AcknowledgeScreen.tsx` lines 547-555 (`sectionHeader`)

**Problem:** Same pattern implemented independently 3+ times:
```jsx
<View style={styles.headerRow}>
  <Text style={styles.icon}>{emoji}</Text>
  <Text style={styles.title}>{title}</Text>
  {count > 0 && <View style={styles.badge}><Text>{count}</Text></View>}
</View>
```

---

### Minor Issues

#### HomeScreen.tsx (LOW PRIORITY)
**Location:** `src/screens/HomeScreen.tsx` lines 141-148

**Problem:** `collectiveHeader` wraps three elements unnecessarily:
```jsx
<View style={styles.collectiveInfo}>
  <View style={styles.collectiveHeader}>  // Could be eliminated
    <Text style={styles.collectiveEmoji}>✨</Text>
    <Text style={styles.collectiveLabel}>Together</Text>
    <Text style={styles.collectiveEmoji}>✨</Text>
  </View>
  <Text style={styles.collectiveSublabel}>Our Shared Progress</Text>
</View>
```

**Fix:** Move `flexDirection: 'row'` to a wrapper that includes the sublabel, or use a simpler structure.

---

### What's Working Well

| Component | Assessment | Notes |
|-----------|------------|-------|
| `GemCounter.tsx` | Excellent | Well-structured memoized sub-components |
| `CupVisualization.tsx` | Good | Clear semantic hierarchy |
| `StatusSnapshotCard.tsx` | Excellent | Minimal, purposeful nesting |
| `HealthInsightsCard.tsx` | Excellent | Memoized with clear visual groupings |
| `CollapsibleSection` | Good | Reusable, properly memoized |
| `AttemptCard` | Good | Compact, well-structured |
| Animation patterns | Excellent | Lean Animated.View usage throughout |

---

## 2. Should Exist vs Should Not Exist Framework

### Decision Rubric for DOM Elements

| Category | Criteria | Keep/Remove |
|----------|----------|-------------|
| **Structurally Essential** | SafeAreaView, ScrollView, FlatList containers | KEEP |
| **Layout Required** | flexDirection wrappers, alignment containers | KEEP |
| **Semantic Grouping** | Header, Footer, Card containers | KEEP |
| **Accessibility** | TouchableOpacity for pressable areas | KEEP |
| **Animation** | Single Animated.View wrapping content | KEEP |
| **Conditionally Useful** | Icon containers for positioning | EVALUATE |
| **Purely Redundant** | Wrapper-for-wrapper, duplicate conditional renders | REMOVE |
| **Historical** | Unused wrapper from refactor | REMOVE |

### Rule Set for Future Development

1. **Maximum Depth Rule:** No component should exceed 5 levels of View nesting beyond SafeAreaView/ScrollView
2. **One Purpose Rule:** Each View should serve exactly one purpose (layout OR styling OR grouping)
3. **Flexbox First:** Use `gap`, `flexDirection`, `alignItems` before adding wrapper Views for spacing
4. **Conditional Collapse:** Use single elements with conditional props, not duplicate elements with conditional renders
5. **Extract at 3:** If a pattern appears 3+ times, extract to a shared component
6. **Animation Lean:** One Animated.View per animation target, no wrappers around Animated.View

---

## 3. Target Architecture

### Ideal DOM Philosophy

```
SafeAreaView (root)
  → ScrollView/FlatList (scroll container)
    → View (section, max 1 per logical group)
      → Component (semantic, e.g., Card, Header)
        → Content (direct children, minimal wrappers)
```

### Gold Standard Component Example

**Before (current TimelineEntryCard expand pattern):**
```jsx
{isExpanded && (
  <View style={styles.expandedContent}>
    <View style={styles.divider} />
    <View style={styles.detailsContainer}>
      ...
    </View>
    <View style={styles.expandIcon}>
      <Text style={styles.chevron}>▲</Text>
    </View>
  </View>
)}
{!isExpanded && (
  <View style={styles.expandIcon}>
    <Text style={styles.chevron}>▼</Text>
  </View>
)}
```

**After (target):**
```jsx
{isExpanded && (
  <View style={styles.expandedContent}>
    <View style={styles.divider} />
    <View style={styles.detailsContainer}>
      ...
    </View>
  </View>
)}
<View style={styles.expandIcon}>
  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
</View>
```

### Proposed Shared Components

#### 1. SectionHeader Component
```tsx
// src/components/common/SectionHeader.tsx
interface SectionHeaderProps {
  icon: string;
  title: string;
  count?: number;
  accentColor?: string;
  rightElement?: React.ReactNode;
}

const SectionHeader = memo(({ icon, title, count, accentColor, rightElement }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {count !== undefined && count > 0 && (
      <View style={[styles.badge, accentColor && { backgroundColor: accentColor }]}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    )}
    {rightElement}
  </View>
));
```

#### 2. EmptyHint Component
```tsx
// src/components/common/EmptyHint.tsx
interface EmptyHintProps {
  message: string;
}

const EmptyHint = memo(({ message }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{message}</Text>
  </View>
));
```

#### 3. ContentSection Component
```tsx
// src/components/common/ContentSection.tsx
interface ContentSectionProps {
  icon: string;
  title: string;
  count?: number;
  accentColor?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

// Unifies CollapsibleSection and prominentSection patterns
const ContentSection = memo(({
  icon, title, count, accentColor,
  collapsible = false, defaultExpanded = true,
  children
}) => {
  // If collapsible, render with expand/collapse
  // If not, render as static section
  // Same visual structure either way
});
```

---

## 4. Cull Plan (Safe Refactor Strategy)

### Phase 1: Extract Shared Components (Low Risk)
**Files to create:**
1. `src/components/common/SectionHeader.tsx`
2. `src/components/common/EmptyHint.tsx`

**Verification:**
- TypeScript compilation passes
- Visual appearance unchanged
- No behavior changes

### Phase 2: TimelineEntryCard Consolidation (Low Risk)
**File:** `src/components/history/TimelineEntryCard.tsx`

**Change:** Merge duplicate `expandIcon` renders into single conditional

**Verification:**
- Expand/collapse still works
- Icon changes correctly based on state
- Position unchanged

### Phase 3: AcknowledgeScreen Refactor (Medium Risk)
**File:** `src/screens/AcknowledgeScreen.tsx`

**Changes:**
1. Create unified `ContentSection` component
2. Replace both `CollapsibleSection` usage AND `prominentSection` Views
3. Extract `EmptyHint` usage
4. Move bottom padding to ScrollView `contentContainerStyle`

**Verification:**
- All three sections render correctly
- Collapse/expand animations work (when applicable)
- Add buttons function
- Navigation works
- Empty states display correctly

### Phase 4: HomeScreen Cleanup (Low Risk)
**File:** `src/screens/HomeScreen.tsx`

**Change:** Simplify `collectiveHeader` structure

**Verification:**
- Visual appearance unchanged
- Responsive layout intact

### Risky Areas to Avoid
- **Do NOT touch:** Animation implementations in HealthInsightsCard, StatusSnapshotCard
- **Do NOT touch:** GemCounter structure (complex but well-organized)
- **Do NOT touch:** CupVisualization (semantic and clean)

---

## 5. Implementation Checklist

### Immediate Tasks (Can Do Now)

- [ ] **Task 1:** Fix TimelineEntryCard duplicate expandIcon
  - File: `src/components/history/TimelineEntryCard.tsx`
  - Lines: 114-124
  - Change: Single icon with conditional text content
  - Estimated: 5 min

- [ ] **Task 2:** Move AcknowledgeScreen bottom spacing to ScrollView
  - File: `src/screens/AcknowledgeScreen.tsx`
  - Line: 634
  - Change: Add `paddingBottom: 100` to `scrollContent` style, remove explicit View
  - Estimated: 2 min

### Short-Term Tasks (This Sprint)

- [ ] **Task 3:** Create SectionHeader component
  - New file: `src/components/common/SectionHeader.tsx`
  - Export from: `src/components/common/index.ts`
  - Estimated: 15 min

- [ ] **Task 4:** Create EmptyHint component
  - New file: `src/components/common/EmptyHint.tsx`
  - Export from: `src/components/common/index.ts`
  - Estimated: 10 min

- [ ] **Task 5:** Apply SectionHeader to AcknowledgeScreen
  - Replace `collapsibleTitleRow` content
  - Replace `sectionHeader` content
  - Estimated: 20 min

- [ ] **Task 6:** Apply EmptyHint to AcknowledgeScreen
  - Replace lines 580-585 and 623-627
  - Estimated: 5 min

### Medium-Term Tasks (Next Sprint)

- [ ] **Task 7:** Create ContentSection unified component
  - Combines CollapsibleSection logic with prominent section styling
  - Single component handles both modes
  - Estimated: 45 min

- [ ] **Task 8:** Refactor AcknowledgeScreen to use ContentSection
  - Remove conditional branching for section rendering
  - Estimated: 30 min

- [ ] **Task 9:** Simplify HomeScreen collectiveHeader
  - Estimated: 10 min

### CSS/Style Changes Required

```typescript
// Add to AcknowledgeScreen styles
scrollContent: {
  padding: spacing.md,
  paddingBottom: 100, // Add this, remove explicit View at line 634
},
```

### Prevention Measures

1. **ESLint Rule (optional):** Configure `react/no-array-index-key` and depth warnings
2. **Code Review Checklist:** Add "DOM depth check" to PR template
3. **Component Guidelines:** Document the "Extract at 3" rule in README

---

## Appendix: Component Inventory

| Component | Location | DOM Depth | Status |
|-----------|----------|-----------|--------|
| HomeScreen | screens/ | 4 | Good |
| HistoryScreen | screens/ | 4 | Good |
| AcknowledgeScreen | screens/ | 5-6 | Needs Work |
| LogAttemptScreen | screens/ | 4 | Good |
| GemHistoryScreen | screens/ | 4 | Good |
| SettingsScreen | screens/ | 4 | Good |
| GemCounter | common/ | 5 | Good (complex by necessity) |
| CupVisualization | cups/ | 4 | Good |
| TimelineEntryCard | history/ | 4 | Minor fix needed |
| StatusSnapshotCard | history/ | 3 | Excellent |
| HealthInsightsCard | history/ | 4 | Excellent |
| CollapsibleSection | screens/Ack | 4 | Good |
| CustomTabBar | common/ | 3 | Good |

---

## Conclusion

This codebase is in **good structural health**. The primary focus should be on:

1. **AcknowledgeScreen consolidation** - highest impact, reduces duplication
2. **Shared component extraction** - improves maintainability
3. **Minor cleanups** - polish, not critical

The DOM depth is acceptable throughout. Performance is not impacted by current structure. The refactor is primarily about **code maintainability and developer experience**, not runtime performance.

**Recommended Approach:** Incremental refactoring during normal feature work, not a dedicated "cleanup sprint."
