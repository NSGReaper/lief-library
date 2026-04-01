/**
 * Spells Configuration
 * 
 * Whitelist of spells valid for Spellstrike.
 * Only spells in this list can be used with the Spellstrike option.
 */




export const SPELLSTRIKE_SPELLS = {
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

  'Touch of Gracelesness': {
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
 * Check if a spell is valid for spellstrike
 */
export function isValidSpellstrikeSpell(spellName) {
    const normalizedSpellName = normalizeSpellName(spellName);
    return SPELLSTRIKE_SPELLS.hasOwnProperty(normalizedSpellName);
}

function normalizeSpellName(spellName) {
  return spellName.replace(/\s*\(.*\)$/, ''); // Remove parenthetical info for matching
}

/**
 * Get spell by name
 */
export function getSpellByName(spellName) {
  const normalizedSpellName = normalizeSpellName(spellName);
  return SPELLSTRIKE_SPELLS[normalizedSpellName] || null;
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
            const isIntensified = this._metamagic.includes('Intensified Spell');
            numDice = Math.min(numDice, isIntensified ? this._maxCasterLevel + 5 : this._maxCasterLevel);
        }
        if (this._casterLevelBonus) {
            bonus += Math.floor(this._casterLevelBonus * this._casterLevel);
        }
        const bonusString = bonus ? ` + ${bonus}` : '';
        const dmgTypeString = this._dmgType ? ` ${this._dmgType}` : '';
        return `${numDice}d${this._dieSize}${bonusString}${dmgTypeString}`;
    }
}