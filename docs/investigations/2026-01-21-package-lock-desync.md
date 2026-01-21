# Investigation: Package Lock Desynchronization in TwoCupsApp

**Status:** resolved
**Owner:** @jules
**Created:** 2026-01-21
**Last Updated:** 2026-01-21
**Related:** [TwoCupsApp/package.json](../../TwoCupsApp/package.json), [TwoCupsApp/package-lock.json](../../TwoCupsApp/package-lock.json)

---

## Problem / Symptoms

CI deployments to Firebase Hosting were failing during the `Install dependencies` step. The error message indicated that `npm ci` detected `package.json` and `package-lock.json` were out of sync. Specifically, it mentioned missing dependencies like `@types/node`, `undici-types`, and `ts-node`.

## Scope

The issue was primarily localized to `TwoCupsApp/`, but also affected the overall consistency of dependency management across the repository (`functions/` and `tests/` also had minor synchronization issues).

## Investigation Notes

- Used `grep` to examine `TwoCupsApp/package-lock.json` and found that `@types/node` was incorrectly listed with version `25.0.6`, while the latest stable version at the time was `22.x`.
- Observed that `ts-node` was missing from the lockfile despite being in `package.json`.
- Identified that running `npm install` in individual subdirectories without a coordinated root management strategy was leading to "relabeling" and versioning inconsistencies.
- Noted that `undici-types` was being pulled in as a dependency of `@types/node` but with mismatched versions across different parts of the lockfile.

## Root Cause

1.  **Manual Edits or Partial Installs**: The `package-lock.json` in `TwoCupsApp/` had become corrupted, likely due to manual edits or running `npm install` in a way that didn't correctly resolve peer dependencies or devDependencies.
2.  **Lack of Centralized Management**: There was no standard way to install dependencies across the entire project (App, Functions, Tests), leading to drift between the sub-packages.
3.  **Impossible Versioning**: `@types/node` version `25.0.6` was present in the lockfile, which is an invalid/non-existent future version, causing resolution errors.

## Fix

1.  **Lockfile Synchronization**: Ran `npm install` in `TwoCupsApp/`, `functions/`, and `tests/` to regenerate and synchronize all lock files with their respective `package.json` files.
2.  **Root Management Scripts**: Created a root-level `package.json` to provide unified management scripts:
    - `install:all`: Coordinated installation across all sub-projects.
    - `install:app`, `install:functions`, `install:tests`: Targeted installation for sub-projects.
    - `build:app`, `deploy:app`, `deploy:functions`: Centralized build and deploy commands.
3.  **Clean State**: Ensured `functions/lib` build artifacts were not staged to avoid source-of-truth conflicts.

## Verification Steps

1.  **Synchronicity Check**: Verified that `git status` no longer shows missing packages after `npm install`.
2.  **Typecheck**: Ran `npm run typecheck` in `TwoCupsApp/` to ensure `@types/node` and other type definitions are correctly resolved.
3.  **Build Verification**: Ran `npm run build:app` from the root to verify the new centralized build script works as expected.

## Follow-ups / Backlog Candidates

- [ ] Implement automated CI check to ensure lock files are always in sync with `package.json`.
- [ ] Migrate all sub-projects to a formal workspace solution (e.g., npm workspaces or Lerna) if the project continues to grow.

## Links

**PR:** [To be updated by user]
**Commit:** [To be updated by user]
