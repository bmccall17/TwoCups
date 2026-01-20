# Investigations Index

**Status:** active
**Owner:** Engineering
**Last Updated:** 2026-01-19

This directory contains investigation crumbs: short documentation of bugs, audits, debugging sessions, and non-trivial fixes.

See [Shiplog + Investigations Policy](../GOVERNANCE.md#shiplog--investigations-policy) for the complete policy.

---

## Quick Facts

- **What are they?** Short docs that capture problem → root cause → fix → verification
- **Why?** Preserve audit trails and create breadcrumbs for future developers
- **Where do they go?** `docs/investigations/YYYY-MM-DD-short-slug.md`
- **How are they used?** Resolved investigations are compiled into `SHIPLOG.md`
- **Template:** Use [investigation.md](../templates/investigation.md)

---

## Open Investigations

[No active investigations yet. Add entries as they're created.]

| Date | Title | Status | Owner | PR |
|------|-------|--------|-------|-----|

---

## Resolved Investigations

[Compiled investigations that have been summarized in SHIPLOG.md]

| Date | Title | SHIPLOG Entry | PR |
|------|-------|---|-----|

---

## Superseded Investigations

[Investigations replaced by newer approaches. Still preserved for reference.]

| Date | Title | Replaced By | Reason |
|------|-------|-------------|--------|

---

## How to Use This Directory

### Adding a New Investigation

1. Create a file: `docs/investigations/YYYY-MM-DD-short-slug.md`
2. Use the template: `docs/templates/investigation.md`
3. Update this README to list it under "Open Investigations"
4. Create a PR; CI will verify format

### Marking as Resolved

1. Update investigation status to `resolved`
2. Create SHIPLOG.md entry summarizing the fix
3. Update this README: move to "Resolved Investigations"
4. Keep the investigation doc as a permanent crumb trail

### Marking as Superseded

1. Update status to `superseded`
2. Add a link to the new investigation
3. Update this README

---

## Formatting

All investigations must include this header block:

```markdown
**Status:** open | resolved | superseded | archived
**Owner:** [Agent names or developer]
**Created:** [YYYY-MM-DD]
**Last Updated:** [YYYY-MM-DD]
**Related:** [PR/commit links, specs, runbooks]
```

Sections required:
- Problem / Symptoms
- Scope
- Investigation Notes
- Root Cause
- Fix
- Verification Steps
- Follow-ups / Backlog Candidates
- Links

See template: [docs/templates/investigation.md](../templates/investigation.md)

---

## Related Documentation

- **SHIPLOG.md** - Canonical changelog (compiled from resolved investigations)
- **docs/GOVERNANCE.md** - General docs governance (includes this policy as a section)
- **docs/README.md** - Main documentation index
