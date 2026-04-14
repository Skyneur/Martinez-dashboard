import type { AuthUser, Role } from '../types';
import { supabase } from '../lib/supabase';

const DISCORD_STATE_KEY = 'martinez.discord.oauth.state';
const GUILD_ID = '1216193153498091561';

// Mapping Discord role ID → rôle app (ordre = priorité décroissante)
const DISCORD_ROLE_MAP: Record<string, Role> = {
  '1440208204972818453': 'boss',
  '1491867062459695365': 'oncle',
  '1216504313577214022': 'segundo',
  '1216504378978996245': 'capo',
  '1216504334838403093': 'bandito',
  '1216504356979998790': 'soldato',
  '1441072915163512893': 'recrue',
};

const ROLE_PRIORITY: Role[] = ['boss', 'oncle', 'segundo', 'capo', 'bandito', 'soldato', 'recrue', 'associe'];

const getRoleFromGuild = (guildRoles: string[]): Role => {
  let best: Role = 'associe';
  let bestIndex = ROLE_PRIORITY.indexOf('associe');

  for (const discordRoleId of guildRoles) {
    const appRole = DISCORD_ROLE_MAP[discordRoleId];
    if (!appRole) continue;
    const idx = ROLE_PRIORITY.indexOf(appRole);
    if (idx < bestIndex) {
      best = appRole;
      bestIndex = idx;
    }
  }
  return best;
};

interface DiscordUserResponse {
  id: string;
  username: string;
  global_name: string | null;
  discriminator: string;
  avatar: string | null;
}

interface DiscordGuildMember {
  nick: string | null;
  avatar: string | null;
  roles: string[];
  user: {
    id: string;
    avatar: string | null;
  };
}

const buildAvatarUrl = (
  userId: string,
  globalAvatarHash: string | null,
  guildId?: string,
  guildAvatarHash?: string | null,
): string => {
  if (guildId && guildAvatarHash) {
    return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${guildAvatarHash}.png?size=128`;
  }
  if (globalAvatarHash) {
    return `https://cdn.discordapp.com/avatars/${userId}/${globalAvatarHash}.png?size=128`;
  }
  // Avatar par défaut Discord
  const index = Number(BigInt(userId) >> BigInt(22)) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
};

const toInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const buildDiscordTag = (user: DiscordUserResponse): string => {
  if (user.discriminator && user.discriminator !== '0') {
    return `${user.username}#${user.discriminator}`;
  }
  return `@${user.username}`;
};

// ── Supabase lookup ───────────────────────────────────────────────────────────

const fetchMemberByDiscordId = async (discordId: string) => {
  const { data } = await supabase
    .from('members')
    .select('id, name, initials, discord_tag')
    .eq('discord_id', discordId)
    .limit(1)
    .maybeSingle();
  return data as { id: string; name: string; initials: string; discord_tag: string } | null;
};

const randomState = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const startDiscordOAuth = (): void => {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error('VITE_DISCORD_CLIENT_ID est manquant.');
  }

  const state = randomState();
  sessionStorage.setItem(DISCORD_STATE_KEY, state);

  const redirectUri = `${window.location.origin}/auth/discord/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: 'identify guilds.members.read',
    state,
    prompt: 'consent',
  });

  window.location.href = `https://discord.com/oauth2/authorize?${params.toString()}`;
};

export const parseDiscordTokenFromHash = (): { token: string; state: string } => {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);

  const error = params.get('error');
  if (error) {
    throw new Error(`Connexion Discord refusée: ${error}`);
  }

  const token = params.get('access_token');
  const state = params.get('state');

  if (!token || !state) {
    throw new Error('Réponse OAuth Discord incomplète.');
  }

  return { token, state };
};

export const validateDiscordState = (state: string): void => {
  const expected = sessionStorage.getItem(DISCORD_STATE_KEY);
  sessionStorage.removeItem(DISCORD_STATE_KEY);

  if (!expected || expected !== state) {
    throw new Error('Échec validation OAuth (state invalide).');
  }
};

export const fetchDiscordUser = async (accessToken: string): Promise<DiscordUserResponse> => {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Impossible de récupérer le profil Discord.');
  }

  return (await res.json()) as DiscordUserResponse;
};

export const fetchGuildMember = async (accessToken: string): Promise<DiscordGuildMember | null> => {
  const res = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // 404 = pas membre du serveur, on retourne null sans bloquer
  if (res.status === 404) return null;

  if (!res.ok) return null;

  return (await res.json()) as DiscordGuildMember;
};

export const mapDiscordUserToAuthUser = async (
  discordUser: DiscordUserResponse,
  guildMember?: DiscordGuildMember | null,
): Promise<AuthUser> => {
  const discordTag = buildDiscordTag(discordUser);
  const role = guildMember ? getRoleFromGuild(guildMember.roles) : 'associe';

  // Pseudo serveur en priorité, sinon global_name, sinon username
  const serverNick = guildMember?.nick ?? null;
  const displayName = serverNick || discordUser.global_name || discordUser.username;

  // Avatar serveur en priorité, sinon avatar global
  const avatarUrl = buildAvatarUrl(
    discordUser.id,
    discordUser.avatar,
    GUILD_ID,
    guildMember?.avatar,
  );

  // Lookup Supabase par Discord ID
  const dbMember = await fetchMemberByDiscordId(discordUser.id);
  if (dbMember) {
    return {
      id: dbMember.id,
      name: serverNick || dbMember.name,
      initials: toInitials(serverNick || dbMember.name),
      discordTag: dbMember.discord_tag,
      role,
      avatarUrl,
    };
  }

  // Membre non trouvé en base — accès invité
  return {
    id: discordUser.id,
    name: displayName,
    initials: toInitials(displayName),
    discordTag,
    role,
    avatarUrl,
  };
};
