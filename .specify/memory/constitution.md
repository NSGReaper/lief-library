<!--
Sync Impact Report
Version change: none -> 1.0.0
Modified principles:
- Added I. Authoritative Portfolio Parsing
- Added II. Composable Rules and Options
- Added III. Verification Guards Behavior
- Added IV. User Experience Mirrors Game State
- Added V. Documentation and Samples Stay Usable
Added sections:
- Engineering Standards
- Delivery Workflow
Removed sections:
- None
Templates requiring updates:
- ✅ updated .specify/templates/plan-template.md
- ✅ updated .specify/templates/spec-template.md
- ✅ updated .specify/templates/tasks-template.md
- ✅ reviewed .github/prompts/speckit.constitution.prompt.md
- ✅ reviewed docs/Requirements.md
Follow-up TODOs:
- None
-->

# Lief Library Constitution

## Core Principles

### I. Authoritative Portfolio Parsing
All behavior-affecting character data MUST be derived from the authoritative Hero Lab
portfolio sources: `index.xml`, `statblocks_xml/`, and handler data under `herolab/`
when a rule requires it. Text and HTML statblocks MAY be displayed to users, but MUST
NOT drive calculations, defaults, or rules decisions. Missing or unexpected nodes MUST
degrade gracefully with explicit validation paths instead of silent fallbacks.

Rationale: the Hero Lab documentation explicitly warns that text and HTML statblocks are
for display, while XML and portfolio metadata are the stable machine-readable contract.

### II. Composable Rules and Options
Attack options, buffs, and special-case combat rules MUST be implemented through explicit
domain models or extension seams that allow new options to be added without rewriting
unrelated logic. New behavior MUST declare its inputs, effects, and ordering rules in one
place; UI code MUST consume those results instead of embedding combat calculations.

Rationale: the product goal includes adding and removing attack options over time, so the
core engine must remain extendable instead of accreting one-off conditionals.

### III. Verification Guards Behavior
Any change that affects parsing, attack generation, buff detection, damage math, or option
resolution MUST ship with automated regression coverage at the narrowest useful level.
Deterministic rule changes SHOULD begin with failing tests or fixtures before implementation.
Code review MUST reject changes that alter combat outcomes without proving the expected result.

Rationale: this project transforms structured game data into derived combat output, so small
logic regressions are user-visible and expensive to detect manually.

### IV. User Experience Mirrors Game State
The interface MUST make the current combat state easy to understand: available options,
default-enabled options inferred from active buffs, full-attack results, and arcane point
costs MUST stay synchronized. User-facing controls MUST update derived attack output without
requiring hidden knowledge of Hero Lab internals, and invalid or incomplete data MUST be
communicated plainly.

Rationale: correctness alone is insufficient if users cannot tell why an option is enabled,
what changed, or whether a portfolio lacks required data.

### V. Documentation and Samples Stay Usable
Every rules or parsing change MUST keep the working documentation, representative sample
portfolios, and feature usage guidance aligned with the shipped behavior. New assumptions
about file structure, buff identifiers, or option semantics MUST be recorded where future
contributors will find them before modifying the engine.

Rationale: maintainability depends on preserving runnable examples and clear reference
material, especially in a repo whose current source surface is still small.

## Engineering Standards

- The codebase MUST separate portfolio parsing, combat/rules evaluation, and presentation so
  each layer can be tested and extended independently.
- Data contracts for attacks, buffs, and option effects MUST be explicit and serializable for
  inspection during debugging and UI rendering.
- Behavior that depends on external identifiers, such as Hero Lab buff IDs, MUST be declared
  in named constants or registries rather than scattered string literals.
- Error handling MUST preserve enough context to identify the failing portfolio artifact,
  character, or option without exposing users to raw stack traces as the primary feedback.
- Performance optimizations MAY be added only after correctness and clarity are established
  for the affected parser or rule path.

## Delivery Workflow

- Feature specs MUST state which authoritative portfolio sources they read, what extension
  seam they rely on, and what user-visible state changes are expected.
- Implementation plans MUST pass a constitution check covering parsing integrity, extension
  strategy, verification scope, UX synchronization, and documentation/sample updates.
- Task lists MUST include fixture or sample updates, automated verification for behavior
  changes, and any documentation work needed to explain new options or rules.
- Reviews MUST verify that derived attack output remains traceable from raw portfolio data to
  rendered results.
- Before release or handoff, contributors MUST validate the primary user flow with a real or
  representative portfolio sample.

## Governance

- This constitution overrides conflicting local habits, plans, and task breakdowns.
- Amendments MUST document the changed principle or section, the reason for the change, and
  any required template or documentation updates.
- Semantic versioning governs this document: MAJOR for incompatible governance changes or
  removed principles, MINOR for new principles or materially expanded requirements, and PATCH
  for clarifications that do not change expected behavior.
- Compliance review is required in every feature spec, implementation plan, task list, and
  code review that affects parsing, rules evaluation, or user-facing combat flows.
- `docs/Requirements.md` remains the product guidance baseline; this constitution defines how
  that work is specified, implemented, and reviewed.

**Version**: 1.0.0 | **Ratified**: 2026-03-21 | **Last Amended**: 2026-03-21