# Contributing to Two Cups

Thank you for your interest in contributing to Two Cups!

## Getting Started

1.  **Dependencies**: Ensure you have Node.js installed.
2.  **Setup**:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npx expo start
    ```

## Issue Tracking

We use **Beads** (`bd`) for issue tracking. It lives directly in the repository.

*   **List issues**: `bd list`
*   **View issue**: `bd show <id>`
*   **Create issue**: `bd create "Title of issue"`

See `.beads/README.md` for more details.

## Development Workflow

### Git Workflow

*   **Commits**: We generally allow the user (or maintainer) to handle commits. As an AI agent, you should only **stage** files using `git add`.
*   **Branching**: Work on feature branches.

### Code Standards

*   **Typography**: Always use the `<AppText>` component from `src/components/common/AppText.tsx`. Do not use raw `<Text>` components.
*   **Layout**: Use the layout primitives `Screen`, `Stack`, and `Row` from `src/components/common`. Avoid deeply nested `View`s.
*   **Linting**: Run `npm run lint` to check for style issues.

## Testing

*   **Run Tests**: `npm test` (if available) or check `tests/` directory.
*   **Manual Testing**: Verify changes on Web (`w` in Expo), iOS (`i`), and Android (`a`).

## Documentation

*   **ADRs**: Architectural decisions should be recorded in `docs/adr/`. See `docs/adr/0001-codebase-patterns-from-ralph.md` for established codebase patterns.
*   **Diagrams**: System diagrams go in `docs/architecture/`.
*   **Specs**: Technical specs go in `docs/specs/`.
