/**
 * Eldritch Archer Magus — Main Application
 *
 * Handles state management, attack calculation, and UI rendering.
 * All state is stored in localStorage to survive page refreshes.
 */
import { ATTACK_OPTIONS } from './options.js';
import { DamageCalculator, filterValidSpellstrikeSpells, resolveSpellAttackCount } from './spells.js';
import { parseWeaponAttack, formatBonus, parseDamageBonus, buildDamageString } from './utilities.js';

// ─── State ────────────────────────────────────────────────────────────────────

let state = {
  character: null,       // parsed character data from server
  optionStates: {},      // id → boolean (enabled/disabled)
  selectedSpell: null,   // spell chosen for Spellstrike
  portfolioSource: null, // { type: 'upload' } | { type: 'local', path: string }
};

let browseState = null; // { path, parent, dirs, files }

// ─── Local Storage ────────────────────────────────────────────────────────────

const LS_KEY = 'eldritchArcher';

function saveState() {
  const data = {
    character: state.character,
    optionStates: state.optionStates,
    selectedSpell: state.selectedSpell?.name || null,
    portfolioSource: state.portfolioSource || null,
    lastPortfolioDirectory: state.lastPortfolioDirectory || null,
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
    state.selectedSpell = (data.selectedSpell && state.character?.spells)
      ? (filterValidSpellstrikeSpells(state.character.spells).find(s => s.name === data.selectedSpell) || null)
      : null;
    state.portfolioSource = data.portfolioSource || null;
    state.lastPortfolioDirectory = data.lastPortfolioDirectory || null;

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

    // Re-validate feature gating: force-disable any option unavailable for this character
    if (state.character) {
      const featureIds = new Set(state.character.characterFeatureIds || []);
      const magusLevel = state.character.magusLevel || 0;
      const unavailableOptionIds = new Set();
      for (const option of ATTACK_OPTIONS) {
        if (option.requiresFeatureId && !featureIds.has(option.requiresFeatureId)) {
          unavailableOptionIds.add(option.id);
        }
        if (option.requiresMinMagusLevel && magusLevel < option.requiresMinMagusLevel) {
          unavailableOptionIds.add(option.id);
        }
      }
      state.character.unavailableOptionIds = Array.from(unavailableOptionIds);
      for (const id of unavailableOptionIds) {
        state.optionStates[id] = false;
      }
    }

    return !!state.character;
  } catch {
    return false;
  }
}

function clearState() {
  state = {
    character: null,
    optionStates: {},
    selectedSpell: null,
    portfolioSource: null,
    lastPortfolioDirectory: null,
  };
  saveState();
}

function resolveStatModifierFromCharacter(character, statKey) {
  if (!character || typeof statKey !== 'string' || statKey.length === 0) return 0;

  const mapped = statKey.endsWith('Mod') ? statKey.slice(0, -3) : statKey;
  const fromMap = character.abilityModifiers?.[mapped];
  if (typeof fromMap === 'number' && Number.isFinite(fromMap)) {
    return fromMap;
  }

  const fromLegacy = character[statKey];
  if (typeof fromLegacy === 'number' && Number.isFinite(fromLegacy)) {
    return fromLegacy;
  }

  return 0;
}

function buildOptionContext(character = state.character) {
  return {
    character,
    abilityModifiers: character?.abilityModifiers || {},
    primaryBAB: character?.primaryBAB || 0,
    magusLevel: character?.magusLevel || 0,
    casterLevel: character?.casterLevel || 0,
    intMod: resolveStatModifierFromCharacter(character, 'intMod'),
    resolveStatModifier: (statKey) => resolveStatModifierFromCharacter(character, statKey),
  };
}

function resolveOptionDescription(option, context) {
  if (typeof option?.descriptionFn === 'function') {
    try {
      return option.descriptionFn(context) || '';
    } catch {
      return option.description || '';
    }
  }
  return option?.description || '';
}

function resolveOptionEffect(option, context) {
  if (typeof option?.effectFn === 'function') {
    try {
      return option.effectFn(context) || {};
    } catch {
      return option.effect || {};
    }
  }
  return option?.effect || {};
}

function getChipEffectText(description) {
  if (!description) return '';
  return description.split(';')[0].split(':').pop().trim();
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
 *   { label, attackBonus, damageString, isSpellstrike }
 */
function calculateAttacks() {
  const char = state.character;
  if (!char) return [];
  const optionContext = buildOptionContext(char);

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
    const eff = resolveOptionEffect(option, optionContext);
    if (eff.hitBonus) defaultHitBonus += eff.hitBonus;
    if (eff.hitBonusFromStat) defaultHitBonus += optionContext.resolveStatModifier(eff.hitBonusFromStat);
    if (eff.damageBonus) defaultDmgBonus += eff.damageBonus;
  }

  const cleanBase = weaponPrimary - defaultHitBonus;
  const cleanDmgBase = dmgBase - defaultDmgBonus;

  // 2. Accumulate effects of all currently-enabled options
  let totalHitBonus = 0;
  let totalDmgBonus = 0;
  const extraAttacks = [];
  const extraDamages = [];
  let isSpellstrike = false;

  for (const option of ATTACK_OPTIONS) {
    const enabled = state.optionStates[option.id] ?? false;
    if (!enabled) continue;

    const eff = resolveOptionEffect(option, optionContext);

    if (eff.hitBonus) totalHitBonus += eff.hitBonus;
    if (eff.hitBonusFromStat) totalHitBonus += optionContext.resolveStatModifier(eff.hitBonusFromStat);
    if (eff.damageBonus) totalDmgBonus += eff.damageBonus;
    if (eff.isSpellstrike) isSpellstrike = true;

    if (eff.extraAttacks) {
      for (const extra of eff.extraAttacks) {
        extraAttacks.push({
          label: extra.label,
          hitBonusOffset: extra.hitBonusOffset,
          source: option.id,
        });
      }
    }

    if (eff.extraDamage) {
      for (const ed of eff.extraDamage) {
        extraDamages.push(ed);
      }
    }
  }

  // 2a. Apply arcane pool weapon enhancement bonus (remaining after properties)
  const enhancementBudget = calculateEnhancementBudget();
  totalHitBonus += enhancementBudget.remaining;
  totalDmgBonus += enhancementBudget.remaining;

  // 2b. Deduplicate Speed and Haste extra attacks (they don't stack)
  const hasSpeed = extraAttacks.some(ea => ea.source === 'arcane-pool-speed');
  const hasHaste = extraAttacks.some(ea => ea.source === 'haste');
  if (hasSpeed && hasHaste) {
    // Remove Speed attack, keep Haste (both are functionally identical)
    const speedIndex = extraAttacks.findIndex(ea => ea.source === 'arcane-pool-speed');
    if (speedIndex !== -1) {
      extraAttacks.splice(speedIndex, 1);
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
      source: 'iterative',
      extraDamages,
    });
  }

  // 4. Add extra attacks from enabled options
  for (const extra of extraAttacks) {
    attacks.push({
      label: extra.label,
      attackBonus: perAttack + extra.hitBonusOffset,
      damageBonus: perDmg,
      dmgDice,
      isSpellstrike: false,
      source: 'extra',
      extraDamages,
    });
  }

  // 5. Sort: extras first (by attack bonus desc), then iteratives
  const iterative = attacks.filter(a => a.source === 'iterative');
  const extras = attacks
    .filter(a => a.source === 'extra')
    .sort((a, b) => b.attackBonus - a.attackBonus);
  attacks = [...extras, ...iterative];

  // 6. Apply spellstrike to the first attack if enabled

  // Spell Combat lets the magus cast and make a full attack on the same turn.
  // Without it, using Spellstrike means casting takes the action — only the one
  // spellstrike attack itself is made.
  const spellCombatEnabled = state.optionStates['spell-combat'] ?? false;
  if (isSpellstrike && !spellCombatEnabled) {
    attacks = attacks.slice(0, 1);
  }

  if (isSpellstrike && attacks.length > 0) {
    const spellAttackCount = resolveSpellAttackCount(
      state.selectedSpell,
      state.selectedSpell?.casterLevel ?? 1
    );
    const markedCount = Math.min(spellAttackCount, attacks.length);
    for (let i = 0; i < markedCount; i++) {
      attacks[i].isSpellstrike = true;
    }
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

/**
 * Calculate the total enhancement bonus from caster level.
 * At 1st level: +1, then +1 for every 4 levels thereafter, max +5 at 17th level.
 */
function calculateEnhancementBonus(casterLevel) {
  return Math.min(5, 1 + Math.floor((casterLevel - 1) / 4));
}

/**
 * Calculate the enhancement budget for arcane pool weapon enhancement.
 * Returns { total, spent, remaining } where:
 *  - total: enhancement bonus from caster level (1-5)
 *  - spent: sum of enhancementCost from active property options
 *  - remaining: total - spent (applied to hit/damage)
 */
function calculateEnhancementBudget() {
  const char = state.character;
  if (!char) return { total: 0, spent: 0, remaining: 0 };

  // Check if master enhancement is active
  const masterEnabled = state.optionStates['arcane-pool-enhance'] ?? false;
  if (!masterEnabled) {
    return { total: 0, spent: 0, remaining: 0 };
  }

  const total = calculateEnhancementBonus(char.casterLevel);
  
  // Calculate spent on active properties
  let spent = 0;
  for (const option of ATTACK_OPTIONS) {
    if (option.category === 'arcane-pool-properties' && 
        state.optionStates[option.id] && 
        option.enhancementCost) {
      spent += option.enhancementCost;
    }
  }

  return {
    total,
    spent,
    remaining: Math.max(0, total - spent),
  };
}

/**
 * Check if a weapon property can be enabled given the current enhancement budget.
 */
function isPropertyAvailable(propertyId) {
  const option = ATTACK_OPTIONS.find(o => o.id === propertyId);
  if (!option || option.category !== 'arcane-pool-properties') return false;
  
  const budget = calculateEnhancementBudget();
  const cost = option.enhancementCost || 0;
  
  return budget.remaining >= cost;
}

// ─── UI Rendering ─────────────────────────────────────────────────────────────

function renderArcanePool() {
  const arcaneCost = calculateArcaneCost();

  const container = document.getElementById('arcane-pips');
  const costEl = document.getElementById('arcane-cost-display');
  container.innerHTML = '';

  // Render only the committed pips (no empty pips for unused pool)
  for (let i = 0; i < arcaneCost; i++) {
    const pip = document.createElement('span');
    pip.className = 'pool-pip committed';
    container.appendChild(pip);
  }

  if (arcaneCost > 0) {
    costEl.textContent = `${arcaneCost} point${arcaneCost !== 1 ? 's' : ''} committed this round`;
    costEl.style.display = '';
  } else {
    costEl.textContent = 'No arcane points committed';
    costEl.style.display = '';
  }
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

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function colorizeBonuses(description) {
  const safeDescription = escapeHtml(description);
  return safeDescription.replace(/([+\-−]\d+(?![Dd])(?: \w+ bonus)?(?: (to )?(hit and damage|hit|damage|dmg))?)/gi, (match) => {
    const className = match.startsWith('+') ? 'bonus-positive' : 'bonus-negative';
    return `<span class="${className}">${match}</span>`;
  });
}

function renderOptions() {
  const categories = [
    { id: 'per-attack', title: 'Per-Attack Decisions', colorClass: 'gold' },
    { id: 'arcane-pool', title: 'Arcane Pool', colorClass: 'teal' },
    { id: 'arcane-pool-properties', title: 'Arcane Pool Properties', colorClass: 'teal' },
    { id: 'conditional', title: 'Conditional Buffs', colorClass: 'orange' },
    { id: 'buff', title: 'Active Buffs', colorClass: 'fire' },
  ];

  const enhancementActive = state.optionStates['arcane-pool-enhance'] ?? false;
  const budget = calculateEnhancementBudget();

  for (const cat of categories) {
    const grid = document.getElementById(`options-grid-${cat.id}`);
    if (!grid) continue;
    grid.innerHTML = '';

    const unavailable = new Set(state.character?.unavailableOptionIds || []);
    const catOptions = ATTACK_OPTIONS.filter(o => o.category === cat.id && !unavailable.has(o.id));
    for (const option of catOptions) {
      const optionContext = buildOptionContext(state.character);
      const optionDescription = resolveOptionDescription(option, optionContext);
      const enabled = state.optionStates[option.id] ?? false;
      
      // Check if property is available (has enough budget)
      const isProperty = option.category === 'arcane-pool-properties';
      const canEnable = !isProperty || isPropertyAvailable(option.id) || enabled;
      const isDisabled = isProperty && !enhancementActive;

      const chip = document.createElement('label');
      const colorClass = option.alignment === 'good'
        ? 'green'
        : option.alignment === 'bad'
          ? 'red'
          : cat.colorClass;
      let chipClass = `toggle-chip ${enabled ? `chip-on-${colorClass}` : 'chip-off'}`;
      if (isDisabled || (!enabled && !canEnable)) {
        chipClass += ' chip-disabled';
      }
      chip.className = chipClass;
      chip.dataset.optionId = option.id;
      chip.title = optionDescription;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = enabled;
      cb.disabled = isDisabled;
      cb.addEventListener('change', () => {
        // Check if we're trying to enable a property without enough budget
        if (cb.checked && isProperty && !isPropertyAvailable(option.id)) {
          cb.checked = false;
          return;
        }

        state.optionStates[option.id] = cb.checked;

        // If disabling master enhancement, auto-deactivate all properties
        if (option.id === 'arcane-pool-enhance' && !cb.checked) {
          for (const opt of ATTACK_OPTIONS) {
            if (opt.category === 'arcane-pool-properties') {
              state.optionStates[opt.id] = false;
            }
          }
        }

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
      effect.innerHTML = ` — ${colorizeBonuses(getChipEffectText(optionDescription))}`;

      // Show arcane cost badge
      if (option.arcanePointCost > 0) {
        const badge = document.createElement('span');
        badge.className = 'chip-arcane-cost';
        badge.textContent = `${option.arcanePointCost}◆`;
        chip.appendChild(badge);
      }

      // Show enhancement cost badge for properties
      if (option.enhancementCost > 0) {
        const badge = document.createElement('span');
        badge.className = 'chip-enhancement-cost';
        badge.textContent = `+${option.enhancementCost}`;
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

function getDamageTypeClass(expression) {
  const ENERGY_TYPES = ['acid', 'fire', 'cold', 'electricity', 'sonic', 'force', 'bleed'];
  const lower = expression.toLowerCase();
  for (const type of ENERGY_TYPES) {
    if (lower.includes(type)) return `dmg-${type}`;
  }
  return '';
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
        <br>${atk.isSpellstrike ? 'Spellstrike' : (atk.source === 'extra' ? `${atk.label} bonus attack` : 'Iterative attack')}
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

    // Extra damage tags (Flame Arrow, Shocking Burst, etc.)
    if (atk.extraDamages?.length > 0) {
      // Sort extra damages by type (alphabetically), then by critOnly (regular before crit)
      const sortedDamages = [...atk.extraDamages].sort((a, b) => {
        const typeA = (a.type || '').toLowerCase();
        const typeB = (b.type || '').toLowerCase();
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        // Within same type, show regular damage before crit-only damage
        return (a.critOnly ? 1 : 0) - (b.critOnly ? 1 : 0);
      });

      for (const ed of sortedDamages) {
        const edRow = document.createElement('div');
        const typeClass = getDamageTypeClass(ed.type || '');
        const typeClassString = typeClass ? ` ${typeClass}` : '';
        edRow.className = `extra-dmg-row${typeClassString}`;

        edRow.innerHTML = `
          <span class="extra-dmg-tag${typeClassString}">${ed.label}</span>
          <div class="dmg-block">
            <div class="dmg-dice${typeClassString}">${ed.damage}</div>
            ${ed.critOnly ? '<div class="extra-dmg-crit"> (on crit)</div>' : ''}
            <div class="dmg-type${typeClassString}">${ed.type?.toLowerCase() || ''}</div>
          </div>
        `;

        container.appendChild(edRow);
      }
    }

    // Spell banner after spellstrike attack
    if (atk.isSpellstrike && state.selectedSpell) {
      const spell = state.selectedSpell;
      const char = state.character;
      const spellBanner = document.createElement('div');
      spellBanner.className = 'spell-banner d-flex align-items-start gap-2';

      const hasSR = spell.spellResistance;
      const srPenLine = (spell.spellResistance && char?.spellPenetrationBonus != null)
        ? `SR: ${char.spellPenetrationBonus >= 0 ? '+' : ''}${char.spellPenetrationBonus}`
        : '';
      
      const saveLine = spell.save && spell.save !== 'none' ? spell.save : '';

      const defensiveCastDC = 15 + (2 * (spell.level || 0));
      const improvedSpellCombatBonus = (state.optionStates['spell-combat'] && (char?.magusLevel ?? 0) >= 8) ? 2 : 0;
      const concBonus = (char?.concentrationBonus ?? 0) + improvedSpellCombatBonus;
      const concLine = `Cast Defensively: ${concBonus >= 0 ? '+' : ''}${concBonus} vs DC ${defensiveCastDC}`;

      const spellDamage = spell.damageExpression || (Object.hasOwn(spell, 'damageFn') ? spell.damageFn(new DamageCalculator(spell.casterLevel, spell.metamagic, spell.descriptorText)) : '');
      
      spellBanner.innerHTML = `
        <div class="spell-icon">⚡</div>
        <div class="flex-grow-1">
          <div class="d-flex align-items-baseline justify-content-between">
            <span class="spell-item-name">${spell.name}</span>
            <span class="spell-item-damage ${getDamageTypeClass(spellDamage)}">${spellDamage}</span>
          </div>
          <div class="d-flex align-items-baseline justify-content-between">
            ${hasSR ? `<div class="spell-detail">${srPenLine}</div>` : ''}
            <div class="spell-detail">${concLine}</div>
            ${saveLine ? `<div class="spell-detail">${saveLine}</div>` : ''}
          </div>
          <div class="spell-detail">${spell.description || (Object.hasOwn(spell, 'descriptionFn') ? spell.descriptionFn(spell.casterLevel, spell.metamagic || []) : '')}</div>
        </div>
      `;
      spellBanner.addEventListener('click', () => {
        state.selectedSpell = null;
        saveState();
        renderAll();
        document.getElementById('spell-selector-panel').style.display = '';
        document.getElementById('spell-selector-panel').scrollIntoView({ behavior: 'smooth' });
      });
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
  const spellstrikeSpells = filterValidSpellstrikeSpells(spells).sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  if (spellstrikeSpells.length === 0) {
    list.innerHTML = '<div class="spell-none">No spells available for Spellstrike</div>';
    return;
  }

  for (const spell of spellstrikeSpells) {
    const item = document.createElement('div');
    item.className = `spell-item${state.selectedSpell?.name === spell.name ? ' selected' : ''}${spell.castsLeft === 0 ? ' spell-depleted' : ''}`;

    const srText = spell.spellResistance ? `SR: Yes` : '';
    const saveText = spell.save && spell.save !== 'none' ? spell.save : '';
    const metaParts = [`Lvl ${spell.level}`, srText, saveText].filter(Boolean);

    item.innerHTML = `
      <div class="d-flex align-items-baseline justify-content-between">
        <span class="spell-item-name">${spell.name}</span>
        <span class="spell-item-damage">${spell.damageExpression || (Object.hasOwn(spell, 'damageFn') ? spell.damageFn(new DamageCalculator(spell.casterLevel, spell.metamagic || [], spell.descriptorText || ''), spell.metamagic || []) : '&nbsp;')}</span>
      </div>
      <span class="spell-item-meta">${metaParts.join(' · ')}</span>
      <span class="spell-item-detail">${spell.description || (Object.hasOwn(spell, 'descriptionFn') ? spell.descriptionFn(spell.casterLevel, spell.metamagic || []) : '')}</span>
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

function renderEnhancementBudget() {
  const container = document.getElementById('enhancement-budget-display');
  if (!container) return;

  const enhancementActive = state.optionStates['arcane-pool-enhance'] ?? false;
  
  if (!enhancementActive) {
    container.style.display = 'none';
    return;
  }

  const budget = calculateEnhancementBudget();
  
  container.style.display = '';
  container.innerHTML = `
    <span class="enhancement-label">Enhancement Bonus:</span>
    <span class="enhancement-total">+${budget.total}</span>
    <span class="enhancement-breakdown">
      (${budget.spent > 0 ? `${budget.spent} on properties, ` : ''}${budget.remaining} to hit/damage)
    </span>
  `;
}

function renderAll() {
  renderCharacterHeader();
  renderWeapon();
  renderArcanePool();
  renderEnhancementBudget();
  renderOptions();
  renderAttackCard();
  renderSpellSelector();
}

// ─── Apply Character ──────────────────────────────────────────────────────────

/**
 * Apply a parsed character object to state and re-render.
 *
 * preserveManualToggles = false (initial load / file upload):
 *   Full reset — all optionStates are derived from activeBuffIds and defaultEnabled.
 *   selectedSpell reset to null.
 *
 * preserveManualToggles = true (WebSocket live update):
 *   Options with a buffId are updated to match the new activeBuffIds.
 *   Options without a buffId are left as-is (user's manual state preserved).
 *   selectedSpell is preserved.
 */
function applyCharacter(character, { preserveManualToggles = false } = {}) {
  const activeBuffIds = new Set(character.activeBuffIds || []);
  const featureIds = new Set(character.characterFeatureIds || []);
  const magusLevel = character.magusLevel || 0;

  // Determine which options are unavailable for this character
  const unavailableOptionIds = new Set();
  for (const option of ATTACK_OPTIONS) {
    if (option.requiresFeatureId && !featureIds.has(option.requiresFeatureId)) {
      unavailableOptionIds.add(option.id);
    }
    if (option.requiresMinMagusLevel && magusLevel < option.requiresMinMagusLevel) {
      unavailableOptionIds.add(option.id);
    }
  }
  character.unavailableOptionIds = Array.from(unavailableOptionIds);

  const defaultEnabledOptions = [];
  const optionStates = preserveManualToggles ? { ...state.optionStates } : {};
  const previousBuffIds = new Set(state.character?.activeBuffIds || []);

  for (const option of ATTACK_OPTIONS) {
    // Unavailable options are always off
    if (unavailableOptionIds.has(option.id)) {
      optionStates[option.id] = false;
      continue;
    }

    if (option.buffId) {
      const isActive = activeBuffIds.has(option.buffId);
      if (!preserveManualToggles || previousBuffIds.has(option.buffId) !== isActive) {
        // Full reset, or buff changed in portfolio — override user's state
        optionStates[option.id] = isActive;
      }
      if (isActive) defaultEnabledOptions.push(option.id);
    } else if (!preserveManualToggles) {
      optionStates[option.id] = option.defaultEnabled;
      if (option.defaultEnabled) defaultEnabledOptions.push(option.id);
    } else {
      // Manual-only option: keep user's current state, track as default if it was on
      if (optionStates[option.id]) defaultEnabledOptions.push(option.id);
    }
  }

  // Compute weapon primary attack value and iterative attack count
  const weaponAttackValues = parseWeaponAttack(character.weapon.attack);
  const weaponPrimary = weaponAttackValues[0] || 0;
  const iterativeCount = character.charRangedAttackValues.length;

  // Detect unexplained extra attacks and auto-enable options (e.g. Rapid Shot) to account for them
  const weaponTotalAttacks = weaponAttackValues.length;
  let explainedExtras = 0;
  for (const optId of defaultEnabledOptions) {
    const opt = ATTACK_OPTIONS.find(o => o.id === optId);
    const eff = resolveOptionEffect(opt, buildOptionContext(character));
    if (eff?.extraAttacks) explainedExtras += eff.extraAttacks.length;
  }
  const unexplainedExtras = weaponTotalAttacks - iterativeCount - explainedExtras;

  let extrasToAssign = unexplainedExtras;
  for (const option of ATTACK_OPTIONS) {
    if (extrasToAssign <= 0) break;
    if (defaultEnabledOptions.includes(option.id)) continue;
    const eff = resolveOptionEffect(option, buildOptionContext(character));
    if (eff?.extraAttacks && eff.extraAttacks.length > 0) {
      optionStates[option.id] = true;
      defaultEnabledOptions.push(option.id);
      extrasToAssign -= eff.extraAttacks.length;
    }
  }

  character.weaponPrimary = weaponPrimary;
  character.iterativeCount = iterativeCount;
  character.defaultEnabledOptions = defaultEnabledOptions;

  state.character = character;
  state.optionStates = optionStates;

  if (!preserveManualToggles) {
    state.selectedSpell = null;
  }

  saveState();
}

// ─── WebSocket live watch ──────────────────────────────────────────────────────

let wsReconnectDelay = 1000;
let wsInstance = null;

function setWatchIndicator(status) {
  const el = document.getElementById('watch-indicator');
  if (!el) return;
  el.dataset.status = status;
  el.style.display = status ? '' : 'none';
  const labels = { live: '● Live', reconnecting: '● Connecting…', lost: '● File moved' };
  el.textContent = labels[status] ?? '';
}

function connectWebSocket() {
  if (wsInstance && wsInstance.readyState <= WebSocket.OPEN) wsInstance.close();

  const ws = new WebSocket(`ws://${location.host}`);
  wsInstance = ws;
  setWatchIndicator('reconnecting');

  ws.addEventListener('open', () => {
    wsReconnectDelay = 1000;
    setWatchIndicator('live');
  });

  ws.addEventListener('message', ({ data }) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'character-update') {
        applyCharacter(msg.character, { preserveManualToggles: true });
        renderAll();
        // Brief flash on the indicator to signal an update arrived
        setWatchIndicator('live');
      } else if (msg.type === 'watch-lost') {
        setWatchIndicator('lost');
      }
    } catch {
      // Malformed message — ignore
    }
  });

  ws.addEventListener('close', () => {
    setWatchIndicator('reconnecting');
    setTimeout(connectWebSocket, wsReconnectDelay);
    wsReconnectDelay = Math.min(wsReconnectDelay * 2, 30000);
  });

  ws.addEventListener('error', () => ws.close());
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
    applyCharacter(character, { preserveManualToggles: false });
    state.portfolioSource = { type: 'upload' };
    saveState();

    statusEl.textContent = `✓ Loaded: ${character.name}`;
    statusEl.className = 'upload-status success';

    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('app-section').style.display = '';
    setWatchIndicator(null);

    renderAll();
  } catch (err) {
    statusEl.textContent = `✗ Error: ${err.message}`;
    statusEl.className = 'upload-status error';
  }
}

// ─── Watch Path ────────────────────────────────────────────────────────────────

async function watchPath(path, filename) {
  const filePath = joinBrowserPath(path, filename);
  const statusEl = document.getElementById('watch-status');
  statusEl.textContent = 'Loading…';
  statusEl.className = 'upload-status loading';

  try {
    const response = await fetch('/api/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const character = await response.json();
    applyCharacter(character, { preserveManualToggles: false });
    state.portfolioSource = { type: 'local', path: filePath };
    state.lastPortfolioDirectory = path;
    saveState();

    statusEl.textContent = '';
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('app-section').style.display = '';

    connectWebSocket();
    renderAll();
  } catch (err) {
    statusEl.textContent = `✗ ${err.message}`;
    statusEl.className = 'upload-status error';
  }
}

// ─── File Browser ────────────────────────────────────────────────────────────

function joinBrowserPath(dir, name) {
  const sep = dir.includes('\\') ? '\\' : '/';
  return dir.endsWith(sep) ? dir + name : dir + sep + name;
}

async function browseTo(dirPath) {
  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(dirPath)}`);
    if (!res.ok) {
      const err = await res.json();
      console.warn('browse error:', err.error);
      return;
    }
    browseState = await res.json();
    renderBrowser();
  } catch (err) {
    console.warn('browse failed:', err);
  }
}

function renderBrowser() {
  if (!browseState) return;

  const pathInput = document.getElementById('watch-path-input');
  if (pathInput) pathInput.value = browseState.path;

  const upBtn = document.getElementById('browser-up-btn');
  if (upBtn) upBtn.disabled = browseState.parent === null;

  const list = document.getElementById('browser-list');
  if (!list) return;
  list.innerHTML = '';

  for (const dir of browseState.dirs) {
    const btn = document.createElement('button');
    btn.className = 'browser-item is-dir';
    btn.textContent = '\uD83D\uDCC1 ' + dir;
    btn.addEventListener('click', () => browseTo(joinBrowserPath(browseState.path, dir)));
    list.appendChild(btn);
  }

  if (browseState.dirs.length > 0 && browseState.files.length > 0) {
    const hr = document.createElement('div');
    hr.className = 'browser-divider';
    list.appendChild(hr);
  }

  for (const file of browseState.files) {
    const btn = document.createElement('button');
    btn.className = 'browser-item is-file';
    btn.textContent = '\uD83D\uDCC4 ' + file;
    btn.addEventListener('click', () => watchPath(browseState.path, file));
    list.appendChild(btn);
  }
}

async function initBrowser() {
  try {
    const shortcuts = await fetch('/api/browse/shortcuts').then(r => r.json());
    const grid = document.getElementById('browser-shortcuts');
    if (grid) {
      grid.innerHTML = '';
      for (const sc of shortcuts) {
        const btn = document.createElement('button');
        btn.className = 'shortcut-btn';
        btn.textContent = sc.label;
        btn.addEventListener('click', () => browseTo(sc.path));
        grid.appendChild(btn);
      }
    }
    // Auto-navigate to Hero Lab if present, else last used path, or finally the first shortcut
    const target = shortcuts.find(s => s.label === 'Hero Lab') || state.lastPortfolioDirectory || shortcuts[0];
    if (target) browseTo(target.path);
  } catch {
    // ignore — browser panel stays empty
  }
}

// ─── Bootstrap the app ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Try to restore from localStorage
    if (loadState() && state.character) {
      document.getElementById('upload-section').style.display = 'none';
      document.getElementById('app-section').style.display = '';
      renderAll();

      // If the portfolio was a watched local file, try to resume watching it
      if (state.portfolioSource?.type === 'local' && state.portfolioSource.path) {
        const input = document.getElementById('watch-path-input');
        if (input) input.value = state.portfolioSource.path;
        try {
          const response = await fetch('/api/watch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: state.portfolioSource.path }),
          });
          if (response.ok) {
            const character = await response.json();
            applyCharacter(character, { preserveManualToggles: true });
            renderAll();
            connectWebSocket();
          }
        } catch {
          // Server not ready or path gone — silently continue with cached data
        }
      }
    } else {
      // No cached state — check if the server is already watching (e.g. server restarted,
      // browser refreshed without localStorage) and reconnect if so
      try {
        const status = await fetch('/api/watch-status').then(r => r.json());
        if (status.watching) connectWebSocket();
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.error('Failed to load state:', err);
    console.error('Clearing corrupted state and starting fresh.');
    clearState();
    location.reload();
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

  // File browser — Up button
  document.getElementById('browser-up-btn')?.addEventListener('click', () => {
    if (browseState?.parent) browseTo(browseState.parent);
  });

  // Path bar — Enter to smart-navigate
  document.getElementById('watch-path-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      if (val.toLowerCase().endsWith('.por')) {
        const path = val.substring(0, val.lastIndexOf('/') || val.lastIndexOf('\\'));
        watchPath(path, val);
      } else if (val) {
        browseTo(val);
      }
    }
  });

  // Initialize file browser
  initBrowser();

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
    for (const option of ATTACK_OPTIONS) {
      // Reset per-attack decisions and arcane point costs
      // But preserve arcane pool enhancement (lasts 1 minute, not just 1 round)
      if (option.category === 'arcane-pool' || option.category === 'arcane-pool-properties') {
        continue; // Preserve enhancement options across rounds
      }
      if (option.arcanePointCost > 0 || option.category === 'per-attack') {
        state.optionStates[option.id] = false;
      }
    }
    saveState();
    renderAll();
    document.getElementById('options-grid-per-attack').scrollIntoView({ behavior: 'smooth' });
  });
});
