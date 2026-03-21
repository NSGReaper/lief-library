/**
 * Attack options definitions for the Eldritch Archer Magus.
 *
 * Each option describes an attack modifier the player can toggle during a turn.
 *
 * Structure:
 *  id         - unique identifier
 *  name       - display name
 *  category   - grouping: 'per-attack' | 'swift-buff' | 'conditional'
 *  buffId     - Hero Lab buff thing-ID (optional) — if set, the option is defaultEnabled
 *               when that buff is active in lead1.xml
 *  defaultEnabled - initial state if no buffId is provided
 *  arcanePointCost - arcane pool points consumed (only for single-round / single-use options)
 *  effect     - describes the mechanical effect (used by the calculation engine)
 *    hitBonus   - flat bonus/penalty applied to ALL attacks
 *    extraAttacks - array of extra attacks added; each item:
 *      { atIndexOffset: number, hitBonusOffset: number, label: string }
 *      atIndexOffset = which base attack to clone (0 = primary / highest BAB)
 *      hitBonusOffset = additional offset for THIS extra attack (on top of hitBonus)
 *    removeIterativeAttacks - if true, remove all iterative (non-primary) attacks
 *    isSpellstrike - marks the primary attack as a Spellstrike delivery
 */
const ATTACK_OPTIONS = [
  // ─── Per-Attack Decisions ────────────────────────────────────────────────
  {
    id: 'spellstrike',
    name: 'Spellstrike',
    category: 'per-attack',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: 'Deliver a prepared spell through your first ranged attack',
    effect: {
      isSpellstrike: true,
    },
  },
  {
    id: 'spell-combat',
    name: 'Spell Combat',
    category: 'per-attack',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: 'Cast a spell and make ranged attacks; −2 to all attacks',
    effect: {
      hitBonus: -2,
    },
  },
  {
    id: 'rapid-shot',
    name: 'Rapid Shot',
    category: 'per-attack',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: 'Fire an extra arrow; −2 to all attacks',
    effect: {
      hitBonus: -2,
      extraAttacks: [
        { atIndexOffset: 0, hitBonusOffset: 0, label: 'Rapid Shot' },
      ],
    },
  },
  {
    id: 'deadly-aim',
    name: 'Deadly Aim',
    category: 'per-attack',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '−3 to hit for +6 damage',
    effect: {
      hitBonus: -3,
      damageBonus: 6,
    },
  },
  {
    id: 'manyshot',
    name: 'Manyshot',
    category: 'per-attack',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: 'First attack fires two arrows (double damage on first hit)',
    effect: {
      firstAttackDoubleArrow: true,
    },
  },

  // ─── Swift-Action Buffs (1 round, may cost arcane points) ────────────────
  {
    id: 'arcane-accuracy',
    name: 'Arcane Accuracy',
    category: 'swift-buff',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 1,
    description: 'Expend 1 arcane pool point: +INT insight bonus to all attacks for 1 round',
    effect: {
      hitBonusFromStat: 'intMod',
    },
  },
  {
    id: 'arcane-pool-enhance',
    name: 'Arcane Pool: Enhance',
    category: 'swift-buff',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 1,
    description: 'Expend 1 arcane pool point: +1 enhancement bonus to weapon for 1 minute',
    effect: {
      hitBonus: 1,
      damageBonus: 1,
    },
  },
  {
    id: 'haste',
    name: 'Haste',
    category: 'swift-buff',
    buffId: 'pHaste',
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '+1 to hit, extra attack at highest BAB (from Haste spell)',
    effect: {
      hitBonus: 1,
      extraAttacks: [
        { atIndexOffset: 0, hitBonusOffset: 0, label: 'Haste' },
      ],
    },
  },

  // ─── Conditional Buffs ───────────────────────────────────────────────────
  {
    id: 'point-blank-shot',
    name: 'Point-Blank Shot',
    category: 'conditional',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '+1 to hit and damage when target is within 30 ft',
    effect: {
      hitBonus: 1,
      damageBonus: 1,
    },
  },
  {
    id: 'favored-enemy',
    name: 'Favored Enemy',
    category: 'conditional',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '+2 to hit and damage against a favored enemy type',
    effect: {
      hitBonus: 2,
      damageBonus: 2,
    },
  },
  {
    id: 'flanking',
    name: 'Flanking',
    category: 'conditional',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '+2 to hit when flanking',
    effect: {
      hitBonus: 2,
    },
  },
  {
    id: 'target-metal-armour',
    name: 'Target: Metal Armour',
    category: 'conditional',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '+3 to Spellstrike Shocking Grasp hit when target wears metal armour',
    effect: {
      spellstrikeHitBonus: 3,
    },
  },
];
