# Tasks: Eldritch Archer Combat Assistant

**Input**: Design documents from `/specs/001-eldritch-archer-webapp/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/portfolio-session-api.yaml`, `quickstart.md`

**Tests**: Include automated tests for parsing, calculations, contracts, and integration flows.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize backend/frontend/shared/testing structure and tooling for a split web app.

- [ ] T001 Create backend project scaffold and npm scripts in `backend/package.json`
- [ ] T002 [P] Create frontend project scaffold and npm scripts in `frontend/package.json`
- [ ] T003 [P] Add shared contract workspace path config in `shared/contracts/.gitkeep`
- [ ] T004 [P] Configure backend test runner and fixtures glob in `backend/vitest.config.js`
- [ ] T005 [P] Configure frontend test runner and jsdom setup in `frontend/vitest.config.js`
- [ ] T006 Create end-to-end and integration test package scripts in `tests/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core boundaries and shared models that block all user stories until complete.

**Critical boundary**: Backend is ingestion/watch only; frontend performs all combat calculations.

- [ ] T007 Implement backend HTTP bootstrap and route registration in `backend/src/server.js`
- [ ] T008 [P] Implement canonical session store with in-memory lifecycle only in `backend/src/services/session-store/sessionStore.js`
- [ ] T009 [P] Implement portfolio file watcher service using chokidar in `backend/src/services/watcher/portfolioWatcher.js`
- [ ] T010 [P] Implement shared session payload schema for backend/frontend alignment in `shared/contracts/sessionPayloadSchema.js`
- [ ] T011 [P] Implement frontend application state container for session + options in `frontend/src/state/appState.js`
- [ ] T012 [P] Implement frontend localStorage adapter scoped by portfolio path key in `frontend/src/storage/portfolioScopedStorage.js`
- [ ] T013 Define data-driven attack option type and validation helpers in `frontend/src/options/optionDefinitionModel.js`
- [ ] T014 Add contract regression test proving no combat-calculation API surface in `backend/tests/contract/no-calculation-endpoints.contract.test.js`

**Checkpoint**: Foundation complete. User story work can start.

---

## Phase 3: User Story 1 - Load Character Combat Data (Priority: P1) 🎯 MVP

**Goal**: Load supported portfolio data and render trustworthy baseline ranged full-attack information.

**Independent Test**: Create a session from a valid portfolio path and verify baseline character/weapon/attack data plus buff-derived defaults appear without manual overrides.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add parser fixture coverage for valid and invalid index/statblock cases in `backend/tests/fixtures/portfolio-load.fixtures.json`
- [ ] T016 [P] [US1] Add parser test for hard error when `characterindex="1"` supported PC cannot be resolved in `backend/tests/integration/character-resolution.integration.test.js`
- [ ] T017 [P] [US1] Add parser test that unknown `herolab/lead1.xml` buffs are ignored in `backend/tests/integration/unknown-buffs-ignored.integration.test.js`
- [ ] T018 [P] [US1] Add session API contract test for create/get/delete session behavior in `backend/tests/contract/portfolio-session-api.contract.test.js`
- [ ] T019 [P] [US1] Add frontend integration test for baseline load rendering from canonical payload in `frontend/tests/integration/baseline-load.integration.test.js`

### Implementation for User Story 1

- [ ] T020 [P] [US1] Implement `index.xml` parser for top-level PC selection rules in `backend/src/parsers/index-parser/parseIndexXml.js`
- [ ] T021 [P] [US1] Implement XML statblock parser for primary ranged weapon fields (`equipped="mainhand"`) in `backend/src/parsers/statblock-parser/parseRangedWeapon.js`
- [ ] T022 [P] [US1] Implement buff parser for supported buff extraction from `herolab/lead1.xml` in `backend/src/parsers/buff-parser/parseSupportedBuffs.js`
- [ ] T023 [US1] Implement portfolio loader orchestration (zip read + canonical payload assembly) in `backend/src/services/portfolio-loader/loadPortfolioSession.js`
- [ ] T024 [US1] Implement session routes (`POST/GET/DELETE /api/sessions`) with hard-error mapping for unsupported character in `backend/src/api/routes/sessions.js`
- [ ] T025 [US1] Implement baseline character and full-attack card rendering from backend payload in `frontend/src/views/fullAttackCardView.js`
- [ ] T026 [US1] Implement frontend API client for session lifecycle calls in `frontend/src/services/sessionApiClient.js`
- [ ] T027 [US1] Implement frontend bootstrap flow and missing-data error banner handling in `frontend/src/app/bootstrapSession.js`

**Checkpoint**: US1 is independently functional as MVP.

---

## Phase 4: User Story 2 - Adjust Attack Options (Priority: P2)

**Goal**: Let players toggle supported attack options and see deterministic recalculation, including Spellstrike spell selection.

**Independent Test**: Starting from loaded character data, toggle options and Spellstrike spell selection; verify deterministic full-attack recalculation and correct state reconciliation after file reload.

### Tests for User Story 2

- [ ] T028 [P] [US2] Add frontend unit tests for data-driven option definitions covering initial in-scope options in `frontend/tests/unit/option-definitions.unit.test.js`
- [ ] T029 [P] [US2] Add frontend calculation regression test for combined option stacking order in `frontend/tests/unit/full-attack-calculator.unit.test.js`
- [ ] T030 [P] [US2] Add frontend integration test for Spellstrike spell selection using separate spell definitions in `frontend/tests/integration/spellstrike-selection.integration.test.js`
- [ ] T031 [P] [US2] Add frontend integration test for reload reconciliation resetting only buff-aligned toggles whose buff state changed in `frontend/tests/integration/reload-buff-reconciliation.integration.test.js`
- [ ] T032 [P] [US2] Add frontend integration test ensuring non-toggle modifiers are not rendered as selectable options in `frontend/tests/integration/options-visibility.integration.test.js`
- [ ] T033 [P] [US2] Add backend/frontend SSE integration test for file-watch refresh event propagation in `tests/integration/session-events.integration.test.js`

### Implementation for User Story 2

- [ ] T034 [P] [US2] Implement attack option definitions (Spell Combat, Spellstrike, Arcane Accuracy, Haste, Deadly Aim, Rapid Shot) in `frontend/src/options/attackOptionDefinitions.js`
- [ ] T035 [P] [US2] Implement dedicated Spellstrike spell definitions separate from option definitions in `frontend/src/options/spellDefinitions.js`
- [ ] T036 [P] [US2] Implement deterministic full-attack calculation engine in frontend only in `frontend/src/calculations/fullAttackCalculator.js`
- [ ] T037 [P] [US2] Implement option effect applicators and priority ordering in `frontend/src/calculations/optionEffectPipeline.js`
- [ ] T038 [US2] Implement options state reducer tracking `enabledSource` (default-buff vs user-toggle) in `frontend/src/state/optionStateReducer.js`
- [ ] T039 [US2] Implement SSE client subscription and session refresh handling in `frontend/src/services/sessionEventsClient.js`
- [ ] T040 [US2] Implement file-change reconciliation logic that only resets toggles for changed buff states in `frontend/src/state/reconcileOnReload.js`
- [ ] T041 [US2] Implement options panel rendering to show only toggleable options and separate Spellstrike spell picker UI in `frontend/src/views/optionsPanelView.js`
- [ ] T042 [US2] Wire watcher-triggered session reload events in backend SSE route in `backend/src/api/sse/sessionEvents.js`

**Checkpoint**: US2 is independently functional with deterministic toggles and reload behavior.

---

## Phase 5: User Story 3 - Track Round Cost and Decision Support (Priority: P3)

**Goal**: Show current-round arcane point total from enabled options with relevant costs only.

**Independent Test**: Enable mixed-cost options and confirm only per-round/single-use relevant options contribute to total.

### Tests for User Story 3

- [ ] T043 [P] [US3] Add unit tests for arcane point inclusion/exclusion rules in `frontend/tests/unit/arcane-point-summary.unit.test.js`
- [ ] T044 [P] [US3] Add integration test for arcane point summary updates on option toggles in `frontend/tests/integration/arcane-point-summary.integration.test.js`

### Implementation for User Story 3

- [ ] T045 [P] [US3] Implement arcane point aggregation logic from enabled options in `frontend/src/calculations/arcanePointCalculator.js`
- [ ] T046 [US3] Implement arcane point summary widget rendering and empty-state text in `frontend/src/views/arcanePointSummaryView.js`
- [ ] T047 [US3] Integrate arcane point summary into main app update cycle in `frontend/src/app/renderCycle.js`

**Checkpoint**: US3 independently delivers round-cost decision support.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish quality, documentation, and end-to-end confidence across stories.

- [ ] T048 [P] Add Playwright scenario for full MVP flow (load, toggle, reload, verify) in `tests/e2e/mvp-flow.spec.ts`
- [ ] T049 [P] Add quickstart verification script for local run/test steps in `tests/scripts/verify-quickstart.ps1`
- [ ] T050 Update quickstart with final commands and validation notes in `specs/001-eldritch-archer-webapp/quickstart.md`
- [ ] T051 Add shared troubleshooting notes for hard errors and unsupported data in `docs/Requirements.md`
- [ ] T052 Run full automated validation and capture outputs in `tests/reports/tasks-validation.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- US1 (Phase 3) depends on Foundational completion.
- US2 (Phase 4) depends on Foundational and integrates US1 payload contracts.
- US3 (Phase 5) depends on US2 option state and calculation pipeline.
- Polish (Phase 6) depends on all implemented stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; provides MVP.
- **US2 (P2)**: Starts after Foundational; requires US1 session payload shape.
- **US3 (P3)**: Starts after US2 calculation/option infrastructure.

### Dependency Graph

- `US1 -> US2 -> US3`

---

## Parallel Opportunities

- Phase 1: `T002`, `T003`, `T004`, `T005` can run in parallel after `T001` starts.
- Phase 2: `T008`, `T009`, `T010`, `T011`, `T012` can run in parallel after `T007`.
- US1 tests: `T015` to `T019` can run in parallel.
- US1 parser modules: `T020`, `T021`, `T022` can run in parallel before orchestration `T023`.
- US2 tests: `T028` to `T033` can run in parallel.
- US2 frontend logic: `T034`, `T035`, `T036`, `T037` can run in parallel before state/view integration tasks.
- US3 tests: `T043`, `T044` can run in parallel.
- Polish: `T048`, `T049` can run in parallel.

## Parallel Example: User Story 2

```bash
# Parallel test implementation
Task: T028 frontend/tests/unit/option-definitions.unit.test.js
Task: T029 frontend/tests/unit/full-attack-calculator.unit.test.js
Task: T030 frontend/tests/integration/spellstrike-selection.integration.test.js

# Parallel core implementation
Task: T034 frontend/src/options/attackOptionDefinitions.js
Task: T035 frontend/src/options/spellDefinitions.js
Task: T036 frontend/src/calculations/fullAttackCalculator.js
Task: T037 frontend/src/calculations/optionEffectPipeline.js
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1) and validate independent test.
4. Demo/deploy MVP before moving to US2.

### Incremental Delivery

1. Deliver US1 baseline load and trustable combat snapshot.
2. Deliver US2 toggleable option calculations and reload synchronization.
3. Deliver US3 arcane point decision support.
4. Finish with cross-cutting quality and docs in Phase 6.

### Validation Requirement

- Behavior-changing logic is complete only when related parser, calculation, contract, and integration tests pass.
