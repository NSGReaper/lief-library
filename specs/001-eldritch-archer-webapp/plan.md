# Implementation Plan: Eldritch Archer Combat Assistant

**Branch**: `[001-eldritch-archer-webapp]` | **Date**: 2026-03-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-eldritch-archer-webapp/spec.md`

## Summary

Build a local-first web application that ingests a Hero Lab portfolio through a Node.js
backend, streams portfolio file changes to the browser, and performs all combat calculations
in the frontend. The backend is limited to archive ingestion, authoritative XML extraction,
session lifecycle, and change notifications; all full-attack math, option effects, and arcane
point calculations are executed in vanilla JavaScript on the client with Bootstrap-driven UI.

## Technical Context

**Language/Version**: JavaScript (Node.js 20 LTS backend, ES2022 browser frontend)  
**Primary Dependencies**: Express (HTTP API), `chokidar` (file watching), `jszip` (archive read), `fast-xml-parser` (XML parsing), Bootstrap 5 (UI)  
**Storage**: In-memory backend session state; browser `localStorage` for user preferences and transient option overrides  
**Target Platform**: Desktop-class modern browsers (Chrome/Edge/Firefox) with local Node.js server
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Initial portfolio parse and baseline render under 2 seconds for representative samples; option-toggle recalculation under 100 ms for common full-attack paths  
**Constraints**: Backend performs no combat calculations and no persistence to local files; only authoritative XML/handler sources may drive combat state; frontend should prefer vanilla JS and Bootstrap components  
**Scale/Scope**: Single-player local usage, one active portfolio session at a time, focused on Eldritch Archer ranged-attack workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Pre-Phase 0 gate review:

- [x] Parsing integrity: backend ingestion only trusts `index.xml`, `statblocks_xml/`, and
  required `herolab/` buff handler data.
- [x] Extension strategy: option effects are represented as declarative effect descriptors and
  composable client-side calculators, not scattered UI conditionals.
- [x] Verification scope: parser fixtures, option-calculation regressions, and API/session
  contract tests are included in this plan.
- [x] UX synchronization: plan includes explicit default state provenance, recalculation timing,
  and missing-data messaging.
- [x] Documentation sync: quickstart and contracts are generated in this phase; sample-driven
  verification is required in task generation.

Post-Phase 1 design re-check:

- [x] Design artifacts preserve authoritative parsing boundaries and frontend-only calculations.
- [x] Data model supports extension without rewriting existing option behavior.
- [x] Contracts and quickstart reflect no-persistence backend and localStorage-based client state.

## Project Structure

### Documentation (this feature)

```text
specs/001-eldritch-archer-webapp/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── src/
│   ├── api/
│   ├── services/
│   ├── parsers/
│   └── models/
└── tests/
  ├── contract/
  ├── unit/
  └── fixtures/

frontend/
├── src/
│   ├── js/
│   └── css/
shared/
└── contracts/
```

**Structure Decision**: Use a web application split where backend responsibilities stop at
portfolio ingestion, canonical data extraction, and change notifications, while frontend
handles all combat rules and derived calculations.

## Complexity Tracking

No constitution violations require justification for this plan.
