# Technical Specification: [Feature Name]

**Status:** draft
**Owner:** [Your name or team]
**Last Updated:** [YYYY-MM-DD]
**Audience:** Engineering
**Related:** [Link to PRD, runbooks, related specs]

---

## Overview

[2-3 sentence summary of the technical approach]

## Architecture

[High-level design. Use ASCII diagrams if helpful.]

```
[Component A] --> [Component B] --> [Component C]
```

## Components

### Component 1: [Name]
**Responsibility:** [What it does]
**Location:** [File path or module]
**Dependencies:** [What it depends on]

### Component 2: [Name]
**Responsibility:** [What it does]
**Location:** [File path or module]
**Dependencies:** [What it depends on]

## Data Models

### Entity: [Name]
```typescript
interface ExampleEntity {
  id: string;
  createdAt: Date;
  // other fields...
}
```

## APIs / Interfaces

### Function: [name]
```typescript
function doSomething(param1: Type1): Type2
```
**Purpose:** [What it does]
**Parameters:** [Describe each]
**Returns:** [What it returns]
**Throws:** [Any exceptions]

## Edge Cases & Error Handling

- [ ] Edge case 1: [How handled]
- [ ] Edge case 2: [How handled]
- [ ] Error condition 1: [How handled]

## Performance Considerations

[Complexity analysis, caching strategy, optimization notes]

## Testing Strategy

- [ ] Unit tests: [Scope]
- [ ] Integration tests: [Scope]
- [ ] E2E tests: [Scope]

## Deployment & Rollback

[Any special deployment steps or rollback procedures]

## Known Limitations

- [ ] Limitation 1
- [ ] Limitation 2

## Future Work

[Features or improvements deferred for later]
