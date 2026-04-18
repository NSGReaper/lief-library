# Quickstart: Eldritch Archer Combat Assistant

## Prerequisites

- Node.js 20 LTS or newer
- npm 10+
- A Hero Lab `.por` file on local disk

## 1. Install dependencies

```bash
npm install
```

## 2. Start backend and frontend

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

Expected local URLs:

- Frontend: `http://localhost:5173` (or configured dev URL)
- Backend API: `http://localhost:3000`

## 3. Load a portfolio session

1. Open the frontend in your browser.
2. Enter the local path to the Hero Lab portfolio file.
3. Submit to create a session.
4. Confirm the app displays character identity, baseline ranged full attack, active buff defaults,
   option list, and current arcane point total.

## 4. Validate live update flow

1. Keep the app open with an active session.
2. Change and save the source portfolio externally.
3. Confirm backend emits update events and frontend refreshes canonical payload.
4. Confirm recalculated full-attack output is synchronized with the updated source data.

## 5. Validate frontend-only calculations

1. Toggle several attack options in the UI.
2. Confirm the full-attack card and arcane point summary change immediately.
3. Confirm backend network calls are limited to session load/fetch/event operations and do not
   expose combat-calculation endpoints.

## 5a. Validate spell selection for Spellstrike

1. Enable the Spellstrike option.
2. Confirm the spell selector appears automatically.
3. Select a spell from the whitelist (defined in `spells.js`).
4. Confirm the spell displays with combat-focused description below the Spellstrike attack.
5. Disable Spellstrike and confirm the spell selector automatically hides.
6. Re-enable Spellstrike and confirm you can change the selected spell.

Note: Only whitelisted spells appear in the Spellstrike selector. To add spells, update the
`spells.js` data file with spell metadata and a description generator function based on caster
level.

## 5b. Validate arcane pool cost display

1. Enable options that cost arcane points (e.g., Arcane Accuracy).
2. Confirm the UI displays only the total cost of currently enabled options.
3. Confirm no arcane pool status tracking (spent/remaining pips) is shown.
4. Remember: actual pool tracking happens in Hero Lab; this app only shows what the current
   attack plan costs.

## 5c. Validate Arcane Accuracy INT modifier application

1. Load a sample portfolio where Intelligence modifier is known (for example Lief level 8 with modified INT +5).
2. Record baseline attack bonuses with Arcane Accuracy disabled.
3. Enable Arcane Accuracy.
4. Confirm every attack bonus increases by exactly the modified INT bonus from parsed attributes.
5. Disable Arcane Accuracy and confirm attack bonuses return to baseline values.

## 6. Validate local storage behavior

1. Set UI preferences and temporary option overrides.
2. Refresh the browser.
3. Confirm preferences/overrides rehydrate from localStorage as designed.
4. Confirm no local file persistence is created by the application.

## 7. Run test suite

```bash
npm run test
```

Recommended focused checks:

- Backend parser fixtures for `index.xml`, XML statblocks, and `herolab/lead1.xml`
- Frontend regression tests for option stacking and deterministic ordering
- Contract and integration tests for session API and SSE update stream