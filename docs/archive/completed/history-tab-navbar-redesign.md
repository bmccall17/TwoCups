# History Tab Redesign & Navigation Bar Updates

## Overview

Transform the History tab from a data-heavy dashboard into a calm, visual, mobile-first experience that serves as "a gentle mirror of the relationship." Also update navigation bar labels.

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `TwoCupsApp/src/screens/HistoryScreen.tsx` | Major refactor - replace analytics sections, new layout |
| `TwoCupsApp/App.tsx` | Update tab labels, icons, add notification badge |
| `TwoCupsApp/src/theme/index.ts` | Add emerald/amber color variants |

## New Components to Create

| Component | Location |
|-----------|----------|
| `StatusSnapshotCard.tsx` | `src/components/history/` |
| `HealthInsightsCard.tsx` | `src/components/history/` |
| `CollapsibleFilterControls.tsx` | `src/components/history/` |
| `TimelineEntryCard.tsx` | `src/components/history/` |
| `usePendingAcknowledgments.ts` | `src/hooks/` |

---

## Implementation Phases

### Phase 1: Theme & Foundation

**1.1 Update `src/theme/index.ts`**
- Add color variants for status states:
  ```
  amber400: '#FBBF24', amber500: '#F59E0B'
  emerald400: '#34D399', emerald500: '#10B981'
  backgroundDeep: '#0a0a0f'
  ```

**1.2 Create `src/hooks/usePendingAcknowledgments.ts`**
- Real-time Firestore listener for pending acknowledgment count
- Returns `{ pendingCount, loading }` for navigation badge
- Pattern from `AcknowledgeScreen.tsx` lines 154-183

---

### Phase 2: New History Components

**2.1 Create `StatusSnapshotCard.tsx`**
- Two compact visual cards side by side
- **Logs Waiting (⏳)**: Amber gradient, count badge, pulsing animation (onclick goes to Log Attempt page)
- **Acknowledgments (✨)**: Emerald gradient, count badge (onclick goes to Recieve page)
- Touch: `active:scale-95`
- Styling: `p-4`, icons 48px, `rounded-2xl` (borderRadius.lg)

**2.2 Create `HealthInsightsCard.tsx`**
- Single card with 3 metrics in a row (flexbox)
- Metrics:
  - 🤝 Responsiveness (% acknowledged)
  - 💎 Gems (combined gem count)
  - ⭕ Open Loops (pending count)
- Large numbers (h2 typography), tiny uppercase labels (10px)
- Derive values from existing data (no new Firestore queries)

**2.3 Create `CollapsibleFilterControls.tsx`**
- Collapsed by default - shows "Filter" button with current selection badge (e.g., "7d")
- Expanded state shows icon-based options:
  - Period: 📅 7d | 📆 30d | ∞ All
  - Status: ✨ All | ⏳ Waiting | ✓ Done
- Remove player/category filters from default view (simplify)

**2.4 Create `TimelineEntryCard.tsx`**
- Replace current `HistoryAttemptCard`
- **Left border color coding**:
  - Purple (`colors.primary`) = You initiated
  - Emerald (`colors.success`) = Partner initiated
- **Card structure**:
  1. Top row: "You → Partner" + timestamp
  2. Main: Bid description (prominent)
  3. Bottom: Category badge + Status indicator
- **Status indicators**:
  - ✓ emerald for acknowledged
  - "Pending" in amber
- Expandable for details (logged time, ack time, reminder button)

---

### Phase 3: Refactor HistoryScreen

**3.1 New Layout Hierarchy** (top to bottom)
```
1. Header (compact: 💫 emoji + "History")
2. StatusSnapshotCard (Waiting | Acknowledged)
3. HealthInsightsCard (3 metrics)
4. CollapsibleFilterControls
5. Timeline (FlatList with TimelineEntryCard)
```

**3.2 Remove/Collapse Sections**
- Remove: "Our Journey" GemLeaderboard section
- Remove: "Analytics" detailed stats section
- Remove: "Category Breakdown" section
- Remove: "Request Stats" section
- These are replaced by the condensed `HealthInsightsCard`

**3.3 Simplify State**
- Remove: `showLeaderboard`, `showAnalytics`, `showCategoryBreakdown`, `showRequestStats`
- Remove: `playerFilter`, `categoryFilter` from default
- Add: `isFilterExpanded: boolean` (default: false)
- Add: `expandedAttemptId: string | null`

**3.4 Update FlatList**
- Use new `TimelineEntryCard` component

---

### Phase 4: Navigation Bar Updates

**4.1 Update Tab Labels in `App.tsx`**
- Line 136: `tabBarLabel: 'Log'` → `tabBarLabel: 'Give'`
- Line 146: `tabBarLabel: 'Ack'` → `tabBarLabel: 'Receive'`
- (Functionality stays the same - Receive goes to Acknowledgements page. Future: merge Requests & Suggestions here)

**4.2 Update Tab Icons**
- Line 147: `icon="✅"` → `icon="📨"`

**4.3 Add Notification Badge**
- Create `TabIconWithBadge` component (extends existing `TabIcon`)
- Add small dot indicator when `pendingCount > 0`
- Wire up `usePendingAcknowledgments` hook in `TabNavigator`
- Apply badge to "Receive" tab
- Apply badge to "Give" tab for Requests pending only

---

### Phase 5: Polish & Testing

**5.1 Animations**
- Pulsing animation on Waiting card when count > 0
- Smooth expand/collapse for filters and timeline entries
- Scale feedback on touch (`active:scale-95`)

**5.2 Empty States**
- No entries for period: 🌙 "No entries for this period"
- All acknowledgements: Waiting card shows 0, no pulse

**5.3 Testing Verification**
- [ ] Navigation labels show "Give" and "Receive"
- [ ] Receive tab shows dot when pending Acknowledgements exist
- [ ] Give tab shows dot when pending Requests exist
- [ ] Status cards show correct counts and pulse appropriately
- [ ] Health Insights displays 3 metrics correctly
- [ ] Filters collapse/expand smoothly
- [ ] Timeline entries show correct border colors (purple for you, emerald for partner)
- [ ] "Who → Who" header is clear in timeline entries
- [ ] All above-the-fold content fits on mobile screen (~416px)

---

## Design Tokens Reference

| Token | Value | Usage |
|-------|-------|-------|
| `colors.warning` | `#F59E0B` | Pending/Waiting state |
| `colors.success` | `#22C55E` | Acknowledged/Done state |
| `colors.primary` | `#8B5CF6` | You initiated, active states |
| `borderRadius.lg` | `16` | Cards (rounded-2xl equivalent) |
| `spacing.md` | `16` | Card padding (p-4 equivalent) |

---

## Success Criteria

- User can understand current state in < 5 seconds
- User can identify what needs attention without scrolling
- Clear who did what for whom in every timeline entry
- "Give" and "Receive" labels are intuitive
- Interface feels calmer with more data, not less
