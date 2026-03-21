# Data Model: Eldritch Archer Combat Assistant

## Entity: PortfolioSession

- Purpose: Represents one active loaded portfolio and its backend/frontend coordination context.
- Fields:
  - `sessionId` (string, required): Unique identifier for active session.
  - `portfolioPath` (string, required): Local path to watched `.por` file.
  - `status` (enum, required): `loading | ready | error | stale`.
  - `loadedAt` (datetime, required): Time of latest successful parse.
  - `lastEventAt` (datetime, required): Time of most recent backend event.
  - `errorSummary` (string, optional): Human-readable parsing/loading error.
- Relationships:
  - One-to-one with `CharacterAttackProfile` for current MVP scope.
  - One-to-many with `BuffState` and `AttackOptionState`.

## Entity: CharacterAttackProfile

- Purpose: Canonical payload extracted from authoritative portfolio artifacts.
- Fields:
  - `characterId` (string, required): Character identity for selected PC.
  - `characterName` (string, required)
  - `characterIndex` (string, required): Expected `"1"` for primary scope.
  - `baseAttack` (integer, required): Used for iterative attack count.
  - `rangedAttackBase` (integer, required): Base ranged attack bonus.
  - `weaponName` (string, required)
  - `weaponAttack` (string, required): Source attack expression from ranged weapon.
  - `weaponDamage` (string, required)
  - `weaponCrit` (string, required)
  - `weaponDamageType` (string, required)
  - `rangeIncrement` (string, optional)
  - `situationalModifiers` (string, optional)
  - `baselineAttacks` (array<AttackLine>, required): Derived baseline attack sequence.
- Relationships:
  - One-to-many with `AttackLine`.
  - Inputs into `FullAttackProjection`.

## Entity: BuffState

- Purpose: Tracks supported buff activation discovered from `herolab/lead1.xml` data.
- Fields:
  - `buffId` (string, required): Hero Lab thing ID (e.g., `pHaste`).
  - `displayName` (string, required)
  - `isActive` (boolean, required): Derived from presence/value of activation field.
  - `sourceNode` (string, required): Parser trace reference for diagnostics.
- Relationships:
  - One-to-many mapping to `AttackOptionDefinition.defaultFromBuffIds`.

## Entity: AttackOptionDefinition

- Purpose: Declarative definition for a toggleable combat option.
- Fields:
  - `optionId` (string, required)
  - `displayName` (string, required)
  - `category` (string, required)
  - `defaultFromBuffIds` (array<string>, optional)
  - `priority` (integer, required): Effect order for deterministic resolution.
  - `effects` (array<OptionEffect>, required): Structured modifiers and special handlers.
  - `arcanePointCost` (number, optional)
  - `costAppliesWhen` (enum, optional): `per-round | single-use | none`.
  - `availabilityRule` (string, optional): Constraint key for runtime availability checks.

## Entity: AttackOptionState

- Purpose: Runtime selected state for one option, including origin of enabled state.
- Fields:
  - `optionId` (string, required)
  - `enabled` (boolean, required)
  - `enabledSource` (enum, required): `default-buff | user-toggle | default-off`.
  - `isAvailable` (boolean, required)
  - `unavailableReason` (string, optional)
- Relationships:
  - References one `AttackOptionDefinition`.
  - Participates in `FullAttackProjection` generation.

## Entity: FullAttackProjection

- Purpose: Frontend-calculated full-attack output for current selected state.
- Fields:
  - `projectionId` (string, required)
  - `sessionId` (string, required)
  - `attackLines` (array<AttackLine>, required)
  - `appliedOptionIds` (array<string>, required)
  - `arcanePointTotal` (number, required)
  - `generatedAt` (datetime, required)
- Relationships:
  - Derived from `CharacterAttackProfile` + `AttackOptionState` + `AttackOptionDefinition`.

## Value Object: AttackLine

- Fields:
  - `index` (integer, required)
  - `attackBonus` (string, required)
  - `damageExpression` (string, required)
  - `critical` (string, required)
  - `damageType` (string, optional)
  - `additionalEffects` (array<string>, optional)

## Value Object: OptionEffect

- Fields:
  - `type` (enum, required): `add-attack | modify-attack | modify-damage | add-damage | add-effect`.
  - `payload` (object, required): Effect-specific parameters.
  - `applyPhase` (enum, required): `pre-iterative | iterative | post-processing`.

## State Transitions

- `PortfolioSession.status`
  - `loading -> ready`: parse and canonical payload generated successfully.
  - `loading -> error`: required source artifacts missing or invalid.
  - `ready -> stale`: watched file changed and recalculation payload not yet refreshed.
  - `stale -> ready`: backend reload parsed successfully and frontend replaced canonical state.
  - `stale -> error`: reload fails validation or parsing.

- `AttackOptionState.enabledSource`
  - `default-buff -> user-toggle`: player overrides initial buff-derived state.
  - `default-off -> user-toggle`: player enables optional behavior manually.
  - `user-toggle -> default-buff/default-off`: only when a fresh session load resets state.