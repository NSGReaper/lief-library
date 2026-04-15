/**
 * Spells Configuration
 * 
 * Whitelist of spells valid for Spellstrike.
 * Only spells in this list can be used with the Spellstrike option.
 */

import { buildDamageString } from './utilities.js';

const METAMAGIC_NAMES = [
  'Empowered',
  'Maximized',
  'Intensified'
]

export const SPELLSTRIKE_SPELLS = {
  // Cantrips
  /* {
            "name": "Acid Splash",
            "level": 0,
            "casterLevel": 8,
            "castTime": "1 action",
            "range": "close (25 + 5 ft./2 levels)",
            "dc": 15,
            "school": "Conjuration, Earth Elemental",
            "spellResistance": "no",
            "save": "none",
            "castsLeft": null,
            "unlimited": true
        }
            */

  'Acid Splash': {
    name: 'Acid Splash',
    description: '',
    attackType: 'ranged',
    damageExpression: '1d3 acid',
  },

  // 1st Level
  'Chill Touch': {
    name: 'Chill Touch',
    attackType: 'melee',
    damageExpression: '1d6 negative energy',
    descriptionFn: (CL) => `Target also takes 1 point of strength damage unless it makes a Fort save. Use attack up to ${CL} times.`
  },

  'Shocking Grasp': {
    name: 'Shocking Grasp',
    description: '+3 attack if target wearing or carrying metal',
    attackType: 'melee',
    damageFn: (dmg) => dmg.die(6).perCasterLevel().maxCasterLevel(5).type('electricity').calculate(),
  },

  'Snowball': {
    name: 'Snowball',
    description: '',
    attackType: 'ranged',
    damageFn: (dmg) => dmg.die(6).perCasterLevel().maxCasterLevel(5).type('cold').calculate(),
  },
  
  'Frostbite': {
    name: 'Frostbite',
    attackType: 'melee',
    damageFn: (dmg) => dmg.die(1).flatDice(1).casterLevelBonus(1).type('cold').calculate(),
    descriptionFn: (CL) => `Target fatigued. Use attack up to ${CL} times.`
  },

  'Corrosive Touch': {
    name: 'Corrosive Touch',
    description: '',
    attackType: 'melee',
    damageFn: (dmg) => dmg.die(4).perCasterLevel().maxCasterLevel(5).type('acid').calculate()
  },

  'Touch of Gracelessness': {
    name: 'Touch of Gracelessness',
    attackType: 'melee',
    damageExpression: '',
    descriptionFn: (CL) => `1d6+${Math.min(5, Math.floor(CL/2))} dex penalty for ${CL} rounds. Save for half.`
  },

  'Ray of Enfeeblement': {
    name: 'Ray of Enfeeblement',
    attackType: 'ranged',
    descriptionFn: (CL) => `1d6+${Math.min(5, Math.floor(CL/2))} strength penalty for ${CL} rounds. Save for half.`
  },

  // 2nd Level
  'Acid Arrow': {
    name: 'Acid Arrow',
    attackType: 'ranged',
    damageFn: (dmg) => dmg.die(4).flatDice(2).calculate(),
    descriptionFn: (CL) => `Damage repeats every round for ${Math.floor(CL/3)} rounds.`
  },

  'Frigid Touch': {
    name: 'Frigid Touch',
    damageExpression: '4d6 cold',
    description: 'Target staggered for 1 round',
    attackType: 'melee',
  },

  'Scorching Ray': {
    name: 'Scorching Ray',
    damageExpression: '4d6 fire',
    attackType: 'ranged',
    descriptionFn: (CL) => `Fire ${Math.max(4, Math.floor((CL - 3) / 4))} rays`,
  },

  // 3rd Level
  'Vampiric Touch': {
    name: 'Vampiric Touch',
    damageExpression: '5d6',
    description: 'Gain damage dealt as temporary HP',
    attackType: 'melee',
    damageFn: (dmg) => dmg.die(6).perTwoCasterLevels().maxCasterLevel(10).calculate(),
  },

  'Force Punch': {
    name: 'Force Punch',
    attackType: 'melee',
    damageFn: (dmg) => dmg.die(4).perCasterLevel().maxCasterLevel(10).type('force').calculate(),
    descriptionFn: (CL) => `Target pushed ${5 * Math.floor(CL / 2)} feet away`,
  }
};

/**
 * Get all valid spellstrike spells
 */
export function getSpellstrikeSpells() {
  return Object.values(SPELLSTRIKE_SPELLS);
}

/**
 * Check if a spell is valid for spellstrike
 */
export function isValidSpellstrikeSpell(spellName) {
    const normalizedSpellName = normalizeSpellName(spellName);
    return Object.keys(SPELLSTRIKE_SPELLS).some(
      k => k.toLowerCase() === normalizedSpellName.toLowerCase()
    );
}

function parseSpellName(rawName) {
  const metamagics = [];
  let remaining = rawName;
  let found = true;
  while (found) {
    found = false;
    for (const meta of METAMAGIC_NAMES) {
      const regex = new RegExp(`^${meta}\\s+`, 'i');
      if (regex.test(remaining)) {
        metamagics.push(meta);
        remaining = remaining.replace(regex, '').trim();
        found = true;
        break;
      }
    }
  }
  const baseName = remaining.replace(/\s*\(.*\)$/, '').trim();
  return { baseName, metamagics };
}

function normalizeSpellName(spellName) {
  return parseSpellName(spellName).baseName;
}

function buildSpellStrikeSpellDisplayName(spellstrikeSpell) {
  return [...spellstrikeSpell.metamagic, spellstrikeSpell.name].join(' ');
}

/**
 * Get spell by name
 */
export function getSpellByName(spellName) {
  const { baseName, metamagics } = parseSpellName(spellName);
  const key = Object.keys(SPELLSTRIKE_SPELLS).find(
    k => k.toLowerCase() === baseName.toLowerCase()
  );
  let spellstrikeSpell = key ? { ...SPELLSTRIKE_SPELLS[key], metamagic: metamagics } : null;
  if (spellstrikeSpell) {
    spellstrikeSpell.name = buildSpellStrikeSpellDisplayName(spellstrikeSpell);
  }
  return spellstrikeSpell;
}

/**
 * Filter character's prepared spells to only include spellstrike-valid spells
 * 
 * @param {Array} characterSpells - Spells from character data
 * @returns {Array} Filtered spells valid for spellstrike
 */
export function filterValidSpellstrikeSpells(characterSpells) {
  if (!characterSpells || !Array.isArray(characterSpells)) {
    return [];
  }

  return characterSpells
    .filter(spell => isValidSpellstrikeSpell(spell.name))
    .map(spell => ({
        name: normalizeSpellName(spell.name),
        ...spell,
        ...getSpellByName(spell.name),
    }));
}

export class DamageCalculator {
    constructor(casterLevel, metamagic = [], defaultType = '') {
        this._casterLevel = parseInt(casterLevel) || 0;
        this._metamagic = metamagic;
        this._defaultDmgType = defaultType;
    }
  
    die(dieSize) {
        this._dieSize = dieSize;
        return this;
    }

    flatDice(numDice) {
        this._numDice = numDice;
        return this;
    }

    flatBonus(bonus) {
        this._flatBonus = bonus;
        return this;
    }

    bonusPerCasterLevel(bonusPerLevel) {
        this._casterLevelBonus = bonusPerLevel;
        return this;
    }

    perCasterLevel() {
        this._nthCasterLevel = 1;
        return this;
    }

    perTwoCasterLevels() {
        this._nthCasterLevel = 2;
        return this;
    }

    everyNCasterLevelsAfter(n, after) {
        this._nthCasterLevel = n;
        this._afterCasterLevel = after;
        return this;
    }

    maxCasterLevel(max) {
        this._maxCasterLevel = max;
        return this;
    }

    type(dmgType) {
        this._dmgType = dmgType;
        return this;
    }

    calculate() {
        let numDice = this._numDice || 0;
        let bonus = this._flatBonus || 0;
        if (this._nthCasterLevel) {
            if (this._afterCasterLevel) {
                if (this._casterLevel > this._afterCasterLevel) {
                    numDice = Math.floor((this._casterLevel - this._afterCasterLevel) / this._nthCasterLevel);
                }
            } else {
                numDice = Math.floor(this._casterLevel / this._nthCasterLevel);
            }
        }
        if (this._maxCasterLevel) {
            numDice = Math.min(numDice, this._isIntensified() ? this._maxCasterLevel + 5 : this._maxCasterLevel);
        }
        if (this._casterLevelBonus) {
            bonus += Math.floor(this._casterLevelBonus * this._casterLevel);
        }
        const dmgTypeString = (this._dmgType || this._defaultDmgType) ? ` ${this._dmgType || this._defaultDmgType}` : '';
        if (this._isMaximized() && this._isEmpowered()) {
          return (numDice * this._dieSize + bonus) + ' + 0.5 * ' + buildDamageString(`${numDice}d${this._dieSize}`, bonus) + dmgTypeString;
        }
        if (this._isMaximized()) {
          return (numDice * this._dieSize + bonus) + dmgTypeString;
        } if (this._isEmpowered()) {
          return '1.5 * ' + buildDamageString(`${numDice}d${this._dieSize}`, bonus) + dmgTypeString;
        }
        return buildDamageString(`${numDice}d${this._dieSize}`, bonus) + dmgTypeString;
    }

    _isIntensified() {
        return this._metamagic.some((meta) => meta.toLowerCase() === 'intensified');
    }

    _isEmpowered() {
        return this._metamagic.some((meta) => meta.toLowerCase() === 'empowered');
    }

    _isMaximized() {
        return this._metamagic.some((meta) => meta.toLowerCase() === 'maximized');
    }
}