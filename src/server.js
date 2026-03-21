'use strict';

const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * Parse a signed numeric string like "+6", "-2", "+13/+8" into an array of integers.
 */
function parseAttackString(str) {
  if (!str) return [];
  return str.split('/').map(s => parseInt(s.replace(/\s/g, ''), 10)).filter(n => !isNaN(n));
}

/**
 * Parse a Hero Lab portfolio (.por zip file) and return character data.
 * @param {Buffer} buffer - Raw bytes of the .por file
 * @returns {Object} Parsed character data
 */
function parsePortfolio(buffer) {
  const zip = new AdmZip(buffer);

  // Step 1: Read index.xml to find the PC character (characterindex="1")
  const indexEntry = zip.getEntry('index.xml');
  if (!indexEntry) throw new Error('index.xml not found in portfolio');
  const indexXml = indexEntry.getData().toString('utf8');

  const parser = new DOMParser();
  const indexDoc = parser.parseFromString(indexXml, 'text/xml');

  const characters = Array.from(indexDoc.getElementsByTagName('character'));
  const pcChar = characters.find(c => c.getAttribute('characterindex') === '1');
  if (!pcChar) throw new Error('No PC character (characterindex=1) found in index.xml');

  // Get the XML statblock filename for this character
  const statblocks = Array.from(pcChar.getElementsByTagName('statblock'));
  const xmlStatblock = statblocks.find(sb => sb.getAttribute('format') === 'xml');
  if (!xmlStatblock) throw new Error('No XML statblock found for PC character');

  const folder = xmlStatblock.getAttribute('folder');
  const filename = xmlStatblock.getAttribute('filename');
  const statblockPath = `${folder}/${filename}`;

  // Step 2: Read the character's XML statblock
  const statEntry = zip.getEntry(statblockPath);
  if (!statEntry) throw new Error(`Statblock not found: ${statblockPath}`);
  const statXml = statEntry.getData().toString('utf8');
  const statDoc = parser.parseFromString(statXml, 'text/xml');

  // Step 3: Find the PC node (role="pc")
  const allChars = Array.from(statDoc.getElementsByTagName('character'));
  const pcNode = allChars.find(c => c.getAttribute('role') === 'pc');
  if (!pcNode) throw new Error('No character node with role="pc" found in statblock');

  const charName = pcNode.getAttribute('name') || 'Unknown';

  // Step 4: Extract character class/level summary
  const charSummary = pcChar.getAttribute('summary') || '';

  // Step 5: Extract attack information
  const attackNodes = Array.from(pcNode.getElementsByTagName('attack'));
  // The top-level attack node (direct child) has the base attack info
  const mainAttackNode = attackNodes.find(n => n.parentNode === pcNode ||
    (n.parentNode && n.parentNode.getAttribute && n.parentNode.getAttribute('role') === 'pc')) || attackNodes[0];

  const baseAttackStr = mainAttackNode ? mainAttackNode.getAttribute('baseattack') : '+0';
  const rangedAttackStr = mainAttackNode ? mainAttackNode.getAttribute('rangedattack') : '+0';

  // Step 6: Extract ranged weapon data
  const rangedNode = Array.from(pcNode.getElementsByTagName('ranged'))[0];
  if (!rangedNode) throw new Error('No ranged weapon found for character');

  const weaponNode = Array.from(rangedNode.getElementsByTagName('weapon'))[0];
  if (!weaponNode) throw new Error('No weapon found in ranged node');

  const rangedAttackNode = Array.from(weaponNode.getElementsByTagName('rangedattack'))[0];
  const wepTypeNode = Array.from(weaponNode.getElementsByTagName('weptype'))[0];
  const situationalModsNode = Array.from(weaponNode.getElementsByTagName('situationalmodifiers'))[0];

  const weapon = {
    name: weaponNode.getAttribute('name') || '',
    damage: weaponNode.getAttribute('damage') || '',
    crit: weaponNode.getAttribute('crit') || '',
    attack: rangedAttackNode ? rangedAttackNode.getAttribute('attack') : weaponNode.getAttribute('attack'),
    range: rangedAttackNode ? rangedAttackNode.getAttribute('rangeinctext') : '',
    damageType: wepTypeNode ? (wepTypeNode.textContent || wepTypeNode.text || '').trim() : '',
    situationalModifiers: situationalModsNode ? situationalModsNode.getAttribute('text') : '',
  };

  // Step 7: Extract arcane pool from tracked resources
  const trackedResources = Array.from(pcNode.getElementsByTagName('trackedresource'));
  const arcanePoolResource = trackedResources.find(r =>
    (r.getAttribute('name') || '').toLowerCase().includes('arcane pool'));

  const arcanePool = arcanePoolResource ? {
    max: parseInt(arcanePoolResource.getAttribute('max') || '0', 10),
    used: parseInt(arcanePoolResource.getAttribute('used') || '0', 10),
    left: parseInt(arcanePoolResource.getAttribute('left') || '0', 10),
  } : { max: 0, used: 0, left: 0 };

  // Step 8: Read lead1.xml for active buffs
  const leadEntry = zip.getEntry('herolab/lead1.xml');
  const activeBuffIds = new Set();

  if (leadEntry) {
    const leadXml = leadEntry.getData().toString('utf8');
    const leadDoc = parser.parseFromString(leadXml, 'text/xml');
    const picks = Array.from(leadDoc.getElementsByTagName('pick'));

    for (const pick of picks) {
      const thingId = pick.getAttribute('thing');
      if (!thingId) continue;

      const fields = Array.from(pick.getElementsByTagName('field'));
      const pIsOnField = fields.find(f => f.getAttribute('id') === 'pIsOn');
      if (pIsOnField) {
        const val = pIsOnField.getAttribute('user') || '';
        if (val.startsWith('1')) {
          activeBuffIds.add(thingId);
        }
      }
    }
  }

  // Step 9: Extract memorized spells (for Spellstrike selection)
  const spellsMemorized = Array.from(pcNode.getElementsByTagName('spellsmemorized'))[0];
  const spells = [];

  if (spellsMemorized) {
    const spellNodes = Array.from(spellsMemorized.getElementsByTagName('spell'));
    for (const spellNode of spellNodes) {
      const castsleft = spellNode.getAttribute('castsleft');
      const unlimited = spellNode.getAttribute('unlimited');
      if (castsleft === undefined && unlimited !== 'yes') continue; // only prepared/available spells

      spells.push({
        name: spellNode.getAttribute('name') || '',
        level: parseInt(spellNode.getAttribute('level') || '0', 10),
        castTime: spellNode.getAttribute('casttime') || '',
        range: spellNode.getAttribute('range') || '',
        dc: spellNode.getAttribute('dc') || '',
        school: spellNode.getAttribute('schooltext') || '',
        castsLeft: castsleft !== undefined ? parseInt(castsleft, 10) : null,
        unlimited: unlimited === 'yes',
      });
    }
  }

  // Parse base attack bonuses (e.g., "+6" → [6])
  const baseAttackValues = parseAttackString(baseAttackStr);
  const primaryBAB = baseAttackValues[0] || 0;

  // Parse character's ranged attack values (without weapon magic, this is the character base)
  const charRangedAttackValues = parseAttackString(rangedAttackStr);

  // Parse weapon's full attack values (with all active buffs baked in)
  const weaponAttackValues = parseAttackString(weapon.attack);

  // Compute weapon static contribution = primary weapon attack - primary character ranged attack
  // This represents weapon magic, Weapon Focus, and other weapon-attached bonuses
  const weaponStaticBonus = (weaponAttackValues[0] || 0) - (charRangedAttackValues[0] || 0);

  return {
    name: charName,
    summary: charSummary,
    baseAttack: baseAttackStr,
    primaryBAB,
    charRangedAttack: rangedAttackStr,
    charRangedAttackValues,
    weaponStaticBonus,
    weapon,
    arcanePool,
    activeBuffIds: Array.from(activeBuffIds),
    spells,
  };
}

// POST /api/portfolio — accept a portfolio file upload
app.post('/api/portfolio', upload.single('portfolio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No portfolio file uploaded' });
    }

    const characterData = parsePortfolio(req.file.buffer);
    return res.json(characterData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eldritch Archer server running at http://localhost:${PORT}`);
});
