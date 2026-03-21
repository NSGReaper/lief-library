# Research: Eldritch Archer Combat Assistant

## Decision 1: Use Node.js backend only for ingestion and change events

- Decision: Backend reads Hero Lab portfolios, extracts authoritative character/buff payload,
  and streams file-change updates to connected clients; backend does not compute attacks.
- Rationale: This matches product constraints that calculations belong in the frontend while
  still enabling robust archive parsing and file-watch updates from local filesystem changes.
- Alternatives considered:
  - Full backend rules engine: rejected because it violates the frontend-calculation constraint.
  - Frontend-only file parsing via browser APIs: rejected because reliable file-watch updates
    for arbitrary local files are not available as a browser capability.

## Decision 2: Use Server-Sent Events (SSE) for backend-to-frontend updates

- Decision: Expose an SSE channel per active session for portfolio refresh events and parse
  status notifications.
- Rationale: Update traffic is one-way and event-oriented, so SSE keeps implementation simple,
  debuggable, and sufficient without WebSocket bidirectional complexity.
- Alternatives considered:
  - WebSockets: rejected as unnecessary complexity for one-way updates.
  - Polling endpoint: rejected due to delayed updates and avoidable repeated network traffic.

## Decision 3: Parse portfolio archive server-side with explicit XML source boundaries

- Decision: Parse zip archive entries and build canonical payload from `index.xml`, relevant
  XML statblock files, and `herolab/lead1.xml` for supported buff states.
- Rationale: Keeps parsing consistent with Hero Lab guidance and constitution requirements while
  avoiding dependence on text/html statblocks for behavior-affecting logic.
- Alternatives considered:
  - Using HTML or text statblocks for combat derivation: rejected due to instability and
    explicit source-of-truth constraints.
  - Parsing every portfolio artifact generically: rejected for MVP scope and complexity.

## Decision 4: Frontend calculations are declarative and composable

- Decision: Represent attack options as structured definitions plus effect applicators executed
  in deterministic order on a client-side calculation context.
- Rationale: Supports future option growth (including special cases like Spellstrike) without
  hard-coding logic into UI event handlers.
- Alternatives considered:
  - Ad hoc per-option conditionals in UI controllers: rejected due to poor extensibility.
  - Single monolithic calculator with baked-in switch logic: rejected due to maintenance risk.

## Decision 5: Persist only user-side transient state in localStorage

- Decision: Store UI preferences and temporary option overrides in browser localStorage; do not
  persist derived combat state on the server or to local files.
- Rationale: Meets user requirement for zero local file persistence while preserving quality-of-
  life state across browser refreshes.
- Alternatives considered:
  - Server-side file persistence: rejected by explicit requirement.
  - No persistence at all: rejected due to degraded UX for repeated table usage.

## Decision 6: Bootstrap + vanilla JavaScript frontend

- Decision: Build UI with Bootstrap components and custom vanilla JS modules for state,
  rendering, and calculations.
- Rationale: Aligns directly with user preference for minimal framework overhead while keeping
  layout and controls consistent.
- Alternatives considered:
  - React/Vue/Svelte SPA framework: rejected because framework complexity is unnecessary.
  - Pure custom CSS and no UI toolkit: rejected due to slower UI assembly and inconsistency.

## Decision 7: Test strategy emphasizes parser and calculation regressions

- Decision: Use fixture-driven backend parser tests, frontend calculation regression tests, and
  contract/integration tests for session load and update events.
- Rationale: The highest-risk regressions are incorrect derived attack output and stale state
  synchronization after file changes.
- Alternatives considered:
  - E2E-only testing: rejected because root-cause localization is poor and coverage expensive.
  - Unit-only testing: rejected because interface contracts and event flow also need validation.

## Decision 8: Spells.js whitelist for Spellstrike-eligible spells (Revision 2026-03-21)

- Decision: Create `spells.js` data file similar to `options.js` that whitelists which spells
  from the portfolio are eligible for Spellstrike and maps each to a function that generates
  a combat-focused description based on caster level.
- Rationale: Not all spells known to the character are relevant for Spellstrike combat scenarios.
  A whitelist allows tight control over which spells appear in selection UI, and description
  generator functions provide compact, combat-relevant text without trying to parse verbose
  portfolio spell descriptions.  
- Alternatives considered:
  - Show all memorized spells in Spellstrike selector: rejected because it clutters UI with
    non-combat or situational spells that are rarely used with Spellstrike.
  - Parse and display full spell descriptions from portfolio: rejected because portfolio spell
    text is verbose and not optimized for quick combat reference.

## Decision 9: Arcane pool displays cost only, not status (Revision 2026-03-21)

- Decision: Display only the total arcane point cost of currently selected options. Do not
  track or display spent/remaining arcane pool status in the application.
- Rationale: The user manages actual arcane pool usage in Hero Lab. The application's role is
  to show what the current attack plan will cost, not to duplicate Hero Lab's resource tracking.
- Alternatives considered:
  - Full arcane pool pip tracking system: rejected because it duplicates Hero Lab functionality
    and creates confusion about which system is the source of truth for pool status.