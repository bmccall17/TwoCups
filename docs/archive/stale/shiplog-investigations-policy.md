# Shiplog + Investigations Policy

**Status:** active  
**Owner:** _TBD (e.g., “Engineering” or “Product + Engineering”)_  
**Last Updated:** 2026-01-19  
**Audience:** Developers (and anyone shipping changes)  
**Related:** `SHIPLOG.md`, `docs/README.md`, `docs/GOVERNANCE.md`, `docs/investigations/README.md`, `.github/pull_request_template.md` (if present)

---

## Overview

This policy prevents doc sprawl while preserving an audit trail: **investigations are small “crumb” docs** and **SHIPLOG.md is the canonical changelog** compiled from resolved investigations.

## Policy Statement

- **SHIPLOG.md is the canonical record of what shipped/fixed and when.**
- **Non-trivial fixes must produce an investigation doc** that captures problem → root cause → fix → verification.
- **Resolved investigations must be summarized into SHIPLOG.md** on a consistent cadence.
- SHIPLOG stays concise; deeper reasoning and notes live in investigations.

### Scope

Applies to:
- Bug fixes, debugging sessions, audits, and production issues
- Non-trivial refactors that could regress
- Any change where future-you (or another dev) would ask “why did we do this?”

Does not apply to:
- Pure copy changes, tiny style tweaks, or trivial fixes (see Exceptions)

### Definitions

- **Investigation (crumb):** A short markdown doc describing an issue and how it was investigated/fixed.
- **Non-trivial fix:** A change requiring debugging across multiple files/systems, or where the root cause is not obvious.
- **Resolved investigation:** The fix is merged/shipped and verification steps pass.
- **Superseded investigation:** The approach changed; the investigation is no longer the active path (link to the new one).
- **Compilation:** The act of summarizing resolved investigations into SHIPLOG.md entries.
- **Canonical:** The first place someone should look for “what changed” (SHIPLOG).

## Rules

### A) Where things live (structure)

- [ ] **All investigation docs live in** `docs/investigations/`.
- [ ] `docs/investigations/README.md` must exist and act as the index for investigation crumbs.
- [ ] SHIPLOG remains at `SHIPLOG.md` (canonical changelog).

### B) Investigation lifecycle + required metadata

- [ ] Every investigation doc must include a header block with:
  - **Status:** `open | resolved | superseded | archived`
  - **Owner** `use the name of any agents that were spun up in the processing`
  - **Created**
  - **Last Updated**
  - **Related** (PR/commit links, issues, specs, runbooks)

- [ ] Status semantics:
  - `open`: still being investigated or not fully fixed/verified
  - `resolved`: fixed and verified (ready to compile into SHIPLOG)
  - `superseded`: replaced by another investigation (must link to the new one)
  - `archived`: completed and moved out of the active investigations index (optional)

### C) Naming convention

- [ ] Investigation file naming must be:
  - `docs/investigations/YYYY-MM-DD-short-slug.md`
  - Example: `docs/investigations/2026-01-19-history-tab-inset.md`

### D) When to create an investigation (and when not to)

- [ ] Create an investigation doc when:
  - The fix required debugging/auditing beyond a quick glance
  - Root cause is non-obvious or likely to recur
  - The change affects navigation/layout foundations, auth, data integrity, build/deploy, performance, or security
  - You want a breadcrumb trail that can become backlog follow-ups

- [ ] If it’s a tiny fix (single-file, obvious cause, low risk), it may skip investigations and go straight to SHIPLOG (see Exceptions).

### E) What goes inside an investigation (minimum required sections)

- [ ] Use the investigation template (`docs/templates/investigation.md`) and include:
  - Problem / symptoms
  - Scope
  - Investigation notes
  - Root cause
  - Fix
  - Verification steps
  - Follow-ups / backlog candidates
  - Links (PRs/commits, related docs)

> Note: “Follow-ups / backlog candidates” is intentionally part of the investigation doc so unresolved or future work doesn’t vanish.

### F) SHIPLOG format (canonical but concise)

- [ ] SHIPLOG entries must be short and consistent:
  - Date
  - What shipped/fixed (1–3 bullets)
  - Verification (1 bullet)
  - Links: investigation doc(s) + PR/commit

- [ ] SHIPLOG should **not** contain deep root-cause writeups; those live in investigation crumbs.

### G) Compilation rule (how investigations become SHIPLOG)

- [ ] When an investigation changes to `resolved`, it must be compiled into SHIPLOG.
- [ ] Default cadence (choose one and stick to it):
  - End of day **(recommended for fast-moving work)**
  - End of sprint
  - Before release

- [ ] “Compilation complete” means:
  - A SHIPLOG entry exists that links the resolved investigation doc(s)
  - The investigation remains as the crumb trail

### H) Enforcement (lightweight + practical)

- [ ] PRs that add an investigation must update:
  - `docs/investigations/README.md` (add the new crumb link)
  - `docs/README.md` only if a new *category* is created (not required per investigation)

- [ ] PRs that resolve an investigation must either:
  - Include the SHIPLOG entry **in the same PR**, or
  - Add the SHIPLOG entry within **X days** (warning only, not a hard block)

- [ ] Automation should be “warn-first,” not blocking:
  - Warn if an investigation doc is added outside `docs/investigations/`
  - Warn if an investigation doc is missing the required header fields
  - Warn if a resolved investigation exists with no SHIPLOG reference after X days

> Implementation note: put the warn checks in CI (GitHub Action) or PR template checklist, depending on repo norms.

### I) Suggested “single source” pointers (so people know where to look)

- [ ] `SHIPLOG.md` answers: “What changed recently?”
- [ ] `docs/investigations/README.md` answers: “What are we debugging / what crumbs exist?”
- [ ] Individual investigation docs answer: “Why was it broken and what did we do?”

## Exceptions

- Trivial fixes may skip investigations when all are true:
  - One file (or similarly small change)
  - Obvious root cause
  - Low risk / unlikely to recur
  - Verified quickly

If skipping an investigation:
- Add a SHIPLOG entry directly, or
- Clearly state in the PR description: “No investigation needed (trivial fix).”

## Review & Updates

- Review this policy **quarterly** or whenever docs structure changes.
- Update the policy if:
  - New doc categories are introduced
  - Enforcement tooling changes
  - SHIPLOG format or cadence changes

Changelog:
- 2026-01-19: Initial policy drafted (Hybrid: Investigations as crumbs → compiled into canonical SHIPLOG)
