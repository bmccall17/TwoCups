# Claude Plan Storage Strategy

**Status:** draft
**Owner:** @brett
**Last Updated:** 2026-01-21
**Audience:** Developers
**Related:** [GOVERNANCE.md](../GOVERNANCE.md)

---

## Overview

Strategy for storing Claude Code plan files locally in the project rather than the default `~/.claude/plans/` location.

## Decision: Copy Strategy

After research, we chose a **copy strategy** over changing `plansDirectory`:

- **Keep default location** (`~/.claude/plans/`) - avoids undocumented edge cases with session logic
- **Copy on demand** to `docs/plans/` via `/migrate-plan` slash command
- **Gitignore** `docs/plans/` - plans are ephemeral working docs, not canonical

## Why Not Change plansDirectory?

The `plansDirectory` setting exists but documentation is sparse on:
- What happens to existing plans after changing the setting
- Whether cross-session plan access breaks
- Migration behavior

Copy strategy is safer and gives explicit control.

## Implementation (Not Yet Done)

1. Create `docs/plans/` directory
2. Add `docs/plans/` to `.gitignore`
3. Create `.claude/commands/migrate-plan.md` slash command

## Slash Command Design

`/migrate-plan` will:
1. List files in `~/.claude/plans/` sorted by modification time
2. If one file, copy it to `./docs/plans/`
3. If multiple files, ask which to copy
4. Confirm success

## Triggers

Copy a plan when:
- A plan has been approved (user runs `/migrate-plan` after approval)
- User specifically requests migration for editing

## Full Plan Reference

See: `~/.claude/plans/tender-purring-pizza.md` (while it exists)

---

## Next Steps

- [ ] Implement the three items above when ready
- [ ] Test `/migrate-plan` workflow
- [ ] Consider if any hooks could auto-trigger (research showed no "plan approved" event exists)
