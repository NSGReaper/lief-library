/**
 * Spells Configuration
 * 
 * Whitelist of spells valid for Spellstrike.
 * Only spells in this list can be used with the Spellstrike option.
 */

import { buildDamageString } from './utilities.js';

/**
 * Metamagic feats that can be applied to Spellstrike spells.
 * Hero Lab encodes a metamagic-enhanced spell as "Feat Name (Base Spell Name)".
 */
const METAMAGIC_FEATS = [
  'Intensify Spell',
  'Empower Spell',
  'Maximise Spell',
  'Maximize Spell',
];

/**
 * Map a metamagic feat name to a short display label.
 */
function getMetamagicLabel(feat) {
  const labels = {
    'Intensify Spell': 'Intensified',
    'Empower Spell': 'Empowered',
    'Maximise Spell': 'Maximised',
    'Maximize Spell': 'Maximised',
  };
  return labels[feat] || feat;
}

/**
 * Build a display name for a spell, appending metamagic labels where present.
 * e.g. buildSpellDisplayName('Shocking Grasp', ['Intensify Spell']) → 'Shocking Grasp (Intensified)'
 */
export function buildSpellDisplayName(baseName, metamagic) {
  if (!metamagic || metamagic.length === 0) return baseName;
  const labels = metamagic.map(getMetamagicLabel);
  return `${baseName} (${labels.join(', ')})`;
}

/**
 * Parse a spell name that may include a metamagic prefix (Hero Lab format) or
 * a count suffix (e.g., "(x3)").
 *
 * Hero Lab encodes metamagic spells as "Feat Name (Base Spell Name)".
 *   "Intensify Spell (Shocking Grasp)" → { baseName: 'Shocking Grasp', metamagic: 'Intensify Spell' }
 *
 * Count suffixes are stripped:
 *   "Snowball (x3)" → { baseName: 'Snowball', metamagic: null }
 */
function parseSpellName(spellName) {
  const trimmed = spellName.trim();
  for (const feat of METAMAGIC_FEATS) {
    const prefix = feat + ' (';
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase()) && trimmed.endsWith(')')) {
      const baseName = trimmed.slice(prefix.length, -1).trim();
      return { baseName, metamagic: feat };
    }
  }
  // Strip count/qualifier in parentheses, e.g. "(x3)"
  const baseName = trimmed.replace(/\s*\(.*\)$/, '');
  return { baseName, metamagic: null };
}

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
    level: 0,
    school: 'conjuration',
    description: '',
    attackType: 'ranged',
    spellResistance: false,
    damageExpression: '1d3 acid',
  },
  // 1st Level
  'Shocking Grasp': {
    name: 'Shocking Grasp',
    level: 1,
    school: 'evocation',
    description: '+3 attack if target wearing or carrying metal',
    attackType: 'melee',
    spellResistance: true,
    damageFn: (dmg) => dmg.die(6).perCasterLevel().maxCasterLevel(5).type('electricity').calculate(),
  },

  'Snowball': {
    name: 'Snowball',
    level: 1,
    school: 'evocation',
    description: '',
    attackType: 'ranged',
    spellResistance: true,
    damageFn: (dmg) => dmg.die(6).perCasterLevel().maxCasterLevel(5).type('cold').calculate(),
  },
  
  'Frostbite': {
    name: 'Frostbite',
    level: 1,
    school: 'transmutation',
    attackType: 'melee',
    spellResistance: true,
    damageFn: (dmg) => dmg.die(1).flatDice(1).casterLevelBonus(1).type('cold').calculate(),
    descriptionFn: (CL) => `Target fatigued. Use attack up to ${CL} times.`
  },

  'Corrosive Touch': {
    name: 'Corrosive Touch',
    level: 1,
    school: 'conjuration',
    description: '',
    attackType: 'melee',
    spellResistance: true,
    damageFn: (dmg) => dmg.die(4).perCasterLevel().maxCasterLevel(5).type('acid').calculate()
  },

  // 2nd Level
  'Acid Arrow': {
    name: 'Acid Arrow',
    level: 2,
    school: 'conjuration',
    attackType: 'ranged',
    spellResistance: true,
    damageExpression: '2d4 acid damage',
    descriptionFn: (CL) => `Damage repeats every round for ${Math.floor(CL/3)} rounds.`
  },

  'Touch of Gracelessness': {
    name: 'Touch of Gracelessness',
    level: 2,
    school: 'transmutation',
    attackType: 'melee',
    spellResistance: true,
    damageExpression: '',
    descriptionFn: (CL) => `1d6+${Math.min(5, Math.floor(CL/2))} dex penalty for ${CL} rounds. Fort save for half.`
  },

  'Frigid Touch': {
    name: 'Frigid Touch',
    level: 2,
    damageExpression: '4d6 cold',
    school: 'evocation',
    description: 'Target staggered for 1 round',
    attackType: 'melee',
    spellResistance: true
  },

  'Scorching Ray': {
    name: 'Scorching Ray',
    level: 2,
    damageExpression: '4d6 fire',
    school: 'evocation',
    attackType: 'ranged',
    descriptionFn: (CL) => `Fire ${Math.max(4, Math.floor((CL - 3) / 4))} rays`,
    spellResistance: true
  },

  // 3rd Level
  'Vampiric Touch': {
    name: 'Vampiric Touch',
    level: 3,
    damageExpression: '5d6',
    school: 'necromancy',
    description: 'Gain damage dealt as temporary HP',
    attackType: 'melee',
    damageFn: (dmg) => dmg.die(6).perTwoCasterLevels().maxCasterLevel(10).calculate(),
    spellResistance: true
  },

  'Force Punch': {
    name: 'Force Punch',
    level: 3,
    school: 'evocation',
    attackType: 'melee',
    damageFn: (dmg) => dmg.die(4).perCasterLevel().maxCasterLevel(10).type('force').calculate(),
    descriptionFn: (CL) => `Target pushed ${5 * Math.floor(CL / 2)} feet away`,
    spellResistance: true
  }
};

/**
 * Case-insensitive lookup map (lowercase key → spell definition).
 * Built once at module load time.
 */
const SPELLSTRIKE_BY_LOWERCASE = Object.fromEntries(
  Object.entries(SPELLSTRIKE_SPELLS).map(([key, value]) => [key.toLowerCase(), value])
);

/**
 * Get all valid spellstrike spells
 */
export function getSpellstrikeSpells() {
  return Object.values(SPELLSTRIKE_SPELLS);
}

/**
 * Get spells by level
 */
export function getSpellsByLevel(level) {
  return Object.values(SPELLSTRIKE_SPELLS)
    .filter(spell => spell.level === level);
}

/**
 * Normalize a raw spell name (from portfolio) to the canonical base spell name
 * by stripping metamagic prefixes and count suffixes.
 */
function normalizeSpellName(spellName) {
  return parseSpellName(spellName).baseName;
}

/**
 * Check if a spell is valid for spellstrike (case-insensitive).
 * Handles metamagic prefixes such as "Intensify Spell (Shocking Grasp)".
 */
export function isValidSpellstrikeSpell(spellName) {
  const { baseName } = parseSpellName(spellName);
  return baseName.toLowerCase() in SPELLSTRIKE_BY_LOWERCASE;
}

/**
 * Get spell definition by name (case-insensitive).
 * Handles metamagic prefixes — the returned spell will include a `metamagic` array
 * and a `displayName` showing the applied metamagic.
 */
export function getSpellByName(spellName) {
  const raw = typeof spellName === 'string' ? spellName : spellName?.name;
  if (!raw) return null;
  const { baseName, metamagic } = parseSpellName(raw);
  const spell = SPELLSTRIKE_BY_LOWERCASE[baseName.toLowerCase()];
  if (!spell) return null;
  const metamagicList = metamagic ? [metamagic] : [];
  return {
    ...spell,
    metamagic: metamagicList,
    displayName: buildSpellDisplayName(spell.name, metamagicList),
  };
}

/**
 * Filter character's prepared spells to only include spellstrike-valid spells.
 * Portfolio data (level, casterLevel, school, spellResistance) takes precedence
 * over any hardcoded values in SPELLSTRIKE_SPELLS.
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
    .map(spell => {
      const { baseName, metamagic } = parseSpellName(spell.name);
      const spellDef = SPELLSTRIKE_BY_LOWERCASE[baseName.toLowerCase()];
      const metamagicList = metamagic ? [metamagic] : [];

      return {
        // Gameplay mechanics from SPELLSTRIKE_SPELLS (damageFn, attackType, etc.)
        ...spellDef,
        // Portfolio is source of truth for these attributes
        name: baseName,
        displayName: buildSpellDisplayName(baseName, metamagicList),
        level: spell.level,
        casterLevel: spell.casterLevel,
        school: spell.school,
        spellResistance: spell.spellResistance === 'yes',
        dc: spell.dc,
        castTime: spell.castTime,
        castsLeft: spell.castsLeft,
        unlimited: spell.unlimited,
        metamagic: metamagicList,
      };
    });
}

export class DamageCalculator {
    constructor(casterLevel, metamagic = []) {
        this._casterLevel = parseInt(casterLevel) || 0;
        this._metamagic = metamagic;
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

    casterLevelBonus(bonusPerLevel) {
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
            const isIntensified = this._metamagic.includes('Intensify Spell');
            numDice = Math.min(numDice, isIntensified ? this._maxCasterLevel + 5 : this._maxCasterLevel);
        }
        if (this._casterLevelBonus) {
            bonus += Math.floor(this._casterLevelBonus * this._casterLevel);
        }

        const isMaximised = this._metamagic.includes('Maximise Spell') || this._metamagic.includes('Maximize Spell');
        const isEmpowered = this._metamagic.includes('Empower Spell');
        const dmgTypeString = this._dmgType ? ` ${this._dmgType}` : '';

        if (isMaximised && isEmpowered) {
            // Both: maximise all dice then apply +50%
            const maxTotal = Math.floor((numDice * this._dieSize + bonus) * 1.5);
            return `${maxTotal}${dmgTypeString} [maximised, empowered]`;
        }
        if (isMaximised) {
            const maxTotal = numDice * this._dieSize + bonus;
            return `${maxTotal}${dmgTypeString} [maximised]`;
        }

        const baseExpr = buildDamageString(`${numDice}d${this._dieSize}`, bonus);
        if (isEmpowered) {
            return `${baseExpr}${dmgTypeString} ×1.5`;
        }

        return baseExpr + dmgTypeString;
    }
}