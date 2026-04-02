
export function formatBonus(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Parse a weapon attack string like "+15/+15/+15/+10" into an array of integers. */
export function parseWeaponAttack(str) {
  if (!str) return [];
  return str.split('/').map(s => parseInt(s.replace(/\s/g, ''), 10)).filter(n => !isNaN(n));
}

export function parseDamageBonus(dmgStr) {
  // e.g., "1d8+6" → { dice: "1d8", bonus: 6 }
  const m = dmgStr.match(/^(\d+d\d+)([+-]\d+)?$/);
  if (!m) return { dice: dmgStr, bonus: 0 };
  return { dice: m[1], bonus: m[2] ? parseInt(m[2], 10) : 0 };
}

export function buildDamageString(dice, bonus) {
  if (bonus === 0) return dice;
  return `${dice}${formatBonus(bonus)}`;
}