/**
 * sync-discord-names.mjs
 * Fetch les pseudos du serveur Discord et met à jour src/data/mockData.ts
 *
 * Usage :
 *   node scripts/sync-discord-names.mjs          → dry-run (affiche les changements)
 *   node scripts/sync-discord-names.mjs --apply  → applique les changements dans mockData.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Lecture du .env ─────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) throw new Error('.env introuvable à la racine du projet.');

  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
  }
  return env;
}

// ─── Discord API ──────────────────────────────────────────────────────────────

async function fetchGuildMembers(guildId, botToken) {
  const members = [];
  let after = '0';

  while (true) {
    const url = `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Discord API ${res.status}: ${body}`);
    }

    const batch = await res.json();
    if (!batch.length) break;
    members.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }

  return members;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Vérifie si un string ressemble à un snowflake Discord (17-19 chiffres) */
const isSnowflake = (id) => /^\d{17,19}$/.test(id);

/**
 * Retourne le nom à afficher pour un guild member Discord :
 * nick du serveur > global_name > username
 */
function displayName(guildMember) {
  return guildMember.nick || guildMember.user?.global_name || guildMember.user?.username || '?';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const APPLY = process.argv.includes('--apply');

const env = loadEnv();
const BOT_TOKEN = env['BOT_TOKEN'];
const GUILD_ID = env['DISCORD_GUILD_ID'];

if (!BOT_TOKEN || BOT_TOKEN === 'TON_BOT_TOKEN_ICI') {
  console.error('❌  BOT_TOKEN manquant dans .env');
  process.exit(1);
}
if (!GUILD_ID || GUILD_ID === 'TON_GUILD_ID_ICI') {
  console.error('❌  DISCORD_GUILD_ID manquant dans .env');
  process.exit(1);
}

console.log(`🔍  Récupération des membres du serveur ${GUILD_ID}…`);
const guildMembers = await fetchGuildMembers(GUILD_ID, BOT_TOKEN);
console.log(`✅  ${guildMembers.length} membres trouvés sur Discord.\n`);

// Index Discord par user.id pour accès rapide
const discordById = new Map(guildMembers.map((m) => [m.user.id, m]));

// Lit mockData.ts comme texte brut
const mockDataPath = path.join(ROOT, 'src', 'data', 'mockData.ts');
let mockDataSource = fs.readFileSync(mockDataPath, 'utf8');

// Extrait les blocs MEMBERS avec une regex simple
// Cherche les objets { id: '...', name: '...', ... } dans le tableau MEMBERS
const memberBlockRegex =
  /\{\s*id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?\}/g;

const changes = [];
let updatedSource = mockDataSource;

for (const gm of guildMembers) {
  // Cherche dans mockData un membre dont l'id est le snowflake Discord
  if (!isSnowflake(gm.user.id)) continue;

  const discordId = gm.user.id;
  const newName = displayName(gm);

  // Cherche le bloc correspondant dans le source
  const idPattern = new RegExp(
    `(\\{[^}]*?id:\\s*'${discordId}'[\\s\\S]*?name:\\s*')([^']+)(')`
  );

  const match = idPattern.exec(updatedSource);
  if (!match) continue;

  const oldName = match[2];
  if (oldName === newName) continue;

  changes.push({ discordId, oldName, newName });
  if (APPLY) {
    updatedSource = updatedSource.replace(idPattern, `$1${newName}$3`);
  }
}

// ─── Rapport ──────────────────────────────────────────────────────────────────

console.log('━'.repeat(60));
if (changes.length === 0) {
  console.log('✅  Aucun changement de pseudo détecté pour les membres avec Discord ID.');
} else {
  console.log(`📝  ${changes.length} changement(s) détecté(s) :\n`);
  for (const { discordId, oldName, newName } of changes) {
    console.log(`  ${discordId}`);
    console.log(`    ${oldName}  →  ${newName}`);
  }
}

// ─── Membres sans Discord ID dans mockData ────────────────────────────────────

// Extrait tous les id de MEMBERS depuis le source
const idMatches = [...mockDataSource.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
const membersWithoutDiscordId = idMatches.filter((id) => !isSnowflake(id));

if (membersWithoutDiscordId.length > 0) {
  console.log('\n━'.repeat(60));
  console.log(`\n⚠️   ${membersWithoutDiscordId.length} membre(s) sans Discord ID dans mockData.ts :`);
  console.log('    Pour les synchroniser, remplace leur id par leur vrai Discord ID.\n');
  console.log('    Membres Discord disponibles sur le serveur :');
  console.log('    ' + '─'.repeat(55));
  for (const gm of guildMembers.sort((a, b) =>
    (a.nick || a.user.username).localeCompare(b.nick || b.user.username)
  )) {
    const name = displayName(gm);
    const username = gm.user.username;
    console.log(`    ${gm.user.id.padEnd(20)} ${name.padEnd(28)} (@${username})`);
  }
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

console.log('\n' + '━'.repeat(60));
if (APPLY && changes.length > 0) {
  fs.writeFileSync(mockDataPath, updatedSource, 'utf8');
  console.log(`\n✅  mockData.ts mis à jour avec ${changes.length} pseudo(s) Discord.`);
} else if (!APPLY && changes.length > 0) {
  console.log('\n💡  Lance avec --apply pour appliquer les changements :');
  console.log('    node scripts/sync-discord-names.mjs --apply');
} else {
  console.log('\n✅  Rien à faire.');
}
