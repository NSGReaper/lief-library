# Feature Specification: Eldritch Archer Combat Assistant

**Feature Branch**: `[001-eldritch-archer-webapp]`  
**Created**: 2026-03-21  
**Status**: Draft  
**Input**: User description: "Build a web application that can help me play my Eldritch Archer Magus character when playing Pathfinder. Additional requirements can be found in docs/Requirements.md"

## Clarifications

### Session 2026-03-21

- Q: How should the main weapon be selected when multiple weapons exist? -> A: Use the weapon with `equipped="mainhand"`.
- Q: Should options be fixed or data-driven, and which options are in initial scope? -> A: Options are data-driven via a structured definition model; initial supported options are Spell Combat, Spellstrike, Arcane Accuracy, Haste, Deadly Aim, and Rapid Shot.
- Q: How should unknown buffs in `lead1.xml` be handled? -> A: Ignore unrecognized buffs.
- Q: Should Spellstrike include spell selection? -> A: Yes, include spell selection and define spells separately from regular attack options.
- Q: How should option toggles react when the watched portfolio file changes? -> A: For buff-aligned options, revert toggle state to match portfolio only when that buff's state changed since the previous load.
- Q: How should local browser state be scoped? -> A: Store and restore state per portfolio path.
- Q: What should happen if `characterindex="1"` and a supported PC role are not found? -> A: Fail with a hard error.
- Q: Which modifiers should be displayed in option/modifier UI areas? -> A: Display only modifiers that correspond to attack options the player can toggle.

### Session 2026-03-21 (Revision after initial implementation)

- Q: How should spell selection UI behave relative to Spellstrike toggle? -> A: Spell selection should automatically hide when Spellstrike is unchecked.
- Q: Should the system track arcane pool status (spent/remaining)? -> A: No. Only track and display the total arcane point cost of currently selected options. The user tracks actual pool usage in Hero Lab.
- Q: How should spells be filtered and described for Spellstrike? -> A: Use a `spells.js` whitelist similar to `options.js`. This file whitelists which spells are Spellstrike-eligible and maps them to functions that generate combat-relevant descriptions based on caster level.
- Q: Should players be able to change the selected spell after initial selection? -> A: Yes. Provide UI to change the selected spell (bug fix).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load Character Combat Data (Priority: P1)

As a Pathfinder player, I want to load my Hero Lab portfolio and immediately see my
character's ranged full-attack baseline so I can use the application at the table without
manually rebuilding attack values.

**Why this priority**: Without a trustworthy baseline attack profile, the rest of the
experience has no value. This is the minimum usable slice of the product.

**Independent Test**: Load a supported portfolio containing the Eldritch Archer Magus and
confirm the application shows the correct character identity, base ranged weapon details,
active buff defaults, and baseline full-attack sequence without using manual overrides.

**Acceptance Scenarios**:

1. **Given** a valid Hero Lab portfolio containing a top-level player character with
   `characterindex="1"`, **When** the player loads the portfolio, **Then** the system
   displays that character's name, primary ranged weapon, attack bonus, damage, critical,
   range increment, and baseline full-attack sequence derived from the portfolio.
2. **Given** a valid portfolio with supported active buffs that affect ranged attacks,
   **When** the player loads the portfolio, **Then** the system shows the relevant attack
   options and marks the options already active from the portfolio as enabled by default.
3. **Given** a portfolio missing required combat data, **When** the player loads it,
   **Then** the system explains which required data is missing and prevents misleading full
   attack output from being shown as if it were complete.

---

### User Story 2 - Adjust Attack Options (Priority: P2)

As a Pathfinder player, I want to toggle attack options for the current round so I can see
how buffs, class abilities, and situational choices change my full-attack output before I
declare my actions.

**Why this priority**: Table play depends on comparing tactical choices, but it only becomes
useful after the baseline character import is working.

**Independent Test**: Starting from a loaded supported portfolio, enable and disable attack
options and verify that the full-attack card updates the number of attacks, attack bonuses,
damage expressions, added damage, and default-enabled state explanations accordingly.

**Acceptance Scenarios**:

1. **Given** a loaded character with available attack options, **When** the player toggles
   an option on or off, **Then** the full-attack card recalculates immediately to reflect
   all attack, damage, and extra-effect changes caused by that option.
2. **Given** an option that is already active because of a detected buff, **When** the
   player reviews the option list, **Then** the application shows that the option starts
   enabled and identifies that it came from the loaded character state.
3. **Given** multiple options that affect the same attack sequence, **When** the player
   enables them together, **Then** the application applies them in a consistent order and
   presents the resulting attack sequence without duplicating or dropping effects.

---

### User Story 3 - Track Round Cost and Decision Support (Priority: P3)

As a Pathfinder player, I want to see the round-by-round arcane point cost of currently
enabled attack options so I can decide whether the current attack plan is worth the resource
spend.

**Why this priority**: Arcane point tracking improves decision quality, but the product still
delivers core value without it once attack calculation and option toggling exist.

**Independent Test**: With a loaded character and a set of toggleable options, enable a mix
of free, persistent, and round-costing options and verify that only enabled one-round or
single-use arcane point costs contribute to the displayed total.

**Acceptance Scenarios**:

1. **Given** enabled options that consume arcane points for the current round or current use,
   **When** the player views the combat assistant, **Then** the application shows the total
   arcane point cost for the current selection.
2. **Given** enabled options that do not consume arcane points or are not relevant to the
   current round cost, **When** the total is calculated, **Then** those options do not add to
   the displayed arcane point total.

### Edge Cases

- The portfolio file loads, but `index.xml` does not identify a supported top-level player
  character or the corresponding XML statblock cannot be found.
- Required attack data exists but the primary ranged weapon block is incomplete, duplicated,
  or missing fields needed to build a trustworthy full attack.
- Buff handler data exists for known buffs, but the active-state marker is absent or has an
  unexpected value.
- An option is supported by the application but cannot be resolved from the current portfolio,
  so the system must show it as unavailable rather than applying guessed math.
- A player turns off an option that was enabled by default from a detected buff, and the UI
  must distinguish between inherited state and player override for the current session.
- Multiple options modify the same attack step, such as added attacks plus attack-bonus or
  damage changes, and the resulting sequence must remain deterministic.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a player to load a Hero Lab portfolio file and inspect the
  top-level player character represented by `characterindex="1"` and player-character role
  data.
- **FR-002**: The system MUST derive behavior-affecting character data from the portfolio's
  authoritative machine-readable sources, including `index.xml`, relevant XML statblocks, and
  required handler data for active buffs.
- **FR-003**: The system MUST extract the character's base ranged attack information from the
  main ranged weapon entry identified by `equipped="mainhand"`, including weapon name,
  attack bonus, damage, critical, damage type, range increment, and situational modifiers
  when present.
- **FR-004**: The system MUST determine the baseline number of iterative ranged attacks from
  the character's base attack information and produce a full-attack sequence from that data.
- **FR-005**: The system MUST detect supported attack-affecting buffs from handler data and
  use them to determine which attack options are enabled by default when the character loads.
- **FR-005a**: The system MUST ignore unrecognized buffs in handler data and MUST NOT create
  derived option behavior from unknown buff identifiers.
- **FR-006**: The system MUST present all supported attack options with a display name,
  category, enabled state, and any default-enabled source derived from the loaded character.
- **FR-006a**: Attack options MUST be defined through a structured, data-driven option model
  that can be extended without rewriting existing options.
- **FR-006b**: Initial supported options MUST include Spell Combat, Spellstrike, Arcane
  Accuracy, Haste, Deadly Aim, and Rapid Shot.
- **FR-007**: Players MUST be able to enable or disable supported attack options for the
  current session without reloading the portfolio.
- **FR-008**: The system MUST recalculate the displayed full-attack card whenever the loaded
  character data or selected options change.
- **FR-009**: The full-attack card MUST show the complete attack sequence that would be made
  for a full attack, including changes to attack count, attack bonuses, damage expressions,
  critical information, and extra damage added by enabled options.
- **FR-010**: The system MUST support special-case attack options, including options that add
  attacks or attach an additional spell effect to an attack, without requiring unrelated
  options to be rewritten.
- **FR-010a**: The system MUST support Spellstrike spell selection in the UI.
- **FR-010b**: Spells available to Spellstrike MUST be defined through a dedicated spell
  definition model separate from regular attack option definitions.
- **FR-010c**: The spell selector UI MUST automatically hide when the Spellstrike option is
  unchecked.
- **FR-010d**: Players MUST be able to change the selected Spellstrike spell after initial
  selection.
- **FR-010e**: Spellstrike-eligible spells MUST be whitelisted and described using a
  `spells.js` data-driven model similar to `options.js`, where each whitelisted spell maps
  to a function that generates a combat-relevant description based on the character's caster
  level.
- **FR-011**: The system MUST group attack options in a way that helps players understand what
  kind of decision they are making.
- **FR-011a**: Option and modifier UI areas MUST display only attack options that are
  toggle-capable in the current product scope.
- **FR-011b**: The system MUST NOT display non-toggle reference modifiers as if they were
  selectable attack options.
- **FR-012**: The system MUST display the total arcane point cost of enabled options that cost
  arcane points for the current round or for a single use.
- **FR-012a**: The system MUST NOT track or display arcane pool status (spent/remaining).
  Arcane pool management is the user's responsibility in Hero Lab.
- **FR-013**: The system MUST exclude options with no relevant current-round arcane point cost
  from the displayed arcane point total.
- **FR-014**: The system MUST explain when required portfolio data is missing, malformed, or
  unsupported and MUST avoid presenting incomplete combat output as authoritative.
- **FR-015**: The system MUST use a standard extension model for attack options so new options
  can define their effects, optional buff linkage, and ordering behavior without changing the
  core interaction model for existing options.
- **FR-016**: The system MUST preserve the distinction between character-derived default state
  and player-selected temporary state during the current session.
- **FR-017**: On portfolio file-change reloads, buff-aligned option toggles MUST be reset to
  match portfolio state only for buffs whose active state changed since the previous load.
- **FR-018**: Client-side persisted state MUST be scoped per portfolio path.
- **FR-019**: If no supported player character can be resolved for `characterindex="1"` and
  expected player-character role data, the system MUST fail with a hard error.

### Key Entities *(include if feature involves data)*

- **Portfolio Session**: The currently loaded Hero Lab portfolio and the derived working state
  for a single player session, including source validity and temporary overrides.
- **Character Attack Profile**: The authoritative combat snapshot for the selected player
  character, including identity, base attack data, primary ranged weapon details, and baseline
  full-attack sequence.
- **Buff State**: A supported attack-affecting condition discovered from handler data that may
  cause one or more attack options to start enabled.
- **Attack Option**: A toggleable combat modifier with a display name, category, optional buff
  link, effect definition, ordering behavior, and optional arcane point cost.
- **Spell Definition**: A dedicated data model describing spell metadata and combat effects used
  by Spellstrike selection, maintained separately from standard attack options.
- **Full Attack Card**: The user-facing representation of the current full-attack sequence,
  including every attack entry and all derived effects from currently selected attack options.
- **Arcane Point Summary**: The calculated total resource cost for enabled options that matter
  to the current round or single use.

## Assumptions

- The first delivered version targets one loaded portfolio at a time and focuses on one player
  character rather than party-wide combat planning.
- The initial scope centers on ranged attacks and combat options relevant to an Eldritch Archer
  Magus rather than every possible Pathfinder combat action.
- The system may display unsupported or unresolved options as unavailable, provided it does not
  invent combat results for them.
- The application is intended to help the player make decisions during play, not to replace the
  underlying character file as the source of record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation with supported sample portfolios, a player can load a character and
  view the baseline full-attack card, active defaults, and option list in under 30 seconds.
- **SC-002**: For supported sample portfolios, at least 95% of option toggles update the full
  attack card and arcane point summary in under 1 second after the player changes a setting.
- **SC-003**: In acceptance testing against supported sample portfolios, baseline full-attack
  output and buff-driven default option states match the expected character data in 100% of
  tested cases.
- **SC-004**: In usability testing, at least 90% of players can correctly identify which
  options are currently enabled and whether each was enabled by the loaded character state or
  by their current-session choice.
- **SC-005**: When a new supported attack option is added, previously supported options retain
  their expected results across the regression test suite with no unintended behavior changes.
