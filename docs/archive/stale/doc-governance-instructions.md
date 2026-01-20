You did a solid re-org (commit 3c7971f). Now I want you to add “doc governance” so sprawl doesn’t return.

Act as a senior engineering PM + repo maintainer. Implement POLICIES + LIGHT ENFORCEMENT in-repo.

## Goal
Make it obvious where docs go, how they’re named, how they’re kept current, and add minimal automation that prevents random markdown files from popping up anywhere.

## Deliverables (make these changes directly in the repo)

### 1) Create a Docs Governance policy doc
Add: docs/GOVERNANCE.md
Include:
- Single Source of Truth: docs/README.md is the canonical TOC
- “Docs live in /docs” rule (no new docs elsewhere unless explicitly allowed)
- Allowed root-level docs list (e.g., README.md, AGENTS.md, SHIPLOG.md, LICENSE, etc.) — everything else goes in /docs
- Doc types + where they belong:
  - PRDs -> docs/prd/
  - Specs -> docs/specs/
  - Runbooks -> docs/runbooks/
  - Audits -> docs/audits/
  - Reference -> docs/reference/
  - Archive -> docs/archive/
- Naming conventions:
  - lowercase-with-hyphens.md
  - optional prefixes only if needed (prd-, spec-, runbook-, audit-)
  - dates only for time-bound reports (YYYY-MM-DD-*)
- Ownership + freshness:
  - each doc must have a small header block: Status, Owner, Last updated
  - define Status values: draft | active | deprecated | archived
- Deprecation policy:
  - add a standard “DEPRECATED” banner + pointer to replacement doc
  - move deprecated docs to docs/archive/ (do not delete)
- “Golden docs” concept:
  - what is canonical vs reference vs notes
- Update rules:
  - Any PR that changes behavior must update at least one doc OR explicitly state “no doc change needed”
- Review cadence:
  - monthly/quarterly docs review checklist (lightweight)

### 2) Update docs/README.md to include Governance + templates
- Add a “Start here” section that links to:
  - docs/GOVERNANCE.md
  - docs/templates/ (created below)
- Add a short “Where do I put this?” decision tree (5 lines max)

### 3) Add templates so new docs start consistent
Create: docs/templates/
Include templates:
- docs/templates/policy.md
- docs/templates/prd.md
- docs/templates/spec.md
- docs/templates/runbook.md
Each template should include the same header block:
Status:
Owner:
Last updated:
Audience:
Related:

### 4) Add PR enforcement (minimal and practical)
Add a PR checklist snippet somewhere devs will see it:
- Option A: .github/pull_request_template.md
- Option B: contribute section in docs/GOVERNANCE.md + link from docs/README.md

Checklist should include:
- [ ] If I added/changed a doc, it lives under /docs in the right category
- [ ] docs/README.md TOC updated (if new doc added)
- [ ] Doc has header block (Status/Owner/Last updated)
- [ ] If replacing a doc, old doc marked deprecated and moved to archive

### 5) Add a lightweight automated guardrail (pick one and implement)
Implement ONE of the following (choose the simplest that fits the repo):

A) Pre-commit hook (recommended if this repo already uses pre-commit)
- Block new *.md files outside /docs unless in allowlist
- Remind to update docs/README.md if a new doc is added

OR

B) CI check via GitHub Actions
Add: .github/workflows/docs-policy.yml
Rules:
- Fail if new markdown files are added outside /docs (except allowlisted root docs)
- Optional: warn (not fail) if docs/README.md wasn’t modified when a new doc is added under /docs
- Optional: check that new docs contain the header block fields

### 6) Output a short “What changed” summary
After implementing, reply with:
- Files added/modified
- Where governance rules live
- What the automated check enforces
- How someone should add a new doc correctly (3 steps)

## Constraints
- Do not rewrite content of existing docs beyond small headers/banners.
- Preserve history; prefer edits/moves, not duplication.
- Keep policies short, unambiguous, and enforceable.

# when complete
- archive ".\docs\docgovernance.md" in the appropriate place