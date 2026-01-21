# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Git Workflow

**Claude should only STAGE files, not commit or push.**

The user will commit and push manually via GitHub Desktop.

**Claude's git workflow:**
```bash
git add <files>           # Stage changes - Claude does this
# STOP HERE - user commits and pushes via GitHub Desktop
```

**DO NOT:**
- Run `git commit`
- Run `git push`
- Configure git credentials

**DO:**
- Stage files with `git add`
- Tell the user what files were staged
- Summarize the changes for the commit message

## Landing the Plane (Session Completion)

**When ending a work session**, complete these steps:

1. **Stage all changed files** - `git add` relevant files
2. **Summarize changes** - Provide a commit message summary for the user
3. **File issues for remaining work** - Create issues for anything that needs follow-up
4. **Update issue status** - Close finished work, update in-progress items
5. **Hand off** - Provide context for next session

The user will commit and push via GitHub Desktop.

Use 'bd' for task tracking
