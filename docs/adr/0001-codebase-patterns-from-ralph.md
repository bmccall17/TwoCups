# 0001. Codebase Patterns from Ralph Progress Log

Date: 2026-01-22

## Status

Accepted

## Context

We previously used an automated agent named Ralph which maintained a "Codebase Patterns" log in `scripts/ralph/progress.txt`. Since we are migrating to a formal ADR log, we want to preserve these patterns as architectural decisions or guidelines.

## Decision

The following patterns, originally identified by Ralph, are adopted as architectural guidelines for this project:

### Firebase & Data
*   **SDK**: Use the Firebase JS SDK (not `@react-native-firebase`) to ensure web compatibility.
*   **Auth**: User documents are not auto-created on anonymous auth; they must be created manually in `AuthContext`.
*   **Atomic Operations**: Use `writeBatch()` for multi-document operations to ensure atomicity.
*   **Security Rules**: Firestore security rules require a `createdAt` field on user documents.
*   **Pagination**: Use `getDocs` with `startAfter` and `limit` for History-style screens (pagination), rather than `onSnapshot` (real-time).
*   **Infinite Scroll**: Implement infinite scroll using `FlatList` with `onEndReached`.
*   **Offline Support**:
    *   Enable Firestore persistence via `initializeFirestore` with `persistentLocalCache`.
    *   Use `{ includeMetadataChanges: true }` in `onSnapshot` to track pending writes.
*   **IDs**: Use `userData?.activeCoupleId` for the couple ID (note: `coupleData?.id` might not exist on the type).

### React & Performance
*   **Memoization**:
    *   Use `React.memo()` for components that receive stable props (e.g., `CupVisualization`, `GemCounter`).
    *   Use `useMemo()` for derived values to prevent unnecessary re-renders.
*   **Listeners**: Always clean up **ALL** Firestore `onSnapshot` listeners in `useEffect` return functions.
*   **Error Boundaries**: `ErrorBoundary` must be a class component (React requirement).
*   **List Rendering**: Use `FlatList` with performance props (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews`) for lists. Extract list items to memoized components.

### UI/UX
*   **Error Handling**: Use the `ErrorState` component for screen-level Firestore errors. Auto-detect error types (network, permission, generic).
*   **Refresh Control**: Use `RefreshControl` with `tintColor` (iOS) and `colors` array (Android) for consistent styling.
*   **Animations**: Use `GemAnimationContext`'s `showGemAnimation(amount, x?, y?)` to trigger gem earned animations globally.

## Consequences

*   These patterns provide a standard for future development.
*   New code should adhere to these patterns unless a new ADR supersedes them.
*   The `scripts/ralph/progress.txt` file is now considered historical/legacy regarding these patterns.
