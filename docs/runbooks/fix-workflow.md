# Fix Workflow Playbook (For Dummies)

**Status:** active
**Owner:** Engineering
**Last Updated:** 2026-01-19
**Audience:** Developers
**Related:** [GOVERNANCE.md](../GOVERNANCE.md), [Investigations Index](../investigations/README.md), [SHIPLOG.md](../../SHIPLOG.md)

---

## Overview

This is the **meta-playbook**: the process you follow whenever you're fixing something, investigating an issue, or shipping a change. It ties together all our documentation and compliance policies.

**TL;DR:** Investigate → Document → Fix → Test → Create PR → Merge → Compile

---

## The 7-Step Fix Workflow

### Step 1: Identify & Scope the Problem

**What you do:**
- Reproduce the bug or issue
- Write down what's broken and what you observe
- Check if it's already known (search SHIPLOG.md, docs/investigations/README.md)

**What to document:**
- Symptoms (error messages, unexpected behavior, screenshots)
- When it happens (specific inputs, conditions)
- Impact (is it blocking? does it affect production?)

**Files to check:**
- `SHIPLOG.md` - Recent fixes (in case this is a regression)
- `docs/investigations/README.md` - Open investigations (in case someone else is already on it)
- GitHub issues (if using them)

**Exit criteria:** You can describe the problem in 2-3 sentences clearly.

---

### Step 2: Investigate & Root Cause

**What you do:**
- Narrow down which files/systems are involved
- Add debug logs, breakpoints, or test cases
- Form hypotheses and test them
- Document your investigation process

**If non-trivial (multiple files / non-obvious cause):**
1. Create investigation doc now:
   ```bash
   cp docs/templates/investigation.md docs/investigations/2026-01-19-short-slug.md
   ```
2. Edit the investigation doc as you investigate:
   - Add your notes to "Investigation Notes" section
   - Add hypotheses you're testing
   - Record dead ends
3. Update `Last Updated` as you work

**If trivial (obvious one-file fix):**
- You can skip creating an investigation doc now
- Just proceed to the fix
- You'll update SHIPLOG directly later

**Files to reference:**
- `docs/specs/` - Architecture and design docs
- `docs/reference/` - Technical reference materials
- Git history: `git log --oneline -- path/to/file.js`
- Git blame: `git blame path/to/file.js` (who last touched it?)

**Exit criteria:** You understand WHY it's broken, not just WHERE.

---

### Step 3: Implement the Fix

**What you do:**
- Make the code changes
- Keep changes focused (don't refactor unrelated code)
- Follow existing patterns in the codebase
- Add comments if the fix is non-obvious

**Guiding principles:**
- ✅ Do: Fix the problem
- ✅ Do: Follow existing patterns
- ❌ Don't: Refactor surrounding code
- ❌ Don't: Fix multiple unrelated issues in one PR
- ❌ Don't: Add features while fixing bugs

**Files to update:**
- The actual bug fix (obvious)
- Type definitions (if types changed)
- Tests (if adding test coverage)
- Configuration (if needed)

**Do NOT update yet:**
- SHIPLOG.md (you'll do this when resolved)
- Investigation doc status (you'll mark it "resolved" after PR merge)

**Exit criteria:** Your fix is working locally.

---

### Step 4: Test & Verify

**What you do:**
- Run tests locally
- Manually test the fix works
- Check for regressions
- Verify on multiple platforms (web, Android, iOS if applicable)

**Testing checklist:**
- [ ] Unit tests pass (if applicable)
- [ ] Integration tests pass (if applicable)
- [ ] Manual testing confirms fix works
- [ ] No new errors in console
- [ ] Original behavior still works for non-affected code
- [ ] Fix works on all platforms (web at minimum)

**If tests fail:**
- Go back to Step 3
- Fix the issue
- Re-test

**Exit criteria:** You're confident the fix works and doesn't break anything.

---

### Step 5: Update Documentation

**If you created an investigation doc in Step 2:**

1. **Fill in the investigation doc completely:**
   ```markdown
   ## Problem / Symptoms
   [Done in Step 1]

   ## Scope
   [Files involved, blast radius]

   ## Investigation Notes
   [Done in Step 2]

   ## Root Cause
   [Why it was broken]

   ## Fix
   [What you changed, why it fixes it]

   ## Verification Steps
   [What you tested in Step 4]

   ## Follow-ups / Backlog Candidates
   [Future improvements or related issues]

   ## Links
   - PR: [#123]
   - Commit: [abc1234]
   ```

2. **Update investigation status:**
   - Keep as `open` while you're working on PR
   - Change to `resolved` after PR is merged

**If it's a trivial fix (no investigation doc):**
- Just note it in the commit message

**Exit criteria:** Investigation doc (if needed) is complete and ready for PR.

---

### Step 6: Create PR & Get Review

**What you do:**
1. Push your branch
2. Create a PR
3. Fill out PR template completely
4. Use the checklist provided

**PR template reminders:**
- Fill "Summary" (1-3 bullets of what changed)
- Check "Type of Change"
- Fill "Documentation Changes" section:
  - If non-trivial: link the investigation doc
  - If trivial: note "no investigation needed"
- Provide "Test Plan" (how you tested)
- Add before/after screenshots if UI changed

**Documentation Changes Checklist (from PR template):**
- [ ] Investigation doc created (if non-trivial)
- [ ] Investigation includes required sections
- [ ] `docs/investigations/README.md` updated (if new investigation)
- [ ] Investigation status still `open` (will change to `resolved` after merge)

**Example PR description:**
```
## Summary
- Fixed black screen issue caused by font loading race condition
- Fonts now load synchronously before app renders

## Documentation Changes
- Investigation: docs/investigations/2026-01-19-black-screen-font.md
- Status: open (will update to resolved when merged)
```

**CI will check:**
- ✅ Investigation naming (YYYY-MM-DD-)
- ✅ Investigation headers (Status, Owner, Created, Last Updated)
- ✅ Investigation sections (Problem, Fix, Verification)
- ⚠️ Warnings (not blockers)

**Exit criteria:** PR is approved and you have permission to merge.

---

### Step 7: Merge & Compile to SHIPLOG

**What you do:**

1. **Merge the PR**
   - Use "Squash and merge" or "Create merge commit" (follow repo conventions)
   - Delete the branch

2. **Update investigation doc:**
   - Change status from `open` to `resolved`
   - Update `Last Updated` field
   - Add PR/commit link if not already there

3. **Create SHIPLOG entry:**
   - Add entry at top of `SHIPLOG.md`
   - Include:
     - Date
     - What was broken and what fixed it (1–3 bullets)
     - Verification (1 bullet)
     - Link to investigation doc + PR/commit

4. **Update investigations index:**
   - Move investigation from "Open" to "Resolved" table in `docs/investigations/README.md`

5. **Commit the documentation updates:**
   ```bash
   git add SHIPLOG.md docs/investigations/README.md
   git commit -m "docs: compile investigation 2026-01-19-black-screen-font into SHIPLOG"
   ```

**Example SHIPLOG entry:**
```markdown
## 2026-01-19 - Font Loading Race Condition (FIXED)

**Status:** ✅ FIXED

### Problem
App showed black screen on first load. Caused by race condition:
app rendered before font files loaded, making text invisible.

### Fix
Moved font loading to synchronous path in App.tsx.
Fonts now load before app mounts.

### Verification
- ✅ App renders with visible text on first load
- ✅ No console errors
- ✅ Tested on web and Android

**Investigation:** [docs/investigations/2026-01-19-black-screen-font.md](docs/investigations/2026-01-19-black-screen-font.md)
**PR:** #123
```

**Exit criteria:** Investigation is marked resolved, SHIPLOG is updated, all docs committed.

---

## Decision Tree: When to Create an Investigation

```
Is the fix non-trivial?
├─ YES (multiple files, non-obvious root cause, affects foundations)
│  └─ Create investigation in Step 2
│
└─ NO (single file, obvious cause, low risk)
   └─ Skip investigation doc, just update SHIPLOG in Step 7
```

**Foundations** = Navigation, Layout, Auth, Data Integrity, Build/Deploy, Performance, Security

---

## Troubleshooting: Common Scenarios

### Scenario: I started fixing but realized I need an investigation doc

**Solution:**
1. Create it now: `cp docs/templates/investigation.md docs/investigations/2026-01-19-slug.md`
2. Backfill investigation notes from what you've learned so far
3. Continue from Step 3

### Scenario: I fixed it, but there are follow-ups

**Solution:**
1. Don't try to fix everything in one PR
2. Document the follow-ups in "Follow-ups / Backlog Candidates" section
3. Create separate investigations or tickets for each

### Scenario: Same bug came back (regression)

**Solution:**
1. Check SHIPLOG.md for the original fix
2. Link new investigation to the old one in `Related` field
3. Copy the "Verification Steps" from the old investigation to prevent future regression

### Scenario: Investigation became too big / split into multiple fixes

**Solution:**
1. Mark original investigation as `superseded`
2. Add a note: "See [new-investigation.md](./new-investigation.md) instead"
3. Create new investigations for each sub-fix
4. Link them all together in `Related` fields

---

## Reference: Documents You'll Use

| When | Document | What |
|------|----------|------|
| **Before you start** | SHIPLOG.md | Check if fix already exists |
| **Before you start** | docs/investigations/README.md | Check if someone else is investigating |
| **During investigation** | docs/specs/ | Understand the architecture |
| **During investigation** | docs/reference/ | Reference materials |
| **During investigation** | docs/templates/investigation.md | Use as template |
| **During investigation** | docs/GOVERNANCE.md#shiplog--investigations-policy | Review policy |
| **During PR** | .github/pull_request_template.md | Fill out PR checklist |
| **After merge** | SHIPLOG.md | Add entry |
| **After merge** | docs/investigations/README.md | Update status |

---

## Key Principles

1. **Investigate before fixing** - Understand WHY, not just WHERE
2. **Document as you go** - Don't investigate and document later; do it together
3. **Trivial fixes don't need investigations** - But everything gets into SHIPLOG
4. **One fix per PR** - Don't combine unrelated fixes
5. **Preserve the trail** - Investigations stay forever (not deleted)
6. **SHIPLOG is canonical** - It's where people look first for "what changed"
7. **Compliance is automated** - CI checks remind you of policies, but doesn't block

---

## Quick Reference: File Paths

```
When you need...                     File path...
─────────────────────────────────────────────────────
Investigation template              docs/templates/investigation.md
Investigation for new fix           docs/investigations/2026-01-19-slug.md
Investigations index                docs/investigations/README.md
Governance policy details           docs/GOVERNANCE.md
PR checklist                        .github/pull_request_template.md
Canonical changelog                 SHIPLOG.md
Architecture/specs                  docs/specs/
Technical reference                 docs/reference/
Runbooks for other tasks            docs/runbooks/
```

---

## When in Doubt

1. **"Is this trivial?"** → Yes = skip investigation. No = create one.
2. **"What template do I use?"** → Check `docs/templates/`
3. **"Where does it go?"** → Check decision tree in `docs/README.md`
4. **"What's the policy?"** → Check `docs/GOVERNANCE.md`
5. **"How do I know if my fix worked?"** → Verification Steps section in investigation

**Remember:** This playbook is a guide, not a straitjacket. Use your judgment. When in doubt, ask in the PR review.
