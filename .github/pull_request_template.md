## Summary

<!-- Brief description of changes (1-3 bullet points) -->

-

## Documentation Changes

- [ ] This PR changes behavior (feature/bug fix/API change) **AND** updates at least one doc **OR** includes comment "no doc change needed"
- [ ] If I added/changed a doc:
  - [ ] Doc lives under `/docs` in the right category
  - [ ] Doc has Status/Owner/Last Updated header block
  - [ ] File naming follows conventions (lowercase-with-hyphens.md)
  - [ ] `docs/README.md` TOC is updated (if new doc)
  - [ ] If replacing a doc, old doc marked deprecated and moved to `docs/archive/`

**See [docs/GOVERNANCE.md](../docs/GOVERNANCE.md) for details.**

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Enhancement to existing feature
- [ ] Refactoring / cleanup
- [ ] Documentation

## UI Changes Checklist

If this PR includes UI changes, please verify:

### Layout & Structure
- [ ] Uses `<Screen>` wrapper (not raw SafeAreaView)
- [ ] Uses `<Stack>` / `<Row>` for layout (not nested Views for spacing)
- [ ] Uses `<AppText>` for all text (not raw `<Text>`)
- [ ] DOM depth is reasonable (no unnecessary wrapper Views)

### Cross-Platform Verification
- [ ] Tested on web (desktop viewport)
- [ ] Tested on web (mobile viewport / responsive)
- [ ] Tested on Android emulator or device
- [ ] Tested on iOS simulator or device (if applicable)

### Interaction & Scroll
- [ ] All tap targets are accessible (not hidden by navbar)
- [ ] Scroll behavior works correctly
- [ ] Keyboard behavior works for forms (if applicable)
- [ ] Pull-to-refresh works (if applicable)

### Screenshots

<!-- Before/after screenshots for visual changes -->

| Before | After |
|--------|-------|
|        |       |

## Test Plan

<!-- How was this tested? -->

-

---
Generated with Claude Code
