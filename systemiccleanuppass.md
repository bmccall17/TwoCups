systemiccleanuppass.md

Below is a **phased workflow strategy** you can hand to your developer team to untangle the nested “div soup” (RN Web Views), normalize layout, and eliminate issues like the buried **Sign Out** button across the app.

---

## North Star for the cleanup

**Goal:** Every screen uses a small set of shared layout primitives + consistent safe-area/tab-bar spacing + consistent typography components, so:

* DOM depth shrinks
* click targets behave
* spacing is predictable and elegant
* bugs like “button hidden behind nav” disappear everywhere at once

---

# Phase 0 — Lock the baseline (so cleanup doesn’t feel scary)

**Deliverables**

1. **Screens Inventory** (list every screen/route)
2. **Known UI Bugs Backlog** grouped by category (layout, typography, touch targets, z-index/overlays, scroll)
3. **Golden Screens**: choose 3–5 screens as “reference quality” to keep stable (Settings is now one)

**Rules**

* No new UI features until Phase 2 is underway (or you’ll be cleaning a moving target).
* All cleanup work must be behind small PRs with screenshots.

---

# Phase 1 — Audit + measure “DOM soup” (1 day, high leverage)

The dev team should produce an audit doc that includes:

### A) Depth + wrappers audit

For each top screen:

* Approx **DOM depth** (or View nesting depth) in the main content column
* # of “wrapper views” that exist only for spacing/alignment
* Presence of absolute overlays / z-index hacks

### B) Identify the top 5 structural causes

Usually it’s some combo of:

* inconsistent screen container usage (each screen hand-rolls padding/margins)
* mixed ScrollView vs View patterns
* tab bar height not accounted for
* modals/overlays mounted inside screen containers
* typography/styles duplicated per-screen

### C) One “layout contract” proposal

A short definition of what every screen must follow (see Phase 2).

---

# Phase 2 — Create layout primitives (the real cleanup “engine”)

This is where you stop fixing symptoms and start fixing the system.

## 2.1 Introduce a Screen Layout Contract

Create a single standard wrapper used everywhere:

### `Screen`

* handles: safe area, background, default horizontal padding, and **bottom inset** for TabBar
* optionally scrollable

**Key idea:** Tab bar overlap is a *class* of bugs solved by **one shared container**.

**Acceptance criteria**

* No screen manually guesses bottom padding.
* No screen positions important buttons at the very bottom without inset awareness.

## 2.2 Add a tiny set of primitives (keep it small)

* `Screen`
* `Section` (title + body container)
* `Card` (consistent radius/shadow/padding)
* `Row` / `Stack` (gap-based layout, replaces “wrapper Views”)
* `Spacer` (rarely needed if Stack supports `gap`)
* `Divider`
* `AppText` (you already have it — keep migrating)
* `Button` / `Pressable` wrapper with consistent hitSlop + pressed states

**Rule:** If a wrapper exists only for `marginTop: 8`, it’s a smell. Use Stack/Section.

---

# Phase 3 — Navigation + Safe Area + Scroll normalization (kills 50% of layout bugs)

This is where the “Sign Out buried by navbar” class of bugs gets eliminated.

## 3.1 Define the “bottom inset” strategy

Pick one:

* **Preferred:** `Screen` reads tab bar height and applies `contentContainerStyle.paddingBottom = tabBarHeight + safeInset`
* Alternate: universal `SafeAreaView` + `useBottomTabBarHeight()` (React Navigation) for tabbed screens

**Acceptance criteria**

* Any ScrollView content can reach the bottom without being hidden
* Any bottom-aligned CTA sits above the nav reliably

## 3.2 Standardize scrolling

Decide:

* Screens that scroll use `Screen scroll`
* Screens that don’t scroll use `Screen static`

**Rule:** Avoid nesting ScrollViews inside ScrollViews unless absolutely needed.

---

# Phase 4 — Systematic screen migration (batch it, don’t nibble)

Now you migrate screens in batches, using the primitives.

### Batch order (suggested)

1. **Most-used**: Home, Acknowledge, Make Request, History/Gem History
2. **Forms-heavy**: Login/Auth flows, Settings sections
3. **Edge / rarely used**

### What “migration” means per screen

* Replace outer wrapper stacks with `Screen`
* Replace repeated padding/margins with `Section/Card/Stack`
* Convert Text → `AppText`
* Remove redundant wrappers
* Confirm click targets and tab-bar insets

**Acceptance criteria (per screen)**

* DOM depth reduced (target: ~30–50% fewer wrappers in main column)
* No essential controls hidden under nav
* No absolute-position hacks unless documented
* Visual parity maintained (or improved) with screenshots

---

# Phase 5 — Enforcement (so div soup doesn’t grow back)

Add guardrails so the team can’t accidentally regress.

### 5.1 Lint rules / conventions

* disallow raw `<Text>` except inside `AppText` (or a very small allowed list)
* discourage inline style objects in JSX (push to shared styles/primitives)
* warnings for deeply nested Views (yes, you can write a simple heuristic rule or just enforce in PR review)

### 5.2 PR checklist (required)

* Before/after screenshots
* Notes on wrapper count reduction
* Verified on web + mobile viewport sizes
* Verified keyboard + scroll behavior (forms)

### 5.3 “UI Debt” bucket

Any hack that survives gets logged with:

* why it exists
* what would remove it
* which primitive should eventually replace it

---

## A concrete instruction for the “Sign Out buried” bug (without doing it one-off)

Tell them:

* Don’t patch the Sign Out button specifically.
* Fix it by migrating Settings to the new `Screen` contract:

  * `Screen scroll` with `contentContainerStyle.paddingBottom = tabBarHeight + safeInset + 16`
  * Ensure Settings uses **one** ScrollView (not nested)
  * Ensure `Quick Actions` section ends with safe bottom spacing

That single approach will prevent the same bug on other screens too.

---

## What you should ask the team to produce this week

1. **Audit doc** (Phase 1 outputs)
2. **PR #1:** `Screen` + bottom inset strategy + `Stack/Section/Card` primitives
3. **PR #2:** Migrate 2 highest-traffic screens to the contract (Home + Acknowledge, for example)
4. **PR #3:** Migrate Settings fully (to eliminate buried Sign Out as a proof)

---

If you want, paste (or screenshot) your current layout primitives / navigation setup (tabs + screen containers), and I’ll tailor the `Screen` contract to your exact stack (Expo + RN Web + React Navigation vs other). That’s the single most important piece to get right before migration.
