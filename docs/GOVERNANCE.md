# Documentation Governance

This document establishes policies for where documentation lives, how it's named, who maintains it, and how we prevent documentation sprawl.

## Single Source of Truth

**`docs/README.md` is the canonical table of contents (TOC)** for all project documentation. Every doc under `/docs` must be linked from README.md. If it's not in the TOC, it doesn't officially exist.

---

## Location Policy

### Root-Level Docs (Allowed)

Only these files are permitted at the repository root level:
- `README.md` - Project overview
- `AGENTS.md` - Agent workflow documentation
- `SHIPLOG.md` - Canonical changelog/ship log
- `LICENSE` - License file
- `CONTRIBUTING.md` - Contribution guidelines (if created)
- `.github/` config files - GitHub workflows, templates, etc.

**Everything else goes in `/docs`.**

### Doc Categories

| Type | Location | Purpose |
|------|----------|---------|
| Product Requirements | `docs/prd/` | Feature specs, product decisions, vision docs |
| Technical Specs | `docs/specs/` | Architecture, API specs, design standards |
| Runbooks | `docs/runbooks/` | How-to guides, operational procedures |
| Audit Reports | `docs/audits/` | Code reviews, analysis, assessments |
| Investigations | `docs/investigations/` | Bug fixes, debugging sessions, audit crumbs |
| Reference Material | `docs/reference/` | Reference tables, symbol guides, glossaries |
| Archived Docs | `docs/archive/` | Completed work, deprecated docs, historical records |

---

## Naming Conventions

### Basic Rules

1. **Use lowercase with hyphens**: `gem-economy.md` (not `GemEconomy.md` or `gem_economy.md`)
2. **No spaces or special characters** except hyphens
3. **Descriptive names**: `custom-tab-bar-design.md` not `design1.md`

### Optional Prefixes (when helpful)

Use type prefixes only if the category alone isn't clear:
- `prd-` for PRDs: `prd-dark-mode.md`
- `spec-` for specs: `spec-firestore-rules.md`
- `runbook-` for runbooks: `runbook-deployment.md`
- `audit-` for audits: `audit-security-review.md`

### Date Prefixes (only for time-bound reports)

Use `YYYY-MM-DD` prefix only for dated reports or one-time audits:
- `2026-01-19-security-audit.md` ✅
- `2026-01-19-gem-economy.md` ❌ (gem-economy.md is timeless)

---

## Doc Header Block (Required)

Every document must start with metadata:

```markdown
# Document Title

**Status:** active | draft | deprecated | archived
**Owner:** @username (or team name)
**Last Updated:** 2026-01-19
**Audience:** [Developers | Product | All]
**Related:** [link to related docs, if any]

---

[Document content begins here...]
```

### Status Values

- **draft** - In progress, not finalized
- **active** - Current, maintained, canonical
- **deprecated** - No longer used, see replacement doc
- **archived** - Historical, kept for reference only

### Owner

The person or team responsible for keeping this doc current. Updates should notify the owner.

---

## Deprecation Policy

When a document is no longer current:

1. **Add a deprecation banner** at the top:
   ```markdown
   ⚠️ **DEPRECATED** (2026-01-19)
   See [replacement-doc.md](../specs/replacement-doc.md) instead.
   ```

2. **Move to archive**:
   - Move file from its current category to `docs/archive/`
   - Rename with category prefix: `archive/prd-old-design.md`
   - Update `docs/archive/README.md` TOC

3. **Update links**:
   - Search for references and update to point to replacement
   - Add redirect note in original location if external links exist

4. **Do not delete** - Preserve history for reference

---

## Golden Docs Concept

Understand the difference between doc types:

| Type | Purpose | Freshness |
|------|---------|-----------|
| **Golden** | Canonical, authoritative, actively maintained | Must be current |
| **Reference** | Supporting info, examples, historical context | Can be older, dated if time-bound |
| **Notes** | Scratch work, exploration, temporary | Archive or delete when done |

Examples:
- **Golden:** `docs/specs/firestore-rules.md` (current rules of record)
- **Reference:** `docs/reference/sacred-geometry.md` (reference symbols)
- **Notes:** Session notes in commit messages, not stored as docs

---

## Update Requirements

### PR Review Rule

**Any PR that changes behavior must update at least one doc OR include a comment stating "no doc change needed".**

What counts as "changing behavior":
- New feature
- Bug fix that changes user-facing behavior
- API or interface change
- Architectural change
- Build/deployment process change

What doesn't require doc updates:
- Code refactoring with no behavior change
- Performance optimization (unless user-visible)
- Internal dependency bumps
- Test-only changes

### Update Checklist (Use in PRs)

When you update docs:
- [ ] New doc has Status/Owner/Last Updated header block
- [ ] Doc lives in the correct category folder
- [ ] `docs/README.md` TOC is updated (if new doc added)
- [ ] File naming follows conventions (lowercase-with-hyphens)
- [ ] If replacing a doc, old doc marked deprecated and moved to archive
- [ ] All links are relative and functional

---

## Review Cadence

### Quarterly Docs Review (lightweight)

Once per quarter, the team should:
1. Check for deprecated docs that could be archived
2. Verify all "active" docs still match current state
3. Look for orphaned docs (not linked in README.md TOC)
4. Update `Last Updated` dates on actively maintained docs

**Lightweight checklist** (~30 minutes):
- [ ] Any docs ready to deprecate?
- [ ] Any "active" docs that are stale?
- [ ] Any docs in `/docs` not in TOC?
- [ ] Do status/owner fields still match?

---

## How to Add a New Doc (3 Steps)

### Step 1: Choose the Category
Use the decision tree below:
- Are you describing how to do something? → `docs/runbooks/`
- Are you defining a feature or requirement? → `docs/prd/`
- Are you specifying technical design? → `docs/specs/`
- Are you documenting an audit or review? → `docs/audits/`
- Are you providing reference material? → `docs/reference/`
- Otherwise → See maintainer

### Step 2: Create with Header Block
```bash
# Example: new runbook
cat > docs/runbooks/new-runbook.md << 'EOF'
# New Runbook Title

**Status:** draft
**Owner:** @your-username
**Last Updated:** 2026-01-19
**Audience:** Developers
**Related:** [link to related docs]

---

## Overview
[Your content...]
EOF
```

### Step 3: Update docs/README.md
Add an entry in the appropriate section table and commit both files together.

---

## Shiplog + Investigations Policy

This section establishes how we preserve audit trails while keeping documentation organized: **investigations are "crumb" docs**, and **SHIPLOG.md is the canonical changelog**.

### Overview

- **SHIPLOG.md** is the canonical record of what shipped, fixed, and when
- **Investigations** are short docs that capture problem → root cause → fix → verification
- **Resolved investigations** are summarized into SHIPLOG.md on a consistent cadence
- Investigations stay detailed; SHIPLOG stays concise

### When to Create an Investigation

Create an investigation doc when:
- The fix required debugging/auditing beyond a quick glance
- Root cause is non-obvious or likely to recur
- The change affects foundations: navigation, layout, auth, data integrity, build/deploy, performance, or security
- You want a breadcrumb trail for future developers or backlog candidates

**Skip investigations for:**
- Single-file, obvious cause, low-risk, quick-to-verify trivial fixes
- In this case, add entry directly to SHIPLOG or note "no investigation needed" in PR

### Investigation Metadata (Required Header)

Every investigation must include:
```markdown
**Status:** open | resolved | superseded | archived
**Owner:** [Agent name(s) or developer]
**Created:** [YYYY-MM-DD]
**Last Updated:** [YYYY-MM-DD]
**Related:** [PR/commit links, specs, related investigations]
```

### Investigation Status Values

- **open** - Still being investigated or not fully fixed/verified
- **resolved** - Fixed and verified (ready to compile into SHIPLOG)
- **superseded** - Replaced by another investigation (link to the new one)
- **archived** - Completed and moved out of active investigations (optional)

### Investigation Naming

```
docs/investigations/YYYY-MM-DD-short-slug.md
```

Example: `docs/investigations/2026-01-19-history-tab-inset.md`

### Investigation Template & Structure

Use template: `docs/templates/investigation.md`

Minimum required sections:
- Problem / Symptoms
- Scope
- Investigation Notes
- Root Cause
- Fix
- Verification Steps
- Follow-ups / Backlog Candidates
- Links (PRs/commits, related docs)

### How Investigations Become SHIPLOG

**Compilation rule:**
1. When an investigation changes to `resolved`, it gets compiled into SHIPLOG.md
2. SHIPLOG entry references the investigation doc and PR/commit
3. Investigation doc remains as permanent crumb trail

**Compilation cadence (pick one and stick to it):**
- End of day (recommended for fast-moving work)
- End of sprint
- Before release

### SHIPLOG Format (Concise)

SHIPLOG entries should be short:
- Date
- What shipped/fixed (1–3 bullets)
- Verification (1 bullet)
- Links to investigation doc(s) and PR/commit

**SHIPLOG should NOT contain:**
- Deep root-cause writeups (those live in investigation crumbs)
- Extended investigation notes

### Single Source of Truth Pointers

- **`SHIPLOG.md`** answers: "What changed recently?"
- **`docs/investigations/README.md`** answers: "What investigations are active/resolved?"
- **Individual investigation docs** answer: "Why was this broken and what did we do?"

### PR Checklist for Investigations

When adding an investigation:
- [ ] Investigation lives in `docs/investigations/YYYY-MM-DD-slug.md`
- [ ] Includes required header block (Status, Owner, Created, Last Updated, Related)
- [ ] Uses template from `docs/templates/investigation.md`
- [ ] Updated `docs/investigations/README.md` with new crumb link

When resolving an investigation:
- [ ] Investigation status changed to `resolved`
- [ ] SHIPLOG.md entry added referencing investigation
- [ ] `docs/investigations/README.md` updated to reflect new status
- [ ] PR/commit linked in investigation `Related` field

---

## Enforcement

### Automated Checks

**GitHub Actions workflow** (`.github/workflows/docs-policy.yml`):
- ❌ Fails if new `.md` files are added outside `/docs` (except allowlisted root files)
- ⚠️ Warns if new doc is added without updating `docs/README.md`
- ⚠️ Warns if doc is missing Status/Owner/Last Updated header

### Manual Review (PR template)

PR checklist reminds authors to:
- Place new docs in `/docs` under the right category
- Use lowercase-with-hyphens naming
- Include header block
- Update `docs/README.md`

---

## Questions?

If you're unsure where a doc belongs, ask:
1. Check the decision tree above
2. Look at `docs/README.md` for similar docs
3. Ask in PR review - better to get feedback than guess wrong

Remember: **When in doubt, ask. Docs are easier to move than to find.**
