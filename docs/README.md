# TwoCups Documentation

Welcome to the TwoCups documentation. This directory contains all project documentation organized by category.

## Quick Links

- [Project README](../README.md) - Project overview and getting started
- [AGENTS.md](../AGENTS.md) - Agent workflow documentation
- [SHIPLOG.md](../SHIPLOG.md) - Changelog and release history

---

## Start Here

**New to our docs?** Start with these resources:

| Resource | Purpose |
|----------|---------|
| **[runbooks/fix-workflow.md](runbooks/fix-workflow.md)** | **🎯 The complete fix process** — Start here when fixing anything |
| [GOVERNANCE.md](GOVERNANCE.md) | **📋 Rules for adding/maintaining docs** — Read this if you're writing a new doc |
| [templates/](templates/) | **📝 Document templates** — Copy the right template for your doc type |
| Decision tree below | **🤔 Where do I put this?** — Quick guide to finding the right category |

---

## Where Do I Put This?

**Decision Tree (30 seconds):**

```
Is it a significant architectural decision?
├─ YES → docs/adr/
└─ NO  → Continue...

Is it a bug fix/debugging/investigation?
├─ YES → docs/investigations/
└─ NO  → Continue...

Is it describing how to do something?
├─ YES → docs/runbooks/
└─ NO  → Continue...

Is it a feature or product requirement?
├─ YES → docs/prd/
└─ NO  → Continue...

Is it technical design or architecture?
├─ YES → docs/specs/
└─ NO  → Continue...

Is it an audit or review?
├─ YES → docs/audits/
└─ NO  → docs/reference/
```

**Still not sure?** Read [GOVERNANCE.md](GOVERNANCE.md#how-to-add-a-new-doc-3-steps) for detailed guidance.

---

## Architectural Decision Records (ADRs)

Records of significant architectural decisions.

| Document | Description |
|----------|-------------|
| [0000-use-markdown-architectural-decision-records.md](adr/0000-use-markdown-architectural-decision-records.md) | Decision to use ADRs |

## PRDs & Feature Specs

Product requirements and feature specifications for planned or in-progress work.

| Document | Description |
|----------|-------------|
| [gem-economy.md](prd/gem-economy.md) | Gem economy system design (Figma-based PRD) |
| [firebase-setup.md](prd/firebase-setup.md) | Firebase iOS configuration and setup |
| [android-plan.md](prd/android-plan.md) | Android platform implementation plan |
| [claude-plan-storage.md](prd/claude-plan-storage.md) | Claude Code plan file storage strategy (draft) |

## Technical Specifications & Architecture

Detailed technical specifications for implemented features and system architecture.

| Document | Description |
|----------|-------------|
| [system-context.md](architecture/system-context.md) | System Context Diagram |
| [bottom-navbar.md](specs/bottom-navbar.md) | Bottom navigation bar specification |
| [gem-system.md](specs/gem-system.md) | Gem economy technical implementation |
| [design-principles.md](specs/design-principles.md) | UI/UX design principles and guidelines |
| [ui-layout.md](specs/ui-layout.md) | UI layout standards and patterns |

## Audit Reports

Code audits, reviews, and analysis reports.

| Document | Description |
|----------|-------------|
| [layout-audit.md](audits/layout-audit.md) | Layout system audit |
| [dom-audit.md](audits/dom-audit.md) | DOM structure audit report |
| [app-audit.md](audits/app-audit.md) | Full application audit report |
| [systemic-audit.md](audits/systemic-audit.md) | Systemic audit and refactor plan |

### Golden Screenshots

Reference screenshots for visual regression testing:

- [golden-history-tab.png](audits/screenshots/golden-history-tab.png)
- [golden-home-tab.png](audits/screenshots/golden-home-tab.png)

## Investigations

Bug fixes, debugging sessions, and audit trails. Each investigation captures problem → root cause → fix → verification.

**[Investigations Index](investigations/README.md)** - Browse open, resolved, and superseded investigations

**See:** [Shiplog + Investigations Policy](GOVERNANCE.md#shiplog--investigations-policy) for how investigations are documented and compiled into SHIPLOG.

## Runbooks

How-to guides and operational procedures.

| Document | Description |
|----------|-------------|
| **[fix-workflow.md](runbooks/fix-workflow.md)** | **🎯 START HERE: Meta-playbook for the entire fix process** |
| [firebase-hosting-deploy.md](runbooks/firebase-hosting-deploy.md) | Firebase Hosting deployment (CI/CD and manual) |
| [android-build.md](runbooks/android-build.md) | Android build instructions |
| [layout-cleanup.md](runbooks/layout-cleanup.md) | Systemic layout cleanup procedure |
| [dom-rollback.md](runbooks/dom-rollback.md) | DOM refactor rollback procedure |

## Reference

Reference materials and tracking documents.

| Document | Description |
|----------|-------------|
| [sacred-geometry.md](reference/sacred-geometry.md) | Sacred geometry symbol descriptions |
| [sacred-geometry.png](reference/sacred-geometry.png) | Sacred geometry reference image |
| [ui-debt.md](reference/ui-debt.md) | UI technical debt tracker |
| [fix-tracker.md](reference/fix-tracker.md) | Bug fix tracking document |

## Archive

Historical and completed documentation.

| Directory | Description |
|-----------|-------------|
| [archive/completed/](archive/) | Completed PRDs and feature specs |
| [archive/stale/](archive/) | Superseded debugging docs |

See [archive/README.md](archive/README.md) for full archive index.
