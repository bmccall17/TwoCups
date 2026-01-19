````markdown
# UI Layout Standards (TwoCups)
**Status:** Draft (v0.1)  
**Owner:** _TBD_  
**Last updated:** 2026-01-19  
**Applies to:** Mobile app UI (tabs + stacks), shared components, future screens

---

## Purpose
This document is the **single source of truth** for how screens should be structured and laid out.

### What this prevents
- “Wrapper soup” / duplicate nested `<View>` / `<div>` containers
- Inconsistent padding, safe-area, and bottom inset behaviors
- Layout regressions that only show up on certain devices / navigation contexts
- Hard-to-debug styling and brittle UI changes

### What this enables
- Faster iteration with fewer layout bugs
- Consistent structure across tabs/screens
- A shared baseline for designers + developers to compare against
- Incremental refactors without “rewriting the whole UI”

---

## Golden Screens
These are the **reference implementations** for layout structure and style.  
When in doubt, compare against these.

- **HomeTab** — ✅ Golden (screenshots shared)
- **HistoryTab** — ✅ Golden (screenshots shared)

> Add links to screenshot locations (Notion/Figma/Drive) below:
- HomeTab screenshots: _TBD_
- HistoryTab screenshots: _TBD_

**What “Golden” means**
- Visual fidelity: spacing, rhythm, alignment, scroll behavior
- Structural clarity: minimal wrappers, predictable layout primitives
- Implementation patterns: uses the approved primitives correctly

---

## Layout Philosophy
### Core principle
**`Screen` owns the “page.” Primitives own spacing. Everything else must justify its existence.**

- Each screen should start with exactly one root layout owner: **`<Screen />`**
- Prefer **`Stack` / `Row`** for spacing and alignment instead of adding extra wrappers
- Avoid nesting containers unless there’s a real reason (touch, clipping, animation, etc.)

### Design intent
- Keep view depth shallow
- Make spacing consistent and easy to tweak
- Make future UI changes cheaper (less DOM/view archaeology)

---

## Required Primitives (Phase 1)
We are deliberately starting small.

### 1) `Screen` (required root)
**Responsibilities**
- Safe area handling
- Default horizontal padding (“page gutters”)
- Background color / gradient (if applicable)
- Tab bar inset policy (when relevant)
- Scroll choice (screen can be scrollable or not)

**Default behavior (recommended)**
- Safe area: **ON**
- Horizontal padding: **standard**
- Scroll: **OFF by default** (turn on when content exceeds viewport)
- One scroll container per screen (if scroll is on, it’s owned by `Screen`)

**Props (draft — dev team to finalize)**
- `safeArea?: boolean` (default `true`)
- `paddingX?: 'none' | 'sm' | 'md' | 'lg'` (default `'md'`)
- `scroll?: boolean` (default `false`)
- `tabInset?: 'auto' | 'on' | 'off'` (default `'auto'`)
- `background?: 'default' | 'muted' | 'transparent' | 'custom'` (default `'default'`)

> **TODO (Engineering):** Define `tabInset='auto'` behavior precisely for your navigation structure.

---

### 2) `Stack` (vertical layout + spacing)
**Use for**
- Vertical stacking of elements with consistent spacing
- Replacing “wrapper views for spacing”

**Props (draft)**
- `gap?: number | 'xs' | 'sm' | 'md' | 'lg'`
- `align?: 'start' | 'center' | 'end' | 'stretch'`
- `justify?: 'start' | 'center' | 'end' | 'between'`
- `pad?: number | 'xs' | 'sm' | 'md' | 'lg'`

---

### 3) `Row` (horizontal layout + spacing)
**Use for**
- Horizontal alignment of items (icons + text, button rows, stats)
- Consistent spacing between siblings without wrappers

**Props (draft)**
- `gap?: number | 'xs' | 'sm' | 'md' | 'lg'`
- `align?: 'start' | 'center' | 'end'`
- `justify?: 'start' | 'center' | 'end' | 'between'`
- `wrap?: boolean`

---

## Optional Primitives (Phase 2+)
These are **explicitly not required** yet. Add only when duplication is obvious.

- `Section` — titled groups
- `Card` — consistent container styling
- `Divider` — standardized separators
- `PageHeader` — standardized headers

> **TODO (Design + Eng):** Decide when Phase 2 begins and what triggers promotion of these primitives.

---

## Rules of Thumb (Policy)
### 1) Root rule
✅ Every screen has exactly one root layout owner: **`<Screen />`**  
🚫 No screen should start with multiple nested SafeAreaViews or wrapper containers.

### 2) No “spacing-only wrappers”
✅ Use `Stack` / `Row` gaps or padding props  
🚫 Don’t add a wrapper solely to create margin/padding/spacing

### 3) One scroll container per screen
✅ If a screen scrolls, `Screen` owns the scroll container  
🚫 Avoid nested scroll views unless there is a documented exception

### 4) Safe area is centralized
✅ `Screen` manages safe area behavior  
🚫 Don’t wrap content in additional SafeAreaView inside a screen

### 5) Tab inset is centralized
✅ `Screen` manages tab-bar overlap/inset policy  
🚫 Don’t sprinkle `paddingBottom` “just in case” unless documented

---

## Allowed Exceptions (Wrappers that are justified)
Wrappers are allowed when they serve one of these roles:

1) **Clipping**
- `overflow: hidden`, border radius clipping for images/cards

2) **Shadows / elevation boundaries**
- One wrapper for shadow, one inner wrapper for clipping (common RN pattern)

3) **Touch targets**
- Expanding hit areas (`hitSlop`) or isolating pressables

4) **Animation / measurement**
- Reanimated wrappers, layout measurement, gesture handlers

5) **Absolute background layers**
- Decorative backgrounds should be non-interactive
- Prefer `pointerEvents="none"` and place behind content

> **TODO:** Add code examples for each exception category.

---

## Screen Template (Starting Point)
> This is the recommended skeleton for new screens.

```tsx
export function ExampleScreen() {
  return (
    <Screen
      safeArea
      paddingX="md"
      scroll={false}
      tabInset="auto"
      background="default"
    >
      <Stack gap="md">
        {/* header */}
        {/* content */}
        {/* actions */}
      </Stack>
    </Screen>
  );
}
````

---

## Before / After Example (Wrapper Cull Pattern)

### Anti-pattern: wrapper-for-wrapper spacing

```tsx
<View style={{ paddingHorizontal: 16 }}>
  <View style={{ marginTop: 12 }}>
    <View style={{ marginBottom: 12 }}>
      <Text>Title</Text>
    </View>
  </View>
</View>
```

### Preferred: Screen + Stack

```tsx
<Screen paddingX="md">
  <Stack gap="md">
    <Text>Title</Text>
  </Stack>
</Screen>
```

> **TODO:** Add a real example from HomeTab or HistoryTab once dev team chooses one.

---

## Migration Strategy (Incremental)

### Order of operations

1. Pick a target screen (start with high-traffic tabs)
2. Convert root to `Screen`
3. Replace spacing wrappers with `Stack` / `Row`
4. Consolidate safe area + inset logic into `Screen`
5. Verify with the checklist below

### “Do not do yet”

* Do not standardize ScrollView vs FlatList unless there’s a functional reason
* Do not do sweeping rewrite across the entire app in one PR

> **TODO (Eng):** Define a “max wrapper depth” guideline (or add a lightweight linter rule).

---

## Verification (How we avoid regressions)

Choose at least one method and document it here:

* [ ] Manual QA checklist (quick)
* [ ] Screenshot regression testing (best long-term)
* [ ] E2E smoke tests (later)

**Current chosen method:** *TBD*
**Where it lives:** *TBD*

---

## PR Checklist (Copy into PRs)

* [ ] Screen root is `<Screen />`
* [ ] No spacing-only wrappers added
* [ ] Safe area handled only by `Screen`
* [ ] One scroll container per screen
* [ ] Tab inset policy is explicit (`auto/on/off`) where relevant
* [ ] Matches Golden Screen patterns (HomeTab / HistoryTab) where applicable
* [ ] Background layers do not steal touches (`pointerEvents="none"` if needed)

---

## Changelog

* **v0.1 (2026-01-19):** Initial draft created. Strategy set: `Screen` + `Stack/Row` + Golden screens alignment.
* *Next:* *TBD*

```

If you tell me where you keep team docs (repo `/docs`, Notion, or both), I’ll tailor the top section to match your actual workflow (and add a “Where to file screenshots + how to update Golden screens” section).
```
