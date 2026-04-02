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
 *    extraDamage - array of additional damage entries applied to every attack; each item:
 *      { label: string, expression: string, critOnly?: boolean }
 *      label      = source name shown in the UI (e.g. 'Flame Arrow')
 *      expression = damage string shown in the UI (e.g. '1d6 fire', '1d10 electricity')
 *      critOnly   = if true, damage only applies on a critical hit (shown with '(on crit)' annotation)
 *
 * Damage type colour conventions (used by getDamageTypeClass in app.js):
 *   Energy:   acid | fire | cold | electricity | sonic | force | bleed
 *   Physical: bludgeoning (B) | piercing (P) | slashing (S)  → default colour, abbreviated
 *   Untyped:  omit type word entirely                         → default colour
 */
export const ATTACK_OPTIONS = [
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
      extraAttacks: [
        { hitBonusOffset: 0, label: 'Spellstrike' },
      ],
    },
  },
  {
    id: 'spell-combat',
    name: 'Spell Combat',
    category: 'per-attack',
    buffId: 'xAttPenSit',
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
    buffId: 'fRapidShot',
    defaultEnabled: false,
    arcanePointCost: 0,
    description: 'Fire an extra arrow; −2 to all attacks',
    effect: {
      hitBonus: -2,
      extraAttacks: [
        { hitBonusOffset: 0, label: 'Rapid Shot' },
      ],
    },
  },
  {
    id: 'deadly-aim',
    name: 'Deadly Aim',
    category: 'per-attack',
    buffId: 'fDeadAim',
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '−2 to hit for +4 damage',
    effect: {
      hitBonus: -2,
      damageBonus: 4,
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

  {
    id: 'arcane-accuracy',
    name: 'Arcane Accuracy',
    category: 'per-attack',
    buffId: 'cMagArcAcc',
    defaultEnabled: false,
    arcanePointCost: 1,
    description: 'Expend 1 arcane pool point: +INT insight bonus to all attacks for 1 round',
    effect: {
      hitBonusFromStat: 'intMod',
    },
  },

  /* We need a different way to handle arcane pool, as the enhancement bonus increases for every four magus levels after the 1st, and it can spent to add weapon special abilities instead of attack bonuses.
  {
    id: 'arcane-pool-enhance',
    name: 'Arcane Pool: Enhance',
    category: 'per-attack',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 1,
    description: 'Expend 1 arcane pool point: +1 enhancement bonus to weapon for 1 minute',
    effect: {
      hitBonus: 1,
      damageBonus: 1,
    },
  },
  */

  // ─── Conditional Buffs ───────────────────────────────────────────────────
  {
    id: 'point-blank-shot',
    name: 'Point-Blank Shot',
    category: 'conditional',
    buffId: 'fPointBlnk',
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '+1 to hit and damage when target is within 30 ft',
    alignment: 'good',
    effect: {
      hitBonus: 1,
      damageBonus: 1,
    },
  },
  {
    id: 'target-prone',
    name: 'Target Prone',
    category: 'conditional',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '-4 to hit against prone targets',
    alignment: 'bad',
    effect: {
      hitBonus: -4,
    },
  },

  /*
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
  */

  // ─── Active Buffs ────────────────────────────────────────────────────────
  {
    id: 'flame-arrow',
    name: 'Flame Arrow',
    category: 'buff',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: 'Each arrow deals +1d6 fire damage',
    effect: {
      extraDamage: [
        { label: 'Flame Arrow', damage: '1d6', type: 'fire' },
      ],
    },
  },

  // ─── Locked Buffs ────────────────────────────────────────────────────────
  // These are not user-toggleable since they're already tracked by the presence of their corresponding buff in lead1.xml, but we want to include them here so their effects are properly calculated and displayed in the UI when active.
  {
    id: 'haste',
    name: 'Haste',
    category: 'locked',
    buffId: 'pHaste',
    defaultEnabled: false,
    arcanePointCost: 0,
    description: 'Extra attack at highest BAB',
    effect: {
      hitBonus: 1,
      extraAttacks: [
        { hitBonusOffset: 0, label: 'Haste' },
      ],
    },
  },

  /*
  {
    id: 'shocking-burst',
    name: 'Shocking Burst',
    category: 'buff',
    buffId: null,
    defaultEnabled: false,
    arcanePointCost: 0,
    description: 'Each arrow deals +1d6 electricity; +1d10 electricity on a critical hit',
    effect: {
      extraDamage: [
        { label: 'Shocking Burst', damage: '1d6', type: 'electricity' },
        { label: 'Shocking Burst', damage: '1d10', type: 'electricity', critOnly: true },
      ],
    },
  },*/

  // Others to consider adding:
  // These are longer duration buffs that Hero Lab already applies the bonuses from, but if we wanted to support them as toggleable options:
  /* 
  
  */
 /* 
  {
    id: 'inspire-courage',
    name: 'Inspire Courage',
    category: 'conditional',
    buffId: 'pCourage',
    defaultEnabled: false,
    arcanePointCost: 0,
    description: '+2 to hit and damage from Bardic Inspire Courage',
    effect: {
      hitBonus: 2,
      damageBonus: 2,
    },
    },
  },
  */
];
