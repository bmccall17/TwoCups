Items That May Fall Outside TwoCups' Intended Experience
========================================================

Based on the README's design principles (no punishment, slow by design, attunement over optimization), here are features that were identified as potentially conflicting - and their resolution status.

## Resolved Items

### 1. GemLeaderboard Component (src/components/common/GemLeaderboard.tsx)
**STATUS: ADDRESSED**
- Removed "Gem Champion" labels and leader logic
- Transformed header from "Gem Leaderboard" to "Our Shared Journey"
- Replaced competitive messages with collaborative ones ("Y'all are building something beautiful together!")
- Added prominent combined total display
- Kept Weekly vs All-Time toggle but framed collaboratively

### 2. Milestone Celebration System (src/context/MilestoneCelebrationContext.tsx)
**STATUS: ADDRESSED**
- Softened competitive language ("crushing it" → "gems of care shared")
- Replaced competitive badges (🏆👑 → 🌸💕)
- Individual achievements now framed around shared journey

### 3. GemCounter Component (src/components/common/GemCounter.tsx)
**STATUS: ADDRESSED**
- Changed header from "Gem Treasury" to "Shared Gems"
- Softened encouragement messages ("You're on fire!" → "So much care flowing today!")
- Combined total remains prominent

### 4. HistoryScreen Analytics (src/screens/HistoryScreen.tsx)
**STATUS: ADDRESSED**
- Changed "Leaderboard" section header to "Our Journey"
- Replaced individual gem comparison with combined "Total Gems Together"
- Analytics now emphasize collective stats over "My vs Partner" comparisons

### 5. Weekly Gem Stats API (src/services/api/actions.ts)
**STATUS: NO CHANGE NEEDED**
- The API itself is neutral - it just returns data
- UI layer now uses this data collaboratively

---

## Design Principles (from README.md)

The README states: "if a feature undermines these feelings [safe, relieved, warmed, curious], it does not belong."

Core principles upheld:
- **No scorekeeping** - "The goal is attunement, not optimization"
- **Relational > Individual** - The shared cup matters as much as personal cups
- **Slow by design** - TwoCups values rhythm, not streaks

---

## Language Guidelines

When adding new features, avoid:
- "Champion", "winner", "leader", "beating", "crushing it"
- Side-by-side comparisons that imply competition
- Individual-focused metrics without shared context

Prefer:
- "Together", "shared", "connection", "care"
- Combined totals prominently displayed
- Collaborative framing ("Y'all are doing great!")
