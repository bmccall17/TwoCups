**systemicaudit+refactorplan.md** invites judgment and sets a high bar for implementation clarity.

---

## Prompt for Claude: DOM Structure Audit & Refactor Plan

You are acting as a **senior frontend architect** brought in to clean up a structurally overgrown UI codebase.

### Context

In this application, the DOM has accumulated **excessive wrapper `<div>`s**, including:

* Redundant or duplicated containers
* Wrapper-for-wrapper patterns
* Structural divs that no longer serve layout, accessibility, or interaction needs
* Layout logic that could be handled by fewer elements, CSS, or semantic HTML

This has started to:

* Obscure layout intent
* Increase cognitive load for developers
* Introduce styling brittleness
* Complicate debugging and performance tuning

### Your Mission

Produce a **clear audit, judgment, and implementation plan** to rationalize the DOM.

---

## 1. Full-Scope Audit

Analyze the codebase and document:

* The **actual DOM structure** being rendered (not just JSX intent)
* Repeated wrapper patterns and duplicated structures
* Divs whose only purpose is spacing, grouping, or historical leftovers
* Components where DOM depth exceeds what the layout truly requires

For each recurring pattern, explain:

* Why it exists today
* Whether it still provides real value
* The cost of keeping it (maintenance, styling, performance, clarity)

---

## 2. “Should Exist vs Should Not Exist” Framework

Define a **decision rubric** for DOM elements:

### Clearly Define:

* Which wrappers are **structurally essential**
* Which are **conditionally useful**
* Which are **purely redundant**

Examples:

* Layout-only wrappers that can be replaced by CSS Grid/Flex
* Components that can collapse multiple divs into one
* Opportunities to use semantic elements (`section`, `nav`, `article`, etc.)

Deliverable:

* A concise **rule set** developers can follow going forward to avoid reintroducing bloat

---

## 3. Target Architecture

Propose a **clean, future-proof DOM philosophy** for the app:

* Ideal DOM depth per component type
* Preferred layout strategies (Grid/Flex over wrappers)
* Clear separation of:

  * Structural layout
  * Visual styling
  * Behavioral logic

Include:

* Before/after examples (JSX + rendered DOM)
* A “gold standard” component example

---

## 4. Cull Plan (Safe Refactor Strategy)

Provide a **step-by-step plan** to remove or consolidate divs without breaking behavior:

* Which files/components to start with (highest ROI first)
* How to verify nothing breaks (visual diffs, interaction tests)
* Incremental vs sweeping refactor guidance

Call out:

* Any risky areas
* Dependencies between components
* Where refactoring should be postponed or paired with CSS cleanup

---

## 5. Implementation Checklist

End with an **actionable checklist** developers can execute:

* Concrete refactor tasks
* CSS changes required to support DOM reduction
* Linting or conventions to prevent regression
* Optional tooling (DOM depth warnings, React DevTools usage, etc.)

---

### Output Format

* Use **clear headings**
* Be opinionated and explicit
* Favor diagrams, tables, and before/after examples
* Assume this will directly guide implementation—not just discussion

Your goal is not to “clean up code,” but to **restore structural clarity and intent to the UI system**.

---

If you want, next I can:

* Tighten this for a **React / React Native / Expo-specific** codebase
* Adapt it to a **Claude Code CLI** workflow (so it outputs diffs or PR-ready steps)
* Or turn this into a **standing “DOM Hygiene” playbook** for your team
