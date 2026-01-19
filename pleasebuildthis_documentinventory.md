Here’s a copy/paste prompt for Claude that will drive a **real doc-inventory + re-org plan + implementation PR**, not just vague advice.

```text
You are a senior engineering PM + technical writer. I need you to audit and reorganize the project’s internal documentation.

## Context / Problem
Our repo has multiple “policy / standards / plans” docs scattered around (layout standards, architecture notes, PRDs, checklists, implementation plans, etc.). Many overlap, drift, and lack a clear home. This causes confusion for devs/designers and makes it hard to know “what’s current” vs “historical.”

## Your Mission
1) Inventory every documentation artifact in the repo.
2) Diagnose duplication, drift, and missing docs.
3) Propose a streamlined information architecture (IA) with a clear table-of-contents.
4) Implement the re-org with minimal disruption (moves + renames + small edits + index files), and output a PR-ready change plan.

## Constraints
- Do NOT rewrite everything. Prioritize clarity and structure first.
- Preserve git history where possible (prefer moves/renames over copy/paste).
- Keep old content accessible, but clearly labeled as deprecated or historical.
- Avoid “docs for docs’ sake.” This should be usable by my team immediately.

## Deliverables (in this order)

### A) Repo-wide Doc Inventory
Create a table with:
- Current Path
- Doc Title
- Doc Type (Policy / Standard / PRD / Runbook / ADR / Notes / Spec / Checklist / Other)
- Owner (if obvious)
- Audience (Dev / Design / PM / Mixed)
- Freshness (Active / Possibly stale / Deprecated)
- Duplicates / overlaps (links to related docs)
- Recommended Action (Keep / Merge / Split / Rename / Move / Deprecate)
- Priority (P0/P1/P2)

### B) Proposed Documentation IA + TOC
Propose a structure under `/docs` (or improve current one) including:
- A top-level `docs/README.md` acting as the main “Docs Home”
- A clear TOC with 1–2 sentence descriptions per doc
- Naming conventions (file names, prefixes, date usage)
- Rules: what goes where, how new docs get added, how to mark deprecated docs
- “Golden docs” concept (source-of-truth vs references)

### C) Consolidation Plan
List concrete actions:
- Moves/renames (old path -> new path)
- Merges (what folds into what, with rationale)
- Splits (what should become separate docs)
- Deprecations (what stays but gets labeled + moved to archive)
- New docs needed (only if critical)

### D) Implementation
Make the actual changes:
- Create/Update `docs/README.md` with the TOC
- Move/rename files accordingly
- Add “This doc is deprecated” banners where needed
- Fix internal links so nothing breaks
- Add a small “Docs Governance” section describing upkeep rules

### E) PR Summary
Provide:
- PR title
- Bullet summary of changes
- Any follow-ups left for the team

## Bonus (if easy)
- Add lightweight cross-linking between related docs (e.g., Layout Standards referenced by Architecture)
- Add a doc template for future PRDs/policies

## Questions you should answer yourself (do not ask me unless absolutely necessary)
- What is the minimum structure that makes docs discoverable?
- Which docs are truly source-of-truth vs local notes?
- How can we reduce drift going forward?

Start by scanning the repo and producing Deliverable A (Inventory), then continue.
```

If you want to make it even more “Claude Code friendly,” add this one-liner at the end:

```text
If you can, implement this in a single PR with commits grouped as: (1) add docs index/TOC, (2) moves/renames, (3) link fixes + deprecation banners.
```

