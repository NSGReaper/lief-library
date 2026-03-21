# Tasks: Eldritch Archer Combat Assistant

**Input**: Design documents from `/specs/001-eldritch-archer-webapp/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/portfolio-session-api.yaml`, `quickstart.md`

**Tests**: Include automated tests for parsing, calculations, and user-visible option state changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Current Structure Note**: Project uses `src/` for backend and `public/` for frontend (not the backend/frontend split shown in plan.md).

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, test infrastructure, and fixture setup

- [ ] T001 Create test directory structure: `tests/backend/`, `tests/frontend/`, `tests/fixtures/`
- [ ] T002 Install testing dependencies: Vitest, Supertest, Playwright per plan.md
- [ ] T003 [P] Copy sample portfolios to `tests/fixtures/portfolios/` (Lief lvl 8, Vasiel)
- [ ] T004 [P] Create expected output fixtures in `tests/fixtures/expected/` for baseline attacks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend parsing and frontend architecture that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Parser Foundation

- [ ] T005 Create portfolio loader service in `src/services/portfolio-loader.js` for `.por` zip reading
- [ ] T006 [P] Implement index.xml parser in `src/parsers/index-parser.js` to extract character identity and statblock references
- [ ] T007 [P] Implement XML statblock parser in `src/parsers/statblock-parser.js` for ranged weapon and attack data
- [ ] T008 [P] Implement buff parser in `src/parsers/buff-parser.js` for `herolab/lead1.xml` active buff detection
- [ ] T009 Create canonical payload builder in `src/services/character-extractor.js` that combines parser outputs
- [ ] T010 Add parser tests in `tests/backend/parsers/` using fixture portfolios

### Backend Session & API

- [ ] T011 Create session store service in `src/services/session-store.js` for in-memory session management
- [ ] T012 Create file watcher service in `src/services/watcher.js` using chokidar for portfolio change detection
- [ ] T013 Implement SSE endpoint in `src/api/sse.js` for portfolio update events
- [ ] T014 Implement session API routes in `src/api/routes/session.js` (POST /session, GET /session/:id)
- [ ] T015 Update `src/server.js` to wire up session routes and SSE endpoints
- [ ] T016 Add session API contract tests in `tests/backend/api/` using Supertest

### Frontend Architecture Foundation

- [ ] T017 Create state management module in `public/js/state.js` for centralized state and localStorage persistence
- [ ] T018 Create calculation engine module in `public/js/calculations.js` for attack sequence generation
- [ ] T019 Create options registry structure in `public/js/options.js` with initial empty option definitions
- [ ] T020 Create spells registry structure in `public/js/spells.js` with whitelisting and description generators
- [ ] T021 Create API client module in `public/js/api-client.js` for backend session and SSE communication
- [ ] T022 Add frontend calculation regression tests in `tests/frontend/calculations.test.js`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Load Character Combat Data (Priority: P1) 🎯 MVP

**Goal**: Load Hero Lab portfolio and display character identity, base ranged weapon, active buff defaults, and baseline full-attack sequence

**Independent Test**: Load supported portfolio, verify character name, weapon details, baseline attacks, and default-enabled options match expected fixture outputs

### Implementation for User Story 1

- [ ] T023 [P] [US1] Implement character identity display in `public/index.html` (character name section)
- [ ] T024 [P] [US1] Implement weapon details card in `public/index.html` (weapon stats section)
- [ ] T025 [P] [US1] Implement baseline attack display in `public/index.html` (full-attack card section)
- [ ] T026 [US1] Create session initialization flow in `public/js/app.js` (portfolio path input, session creation)
- [ ] T027 [US1] Implement SSE connection handler in `public/js/app.js` for portfolio reload events
- [ ] T028 [US1] Implement baseline attack calculation in `public/js/calculations.js` (iterative attack generation)
- [ ] T029 [US1] Wire character data rendering in `public/js/app.js` (character, weapon, baseline attacks)
- [ ] T030 [US1] Implement error state handling in `public/js/app.js` for missing/invalid portfolio data
- [ ] T031 [US1] Add localStorage scoping per portfolio path in `public/js/state.js`
- [ ] T032 [US1] Add validation messages for missing required combat data

**Checkpoint**: User Story 1 should be fully functional - load portfolio and see baseline character combat data

---

## Phase 4: User Story 2 - Adjust Attack Options (Priority: P2)

**Goal**: Toggle attack options and immediately see recalculated full-attack output, including Spellstrike with spell selection

**Independent Test**: Load character, toggle options (Spell Combat, Deadly Aim, Rapid Shot, Spellstrike), verify full-attack card updates attack count, bonuses, and damage correctly

### Option Definitions

- [ ] T033 [P] [US2] Define Spell Combat option in `public/js/options.js` (-2 hit, enables spellcasting)
- [ ] T034 [P] [US2] Define Spellstrike option in `public/js/options.js` (marks option as spell delivery)
- [ ] T035 [P] [US2] Define Arcane Accuracy option in `public/js/options.js` (INT bonus to hit, 1 arcane point)
- [ ] T036 [P] [US2] Define Haste option in `public/js/options.js` (extra attack at highest BAB)
- [ ] T037 [P] [US2] Define Deadly Aim option in `public/js/options.js` (-3 hit, +6 damage)
- [ ] T038 [P] [US2] Define Rapid Shot option in `public/js/options.js` (-2 hit, extra attack)
- [ ] T039 [P] [US2] Define Manyshot option in `public/js/options.js` (double damage first attack)

### Spell Definitions

- [ ] T040 [P] [US2] Create spell whitelist structure in `public/js/spells.js` (whitelisted spells only)
- [ ] T041 [P] [US2] Add Shocking Grasp to `public/js/spells.js` with caster-level-based description generator
- [ ] T042 [P] [US2] Add Frostbite to `public/js/spells.js` with caster-level-based description generator
- [ ] T043 [P] [US2] Add Arcane Mark placeholder to `public/js/spells.js` (for testing non-combat spell filtering)

### Attack Calculation Engine

- [ ] T044 [US2] Implement option effect accumulation in `public/js/calculations.js` (hit/damage bonuses)
- [ ] T045 [US2] Implement extra attack injection in `public/js/calculations.js` (Rapid Shot, Haste)
- [ ] T046 [US2] Implement Spellstrike attack marking in `public/js/calculations.js` (first attack becomes spell delivery)
- [ ] T047 [US2] Implement clean base calculation in `public/js/calculations.js` (subtract default-enabled effects)
- [ ] T048 [US2] Implement deterministic option ordering in `public/js/calculations.js` (consistent resolution)
- [ ] T049 [US2] Add calculation regression tests in `tests/frontend/calculations.test.js` for option stacking

### UI Implementation

- [ ] T050 [US2] Implement option toggle chips in `public/index.html` (per-attack, swift-buff, conditional categories)
- [ ] T051 [US2] Implement spell selector panel in `public/index.html` (spell list with search/filter)
- [ ] T052 [US2] Implement spell selection state in `public/js/state.js` (selectedSpell tracking)
- [ ] T053 [US2] Wire option toggle handlers in `public/js/app.js` (enable/disable, recalculate, re-render)
- [ ] T054 [US2] Wire spell selector handlers in `public/js/app.js` (open selector, select spell, close)
- [ ] T055 [US2] Implement spell selector auto-hide when Spellstrike unchecked in `public/js/app.js`
- [ ] T056 [US2] Implement spell change capability in `public/js/app.js` (click spell banner to re-open selector)
- [ ] T057 [US2] Implement spell banner display in `public/js/app.js` (show selected spell below Spellstrike attack)
- [ ] T058 [US2] Implement prompt to select spell in `public/js/app.js` when Spellstrike enabled but no spell selected
- [ ] T059 [US2] Add default-enabled option marking in `public/js/app.js` (buff-derived vs user-toggle)
- [ ] T060 [US2] Implement full-attack card re-render in `public/js/app.js` on option change
- [ ] T061 [US2] Add buff-aligned option reset on portfolio reload in `public/js/app.js` (only changed buffs)

**Checkpoint**: User Stories 1 AND 2 should work independently - options toggle and attacks recalculate correctly

---

## Phase 5: User Story 3 - Track Round Cost (Priority: P3)

**Goal**: Display total arcane point cost of currently enabled options (cost only, NOT pool status tracking)

**Independent Test**: Enable Arcane Accuracy (1 point), verify cost display shows "1 point committed this round". Enable multiple costly options, verify sum. Disable all, verify cost display hides.

### Implementation for User Story 3

- [ ] T062 [US3] Implement arcane cost calculation in `public/js/calculations.js` (sum enabled option costs)
- [ ] T063 [US3] Remove arcane pool status tracking from `public/js/state.js` (delete arcanePoolSpent, arcanePoolLeft)
- [ ] T064 [US3] Simplify arcane display in `public/index.html` (show cost total only, remove pip UI)
- [ ] T065 [US3] Update arcane cost display rendering in `public/js/app.js` (show/hide based on cost > 0)
- [ ] T066 [US3] Add arcane cost badge to option chips in `public/js/app.js` (show cost on toggle chips)
- [ ] T067 [US3] Remove pool management handlers from `public/js/app.js` (delete pip click handlers)
- [ ] T068 [US3] Update state persistence in `public/js/state.js` (remove pool tracking from localStorage)

**Checkpoint**: All user stories should now be independently functional - cost display shows option costs only

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refinements that affect multiple user stories and final validation

- [ ] T069 [P] Update quickstart.md validation steps for spell selection and arcane cost
- [ ] T070 [P] Add end-to-end tests in `tests/e2e/` using Playwright for critical flows
- [ ] T071 [P] Add missing unit tests for edge cases in `tests/frontend/` and `tests/backend/`
- [ ] T072 Refactor shared utility functions in `public/js/utils.js` (formatBonus, parseDamageBonus, etc.)
- [ ] T073 Add JSDoc comments to public API functions in all `public/js/` modules
- [ ] T074 Optimize UI re-render performance in `public/js/app.js` (batch updates, minimize DOM access)
- [ ] T075 Add error boundary and fallback UI for invalid character data
- [ ] T076 Validate against sample portfolios per quickstart.md workflow
- [ ] T077 Final code review and cleanup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - Can then proceed in parallel (if staffed) or sequentially in priority order
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 (Foundational) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on Phase 2 (Foundational) - Independent of US1 but integrates naturally
- **User Story 3 (P3)**: Depends on Phase 2 (Foundational) - Independent of US1/US2 but integrates naturally

### Within Each User Story

- Option/spell definitions can run in parallel (different entries in same file)
- Calculation engine before UI rendering
- UI structure before event handlers
- Core implementation before integration tests

### Parallel Opportunities Per Phase

**Phase 1 (Setup)**: T003 and T004 can run in parallel

**Phase 2 (Foundational)**:
- Parser group: T006, T007, T008 can run in parallel (different parser files)
- Frontend architecture: T017, T018, T019, T020, T021 can run in parallel (different modules)

**Phase 3 (US1)**: T023, T024, T025 can run in parallel (different HTML sections)

**Phase 4 (US2)**:
- Option definitions: T033-T039 can run in parallel (different options in same file)
- Spell definitions: T040-T043 can run in parallel (entries in same file)

**Phase 5 (US3)**: T062, T063 can run in parallel (different modules)

**Phase 6 (Polish)**: T069, T070, T071 can run in parallel (different test files)

---

## Parallel Example: User Story 2 Options

```bash
# Launch all option definitions together:
Task T033: "Define Spell Combat option in public/js/options.js"
Task T034: "Define Spellstrike option in public/js/options.js"
Task T035: "Define Arcane Accuracy option in public/js/options.js"
Task T036: "Define Haste option in public/js/options.js"
Task T037: "Define Deadly Aim option in public/js/options.js"
Task T038: "Define Rapid Shot option in public/js/options.js"
Task T039: "Define Manyshot option in public/js/options.js"

# Launch all spell definitions together:
Task T040: "Create spell whitelist structure in public/js/spells.js"
Task T041: "Add Shocking Grasp to public/js/spells.js"
Task T042: "Add Frostbite to public/js/spells.js"
Task T043: "Add Arcane Mark placeholder to public/js/spells.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (fixtures and test infrastructure)
2. Complete Phase 2: Foundational (parsers, session, frontend architecture) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (load and display character baseline)
4. **STOP and VALIDATE**: Test portfolio loading independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready ✅
2. Add User Story 1 → Test independently → **Deploy MVP** 🎯
3. Add User Story 2 → Test independently → Deploy enhanced version
4. Add User Story 3 → Test independently → Deploy complete version
5. Polish → Final validation and optimization

### Parallel Team Strategy

With multiple developers:

1. **Together**: Complete Setup + Foundational
2. **Once Foundational done**:
   - Developer A: User Story 1 (T023-T032)
   - Developer B: User Story 2 Option Definitions (T033-T043)
   - Developer C: User Story 2 Calculation Engine (T044-T049)
3. **Stories integrate independently through declared extension points**

---

## Notes

- **[P] tasks** = Can run in parallel (different files or independent sections)
- **[Story] label** = Maps task to specific user story for traceability
- **Revised requirements incorporated**: Spell selector auto-hide, spells.js whitelist, arcane cost-only (no status tracking), spell change capability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Current structure uses `src/` (backend) and `public/` (frontend), not the `backend/` and `frontend/` split mentioned in plan.md
