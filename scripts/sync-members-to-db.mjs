/**
 * sync-members-to-db.mjs
 * Récupère les membres du serveur Discord et les upsert dans Supabase.
 *
 * Usage :
 *   node scripts/sync-members-to-db.mjs          → dry-run (affiche sans écrire)
 *   node scripts/sync-members-to-db.mjs --apply  → écrit dans Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── .env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) throw new Error('.env introuvable.');
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

// ─── Discord API ──────────────────────────────────────────────────────────────

async function fetchGuildMembers(guildId, botToken) {
  const members = [];
  let after = '0';
  while (true) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
      { headers: { Authorization: `Bot ${botToken}` } },
    );
    if (!res.ok) throw new Error(`Discord API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    if (!batch.length) break;
    members.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return members;
}

// ─── Role mapping (identique à discordAuth.ts) ────────────────────────────────

const DISCORD_ROLE_MAP = {
  '1440208204972818453': 'boss',
  '1491867062459695365': 'oncle',
  '1216504313577214022': 'segundo',
  '1216504378978996245': 'capo',
  '1216504334838403093': 'bandito',
  '1216504356979998790': 'soldato',
  '1441072915163512893': 'recrue',
};

const ROLE_PRIORITY = ['boss', 'oncle', 'segundo', 'capo', 'bandito', 'soldato', 'recrue', 'associe'];

function getRoleFromGuild(memberRoles) {
  let best = 'associe';
  let bestIdx = ROLE_PRIORITY.indexOf('associe');
  for (const rid of memberRoles) {
    const role = DISCORD_ROLE_MAP[rid];
    if (!role) continue;
    const idx = ROLE_PRIORITY.indexOf(role);
    if (idx < bestIdx) { best = role; bestIdx = idx; }
  }
  return best;
}

function hasGangRole(memberRoles) {
  return memberRoles.some((rid) => DISCORD_ROLE_MAP[rid]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function displayName(gm) {
  return gm.nick || gm.user?.global_name || gm.user?.username || 'Inconnu';
}

function discordTag(gm) {
  const u = gm.user;
  if (u.discriminator && u.discriminator !== '0') return `${u.username}#${u.discriminator}`;
  return `@${u.username}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const APPLY = process.argv.includes('--apply');

const env = loadEnv();
const BOT_TOKEN     = env['BOT_TOKEN'];
const GUILD_ID      = env['DISCORD_GUILD_ID'];
const SUPABASE_URL  = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY  = env['VITE_SUPABASE_ANON_KEY'];

if (!BOT_TOKEN)    { console.error('❌  BOT_TOKEN manquant');           process.exit(1); }
if (!GUILD_ID)     { console.error('❌  DISCORD_GUILD_ID manquant');    process.exit(1); }
if (!SUPABASE_URL) { console.error('❌  VITE_SUPABASE_URL manquant');   process.exit(1); }
if (!SUPABASE_KEY) { console.error('❌  VITE_SUPABASE_ANON_KEY manquant'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`🔍  Récupération des membres Discord (serveur ${GUILD_ID})…`);
const guildMembers = await fetchGuildMembers(GUILD_ID, BOT_TOKEN);
console.log(`✅  ${guildMembers.length} membres trouvés sur Discord.\n`);

// Filtre : garde uniquement les membres avec un rôle gang
const gangMembers = guildMembers.filter((gm) => !gm.user.bot && hasGangRole(gm.roles));
const skipped     = guildMembers.filter((gm) => !gm.user.bot && !hasGangRole(gm.roles));

console.log(`👥  ${gangMembers.length} membres avec un rôle gang.`);
if (skipped.length) {
  console.log(`⏭️   ${skipped.length} membres sans rôle gang ignorés :`);
  for (const gm of skipped) {
    console.log(`     · ${displayName(gm)} (@${gm.user.username})`);
  }
}

console.log('\n' + '━'.repeat(60));
console.log('📋  Membres à insérer / mettre à jour :\n');

const rows = gangMembers.map((gm) => {
  const name     = displayName(gm);
  const role     = getRoleFromGuild(gm.roles);
  const initials = toInitials(name);
  const tag      = discordTag(gm);

  return {
    // id est un UUID auto-généré par Supabase — on ne le fournit pas
    discord_id:   gm.user.id,        // Discord snowflake (TEXT, UNIQUE)
    name,
    initials,
    role,
    discord_tag:  tag,
    discord_avatar: null,
    mission_id:   null,
    total_earned: 0,
    weekly_earned: 0,
    monthly_earned: 0,
    missions_completed: 0,
    success_rate: 0,
    last_seen:    new Date().toISOString(),
    joined_at:    new Date().toISOString().slice(0, 10),
    active:       true,
  };
});

// Affichage tableau
const COL = { id: 20, name: 30, role: 10, tag: 22 };
const header = [
  'Discord ID'.padEnd(COL.id),
  'Nom'.padEnd(COL.name),
  'Rôle'.padEnd(COL.role),
  'Tag',
].join('  ');
console.log(header);
console.log('─'.repeat(header.length));
for (const r of rows) {
  console.log([
    r.discord_id.padEnd(COL.id),
    r.name.slice(0, COL.name - 1).padEnd(COL.name),
    r.role.padEnd(COL.role),
    r.discord_tag,
  ].join('  '));
}

console.log('\n' + '━'.repeat(60));

if (!APPLY) {
  console.log('\n💡  Dry-run — aucune donnée écrite.');
  console.log('    Lance avec --apply pour insérer dans Supabase :');
  console.log('    node scripts/sync-members-to-db.mjs --apply\n');
  process.exit(0);
}

// ─── Upsert Supabase ──────────────────────────────────────────────────────────

console.log('\n⬆️   Upsert dans Supabase…');

const { error } = await supabase
  .from('members')
  .upsert(rows, { onConflict: 'discord_id', ignoreDuplicates: false });

if (error) {
  console.error('\n❌  Erreur Supabase :', error.message);
  console.error('    Détails :', JSON.stringify(error, null, 2));
  process.exit(1);
}

console.log(`\n✅  ${rows.length} membres insérés / mis à jour dans Supabase.`);
console.log('    Les données de gains (total_earned, weekly_earned, etc.)');
console.log('    sont initialisées à 0 — à renseigner via le dashboard.\n');
