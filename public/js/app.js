/**
 * Eldritch Archer Magus — Main Application
 *
 * Handles state management, attack calculation, and UI rendering.
 * All state is stored in localStorage to survive page refreshes.
 */

// ─── State ────────────────────────────────────────────────────────────────────

let state = {
  character: null,       // parsed character data from server
  optionStates: {},      // id → boolean (enabled/disabled)
  arcanePoolSpent: 0,    // how many arcane points have been spent this round
  arcanePoolTotal: 0,    // max arcane pool
  arcanePoolLeft: 0,     // remaining arcane pool from portfolio
  selectedSpell: null,   // spell chosen for Spellstrike
};

// ─── Local Storage ────────────────────────────────────────────────────────────

const LS_KEY = 'eldritchArcher';

function saveState() {
  const data = {
    character: state.character,
    optionStates: state.optionStates,
    arcanePoolSpent: state.arcanePoolSpent,
    selectedSpell: state.selectedSpell,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    state.character = data.character || null;
    state.optionStates = data.optionStates || {};
    state.arcanePoolSpent = data.arcanePoolSpent || 0;
    state.selectedSpell = data.selectedSpell || null;

    // Re-compute derived fields if character is present but missing them
    if (state.character && state.character.weaponPrimary == null) {
      const wv = parseWeaponAttack(state.character.weapon?.attack);
      state.character.weaponPrimary = wv[0] || 0;
      state.character.iterativeCount = state.character.charRangedAttackValues?.length || 1;
    }
    if (state.character && !state.character.defaultEnabledOptions) {
      state.character.defaultEnabledOptions = Object.keys(state.optionStates)
        .filter(id => {
          const opt = ATTACK_OPTIONS.find(o => o.id === id);
          return opt?.defaultEnabled ||
            (opt?.buffId && state.character.activeBuffIds?.includes(opt.buffId));
        });
    }

    return !!state.character;
  } catch {
    return false;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatBonus(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Parse a weapon attack string like "+15/+15/+15/+10" into an array of integers. */
function parseWeaponAttack(str) {
  if (!str) return [];
  return str.split('/').map(s => parseInt(s.replace(/\s/g, ''), 10)).filter(n => !isNaN(n));
}

function parseDamageBonus(dmgStr) {
  // e.g., "1d8+6" → { dice: "1d8", bonus: 6 }
  const m = dmgStr.match(/^(\d+d\d+)([+-]\d+)?$/);
  if (!m) return { dice: dmgStr, bonus: 0 };
  return { dice: m[1], bonus: m[2] ? parseInt(m[2], 10) : 0 };
}

function buildDamageString(dice, bonus) {
  if (bonus === 0) return dice;
  return `${dice}${formatBonus(bonus)}`;
}

// ─── Attack Calculation ───────────────────────────────────────────────────────

/**
 * Calculate the full list of attacks given the current option states.
 *
 * Strategy:
 *  The weapon's current rangedattack primary value (from Hero Lab) represents the
 *  per-attack bonus with ALL currently default-enabled option effects already baked in.
 *  We compute a "clean base" by subtracting those default effects, then add all
 *  currently-enabled option effects to get the actual per-attack bonus.
 *
 *    cleanBase = weaponPrimary − Σ(hitBonus of defaultEnabled options)
 *    perAttackBonus = cleanBase + Σ(hitBonus of currently enabled options)
 *
 *  Iterative attacks step down by 5 per tier (standard Pathfinder).
 *  Extra attacks come from options that add extraAttacks when currently enabled.
 *
 * Returns an array of attack objects:
 *   { label, attackBonus, damageString, isSpellstrike, spellstrikeHitBonus }
 */
function calculateAttacks() {
  const char = state.character;
  if (!char) return [];

  const weaponPrimary = char.weaponPrimary;           // first value from weapon rangedattack
  const iterativeCount = char.iterativeCount;         // number of BAB iterative attacks
  const iterativeStep = 5;                            // Pathfinder standard iterative step

  // Parse weapon damage
  const { dice: dmgDice, bonus: dmgBase } = parseDamageBonus(char.weapon.damage);

  // 1. Compute cleanBase = weaponPrimary minus effects of all defaultEnabled options
  let defaultHitBonus = 0;
  let defaultDmgBonus = 0;
  for (const option of ATTACK_OPTIONS) {
    const isDefault = char.defaultEnabledOptions?.includes(option.id);
    if (!isDefault) continue;
    const eff = option.effect;
    if (eff.hitBonus) defaultHitBonus += eff.hitBonus;
    if (eff.damageBonus) defaultDmgBonus += eff.damageBonus;
  }

  const cleanBase = weaponPrimary - defaultHitBonus;
  const cleanDmgBase = dmgBase - defaultDmgBonus;

  // 2. Accumulate effects of all currently-enabled options
  let totalHitBonus = 0;
  let totalDmgBonus = 0;
  const extraAttacks = [];
  let isSpellstrike = false;
  let spellstrikeHitBonus = 0;

  for (const option of ATTACK_OPTIONS) {
    const enabled = state.optionStates[option.id] ?? false;
    if (!enabled) continue;

    const eff = option.effect;

    if (eff.hitBonus) totalHitBonus += eff.hitBonus;
    if (eff.damageBonus) totalDmgBonus += eff.damageBonus;
    if (eff.isSpellstrike) isSpellstrike = true;
    if (eff.spellstrikeHitBonus) spellstrikeHitBonus += eff.spellstrikeHitBonus;

    if (eff.extraAttacks) {
      for (const extra of eff.extraAttacks) {
        extraAttacks.push({
          label: extra.label,
          atIndexOffset: extra.atIndexOffset,
          hitBonusOffset: extra.hitBonusOffset,
          source: option.id,
        });
      }
    }
  }

  // 3. Build iterative attacks
  const perAttack = cleanBase + totalHitBonus;
  const perDmg = cleanDmgBase + totalDmgBonus;

  let attacks = [];
  for (let i = 0; i < iterativeCount; i++) {
    attacks.push({
      label: ['1st', '2nd', '3rd', '4th'][i] || `${i + 1}th`,
      attackBonus: perAttack - i * iterativeStep,
      damageBonus: perDmg,
      dmgDice,
      isSpellstrike: false,
      spellstrikeHitBonus: 0,
      source: 'iterative',
    });
  }

  // 4. Add extra attacks from enabled options
  for (const extra of extraAttacks) {
    const refIdx = Math.min(extra.atIndexOffset, attacks.length - 1);
    const refAtk = attacks[refIdx];
    attacks.push({
      label: extra.label,
      attackBonus: perAttack + extra.hitBonusOffset,
      damageBonus: perDmg,
      dmgDice,
      isSpellstrike: false,
      spellstrikeHitBonus: 0,
      source: 'extra',
    });
  }

  // 5. Sort: extras first (by attack bonus desc), then iteratives
  const iterative = attacks.filter(a => a.source === 'iterative');
  const extras = attacks
    .filter(a => a.source === 'extra')
    .sort((a, b) => b.attackBonus - a.attackBonus);
  attacks = [...extras, ...iterative];

  // 6. Apply spellstrike to first attack
  if (isSpellstrike && attacks.length > 0) {
    attacks[0].isSpellstrike = true;
    attacks[0].spellstrikeHitBonus = spellstrikeHitBonus;
    attacks[0].label = 'Spellstrike';
  }

  // 7. Build final damage strings
  for (const atk of attacks) {
    atk.damageString = buildDamageString(atk.dmgDice, atk.damageBonus);
  }

  return attacks;
}

/**
 * Calculate total arcane point cost for enabled options this round.
 * Only counts options that are single-round or single-use.
 */
function calculateArcaneCost() {
  let total = 0;
  for (const option of ATTACK_OPTIONS) {
    if (state.optionStates[option.id] && option.arcanePointCost > 0) {
      total += option.arcanePointCost;
    }
  }
  return total;
}

// ─── UI Rendering ─────────────────────────────────────────────────────────────

function renderArcanePool() {
  const pool = state.character?.arcanePool;
  if (!pool) return;

  const total = pool.max;
  // arcanePoolSpent = extra points spent THIS session (on top of portfolio's used count)
  const sessionSpent = state.arcanePoolSpent;
  const arcaneCost = calculateArcaneCost();
  // How many are available to use: portfolio left minus session spending minus committed options
  const available = Math.max(0, pool.left - sessionSpent - arcaneCost);

  const container = document.getElementById('arcane-pips');
  const costEl = document.getElementById('arcane-cost-display');
  container.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const pip = document.createElement('span');
    pip.className = 'pool-pip';

    const portfolioUsed = pool.max - pool.left; // pips already spent before this session
    const thisSessionSpent = sessionSpent;

    if (i < available) {
      pip.classList.add('filled');
    } else if (i < available + arcaneCost) {
      pip.classList.add('committed');
    } else if (i < pool.left) {
      // Spent in this session
      pip.classList.add('spent');
      pip.title = 'Click to restore';
    } else {
      // Spent before session (from portfolio)
      pip.classList.add('spent');
    }

    // Allow clicking filled pips to spend them, or session-spent pips to restore
    pip.addEventListener('click', () => {
      if (pip.classList.contains('filled')) {
        state.arcanePoolSpent = Math.min(sessionSpent + 1, pool.left - arcaneCost);
        saveState();
        renderArcanePool();
      } else if (pip.classList.contains('spent') && i < pool.left) {
        // Only restore session-spent pips (i < pool.left means it was "left" in portfolio)
        if (sessionSpent > 0) {
          state.arcanePoolSpent = sessionSpent - 1;
          saveState();
          renderArcanePool();
        }
      }
    });

    container.appendChild(pip);
  }

  if (arcaneCost > 0) {
    costEl.textContent = `${arcaneCost} point${arcaneCost !== 1 ? 's' : ''} committed this round`;
    costEl.style.display = '';
  } else {
    costEl.style.display = 'none';
  }

  document.getElementById('arcane-available').textContent =
    `${available} / ${total}`;
}

function renderWeapon() {
  const w = state.character?.weapon;
  if (!w) return;

  document.getElementById('weapon-name').innerHTML = w.name;
  document.getElementById('weapon-crit').textContent = w.crit;
  document.getElementById('weapon-range').textContent = w.range;
  document.getElementById('weapon-damage-type').textContent = w.damageType;

  const siMods = w.situationalModifiers;
  const siEl = document.getElementById('situational-modifiers');
  if (siMods) {
    siEl.textContent = siMods;
    siEl.closest('.weapon-situational')?.style.setProperty('display', '');
  } else {
    siEl.closest('.weapon-situational')?.style.setProperty('display', 'none');
  }
}

function renderOptions() {
  const categories = [
    { id: 'per-attack', title: 'Per-Attack Decisions', colorClass: 'gold' },
    { id: 'swift-buff', title: 'Swift-Action Buffs · 1 Round', colorClass: 'teal' },
    { id: 'conditional', title: 'Conditional Buffs', colorClass: 'orange' },
  ];

  for (const cat of categories) {
    const grid = document.getElementById(`options-grid-${cat.id}`);
    if (!grid) continue;
    grid.innerHTML = '';

    const catOptions = ATTACK_OPTIONS.filter(o => o.category === cat.id);
    for (const option of catOptions) {
      const enabled = state.optionStates[option.id] ?? false;
      const chip = document.createElement('label');
      chip.className = `toggle-chip ${enabled ? `chip-on-${cat.colorClass}` : 'chip-off'}`;
      chip.dataset.optionId = option.id;
      chip.title = option.description;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = enabled;
      cb.addEventListener('change', () => {
        state.optionStates[option.id] = cb.checked;

        // If enabling spellstrike, ensure a spell is selected
        if (option.id === 'spellstrike' && cb.checked && !state.selectedSpell) {
          document.getElementById('spell-selector-panel').style.display = '';
        }

        saveState();
        renderAll();
      });

      const box = document.createElement('span');
      box.className = 'chip-box';
      box.textContent = enabled ? '✓' : '';

      const label = document.createElement('span');
      label.className = 'chip-label';
      label.textContent = option.name;

      const effect = document.createElement('span');
      effect.className = 'chip-effect';
      effect.textContent = ` — ${option.description.split(';')[0].split(':').pop().trim()}`;

      // Show arcane cost badge
      if (option.arcanePointCost > 0) {
        const badge = document.createElement('span');
        badge.className = 'chip-arcane-cost';
        badge.textContent = `${option.arcanePointCost}◆`;
        chip.appendChild(badge);
      }

      chip.appendChild(cb);
      chip.appendChild(box);
      chip.appendChild(label);
      chip.appendChild(effect);
      grid.appendChild(chip);
    }
  }
}

function renderAttackCard() {
  const attacks = calculateAttacks();
  const container = document.getElementById('attacks-list');
  container.innerHTML = '';

  const char = state.character;
  const w = char?.weapon;
  const dividerTemplate = '<div class="divider-rune">· · · · ·</div>';

  for (let i = 0; i < attacks.length; i++) {
    const atk = attacks[i];

    if (i > 0) {
      container.insertAdjacentHTML('beforeend', dividerTemplate);
    }

    const row = document.createElement('div');
    row.className = `attack-row d-flex align-items-center gap-3${atk.isSpellstrike ? ' spellstrike' : ''}`;

    const hitClass = atk.isSpellstrike ? 'to-hit spellstrike-hit' : 'to-hit';
    const hitBonus = formatBonus(atk.attackBonus);

    row.innerHTML = `
      <div class="atk-index">${atk.label}</div>
      <div class="atk-label flex-grow-1">
        <strong>${atk.isSpellstrike ? 'Spellstrike Arrow' : 'Arrow'}</strong>
        <br>${atk.isSpellstrike ? 'Ranged touch · spell on hit' : (atk.source === 'extra' ? `${atk.label} bonus attack` : 'Normal ranged attack')}
      </div>
      <div class="${hitClass}">
        ${hitBonus}
      </div>
      <div class="dmg-block">
        <div class="dmg-dice${atk.isSpellstrike ? ' spell-dmg' : ''}">${atk.damageString}</div>
        <div class="dmg-type">${w?.damageType?.toLowerCase() || 'piercing'}</div>
      </div>
    `;

    container.appendChild(row);

    // Spell banner after spellstrike attack
    if (atk.isSpellstrike && state.selectedSpell) {
      const spell = state.selectedSpell;
      const spellBanner = document.createElement('div');
      spellBanner.className = 'spell-banner d-flex align-items-start gap-2';
      spellBanner.innerHTML = `
        <div class="spell-icon">⚡</div>
        <div class="flex-grow-1">
          <div class="d-flex align-items-baseline justify-content-between">
            <span class="spell-name">${spell.name}</span>
            <span class="spell-meta">Lvl ${spell.level} · ${spell.castTime}</span>
          </div>
          <div class="spell-detail">${spell.school}</div>
        </div>
      `;
      container.appendChild(spellBanner);
    } else if (atk.isSpellstrike && !state.selectedSpell) {
      const spellBanner = document.createElement('div');
      spellBanner.className = 'spell-banner spell-banner-select d-flex align-items-center gap-2';
      spellBanner.innerHTML = `<span class="spell-select-prompt">⚡ Select a spell for Spellstrike →</span>`;
      spellBanner.addEventListener('click', () => {
        document.getElementById('spell-selector-panel').style.display = '';
        document.getElementById('spell-selector-panel').scrollIntoView({ behavior: 'smooth' });
      });
      container.appendChild(spellBanner);
    }
  }

  if (attacks.length === 0) {
    container.innerHTML = '<div class="text-center text-muted py-3">No attacks available</div>';
  }
}

function renderSpellSelector() {
  const panel = document.getElementById('spell-selector-panel');
  const list = document.getElementById('spell-list');
  if (!list) return;

  list.innerHTML = '';

  const spells = state.character?.spells || [];
  const touchSpells = spells.filter(s =>
    s.range.toLowerCase().includes('touch') || s.range === 'touch');

  if (touchSpells.length === 0) {
    list.innerHTML = '<div class="spell-none">No touch spells available</div>';
    return;
  }

  for (const spell of touchSpells) {
    const item = document.createElement('div');
    item.className = `spell-item${state.selectedSpell?.name === spell.name ? ' selected' : ''}`;
    item.innerHTML = `
      <div class="d-flex align-items-baseline justify-content-between">
        <span class="spell-item-name">${spell.name}</span>
        <span class="spell-item-meta">Lvl ${spell.level} · ${spell.castTime}</span>
      </div>
      <div class="spell-item-detail">${spell.school}</div>
    `;
    item.addEventListener('click', () => {
      state.selectedSpell = spell;
      saveState();
      renderAll();
      // Hide panel after selecting
      panel.style.display = 'none';
    });
    list.appendChild(item);
  }
}

function renderCharacterHeader() {
  const char = state.character;
  if (!char) return;

  document.getElementById('char-name').textContent = char.name;
  document.getElementById('char-summary').textContent = char.summary;
}

function renderAll() {
  renderCharacterHeader();
  renderWeapon();
  renderArcanePool();
  renderOptions();
  renderAttackCard();
  renderSpellSelector();
}

// ─── Portfolio Upload ──────────────────────────────────────────────────────────

async function uploadPortfolio(file) {
  const formData = new FormData();
  formData.append('portfolio', file);

  const statusEl = document.getElementById('upload-status');
  statusEl.textContent = 'Parsing portfolio…';
  statusEl.className = 'upload-status loading';

  try {
    const response = await fetch('/api/portfolio', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const character = await response.json();

    // Initialise option states from active buffs
    const defaultEnabledOptions = [];
    const activeBuffIds = new Set(character.activeBuffIds || []);

    // First pass: detect which options are enabled via Hero Lab buffs
    const optionStates = {};
    for (const option of ATTACK_OPTIONS) {
      if (option.buffId && activeBuffIds.has(option.buffId)) {
        optionStates[option.id] = true;
        defaultEnabledOptions.push(option.id);
      } else {
        optionStates[option.id] = option.defaultEnabled;
        if (option.defaultEnabled) defaultEnabledOptions.push(option.id);
      }
    }

    // Compute weapon primary attack value and iterative attack count
    const weaponAttackValues = parseWeaponAttack(character.weapon.attack);
    const weaponPrimary = weaponAttackValues[0] || 0;
    const iterativeCount = character.charRangedAttackValues.length; // from BAB

    // Detect "unexplained" extra attacks (not from buff-controlled options)
    // and auto-enable options like Rapid Shot to account for them
    const weaponTotalAttacks = weaponAttackValues.length;
    let explainedExtras = 0;
    for (const optId of defaultEnabledOptions) {
      const opt = ATTACK_OPTIONS.find(o => o.id === optId);
      if (opt?.effect?.extraAttacks) explainedExtras += opt.effect.extraAttacks.length;
    }
    const unexplainedExtras = weaponTotalAttacks - iterativeCount - explainedExtras;

    // Assign unexplained extras to options in declaration order (Rapid Shot is first)
    let extrasToAssign = unexplainedExtras;
    for (const option of ATTACK_OPTIONS) {
      if (extrasToAssign <= 0) break;
      if (defaultEnabledOptions.includes(option.id)) continue; // already assigned
      if (option.effect?.extraAttacks && option.effect.extraAttacks.length > 0) {
        optionStates[option.id] = true;
        defaultEnabledOptions.push(option.id);
        extrasToAssign -= option.effect.extraAttacks.length;
      }
    }

    // Attach computed values to character for use in calculation
    character.weaponPrimary = weaponPrimary;
    character.iterativeCount = iterativeCount;
    character.defaultEnabledOptions = defaultEnabledOptions;

    state.character = character;
    state.optionStates = optionStates;
    state.arcanePoolSpent = 0;  // session spending starts fresh (portfolio shows remaining)
    state.selectedSpell = null;

    saveState();

    statusEl.textContent = `✓ Loaded: ${character.name}`;
    statusEl.className = 'upload-status success';

    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('app-section').style.display = '';

    renderAll();
  } catch (err) {
    statusEl.textContent = `✗ Error: ${err.message}`;
    statusEl.className = 'upload-status error';
  }
}

// ─── Bootstrap the app ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Try to restore from localStorage
  if (loadState() && state.character) {
    // arcanePoolSpent is restored from localStorage (persisted session spending)
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('app-section').style.display = '';
    renderAll();
  }

  // File input change
  const fileInput = document.getElementById('portfolio-file');
  fileInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) uploadPortfolio(file);
  });

  // Drag-and-drop on upload zone
  const dropZone = document.getElementById('drop-zone');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) uploadPortfolio(file);
    });
    dropZone.addEventListener('click', () => fileInput?.click());
  }

  // "Change character" link
  document.getElementById('change-character-link')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('upload-section').style.display = '';
    document.getElementById('app-section').style.display = 'none';
  });

  // Spell selector close
  document.getElementById('spell-selector-close')?.addEventListener('click', () => {
    document.getElementById('spell-selector-panel').style.display = 'none';
  });

  // Reset round button
  document.getElementById('reset-round-btn')?.addEventListener('click', () => {
    // Turn off all single-round options
    for (const option of ATTACK_OPTIONS) {
      if (option.arcanePointCost > 0 || option.category === 'per-attack') {
        state.optionStates[option.id] = false;
      }
    }
    saveState();
    renderAll();
  });
});
