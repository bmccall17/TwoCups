# gem-system-audit.md

## Mission
Investigate and document **how the gem / cup / liquid economy works right now** in this codebase.

This is an **as-is audit** to establish ground truth before comparing to the economy design.

## Constraints
- Do **not** read or reference `gem-system.md`, `ECONOMY_GEMS.md`, or any economy specification docs while auditing.
- Do **not** suggest improvements or what the system *should* do.
- Only report what exists, what runs, and what persists.

## Deliverables
Provide BOTH outputs:

### A) gem-system-as-is-report.md
A narrative report (markdown) with citations to files/functions/lines where possible.

### B) gem-system-as-is-map.json
A machine-readable map that we can diff later. Keep it small and structured:
- gem_types (names you find in code)
- event_types (attempt, request, fulfill, acknowledge, etc. as implemented)
- state_fields (what fields represent state)
- point_values (if any)
- cup_models (personal/shared/collective if present)
- transformations (e.g., gem -> liquid, acknowledgments, aging)
- side_effects (notifications, streaks, achievements)
- invariants (hard rules enforced)

## Audit Method (do in this order)
1. **Locate economy code paths**
   - Search for keywords: `gem`, `gems`, `cup`, `cups`, `liquid`, `ack`, `acknowledge`, `request`, `fulfill`, `ledger`, `balance`, `points`, `overflow`, `streak`.
   - List the top 10 relevant files and what each one appears to do.

2. **Identify the source of truth**
   - Is the economy computed client-side, server-side (Cloud Functions), or both?
   - If Firestore is involved, list collections/doc shapes used by the economy.

3. **Document the data model (actual fields)**
   For each relevant document/entity, capture:
   - Collection path
   - Example fields (names + types)
   - What creates/updates it
   - Any indexes/security rules that affect it

4. **Map each user action to system effects**
   For each action that exists in the UI/API, document:
   - Trigger (button, form submit, background job, scheduled job)
   - Validation rules
   - Writes performed (where, what)
   - Reads performed (where, what)
   - Any computed values (points, totals, level, cup fill)

5. **Cup rendering logic**
   - Where does the UI get “cup fullness” from?
   - Is it stored as a value, derived from ledger entries, or approximated?
   - How are colors/layers determined (if applicable)?

6. **Edge cases & integrity checks (as implemented)**
   - Duplicate submissions / idempotency
   - Offline behavior
   - Race conditions (two acknowledgments, concurrent writes)
   - Anti-gaming limits (rate limits, caps)
   - Time-based logic (aging, decay, rollover, resets)

7. **Run one minimal end-to-end verification**
   Without changing product intent, execute the smallest set of actions you can to confirm reality:
   - Create a request (if feature exists)
   - Log an attempt (if feature exists)
   - Acknowledge (if feature exists)
   - Observe what changes in Firestore and in UI
   Capture what you observe and which code path caused it.

## Reporting Format (keep it factual)
In the report, use these headings:
- Overview
- Economy Entities
- Event Flow Table
- Persistence Model (Firestore / Functions / Local)
- Computation Model (where totals are calculated)
- UI Rendering Model (cups/visuals)
- Edge Cases & Guards
- Open Questions (only if truly unknown from code)

## Important: What NOT to do
- Do not mention or compare to the economy design doc.
- Do not recommend changes.
- Do not invent missing behaviors; if you can’t find it, say “Not found”.
