import type { AuthUser, Role } from '../types';
import { DISCORD_MEMBER_LINKS, MEMBERS } from '../data/mockData';

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

const normalizeIdentity = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const splitAliases = (value: string): string[] =>
  value
    .split(/[|/,_\-.\s]+/)
    .map((part) => normalizeIdentity(part))
    .filter(Boolean);

const bigrams = (value: string): Set<string> => {
  if (value.length < 2) return new Set([value]);
  const out = new Set<string>();
  for (let i = 0; i < value.length - 1; i += 1) {
    out.add(value.slice(i, i + 2));
  }
  return out;
};

const diceSimilarity = (left: string, right: string): number => {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const a = bigrams(left);
  const b = bigrams(right);
  let intersection = 0;

  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }

  return (2 * intersection) / (a.size + b.size);
};

const scoreAliasMatch = (a: string, b: string): number => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  return diceSimilarity(a, b);
};

const buildDiscordAliases = (user: DiscordUserResponse, discordTag: string): string[] => {
  const raw = [
    user.id,
    user.username,
    user.global_name ?? '',
    discordTag,
    `@${user.username}`,
  ];

  const normalized = raw.map(normalizeIdentity).filter(Boolean);
  const split = raw.flatMap(splitAliases);
  return Array.from(new Set([...normalized, ...split]));
};

const buildMemberAliases = (member: (typeof MEMBERS)[number]): string[] => {
  const raw = [member.id, member.name, member.discordTag, member.discordTag.replace('@', '')];
  const normalized = raw.map(normalizeIdentity).filter(Boolean);
  const split = raw.flatMap(splitAliases);
  return Array.from(new Set([...normalized, ...split]));
};

const autoMatchMember = (discordUser: DiscordUserResponse, discordTag: string) => {
  const discordAliases = buildDiscordAliases(discordUser, discordTag);
  let best: { member: (typeof MEMBERS)[number]; score: number } | null = null;

  for (const member of MEMBERS) {
    const memberAliases = buildMemberAliases(member);
    let localBest = 0;

    for (const d of discordAliases) {
      for (const m of memberAliases) {
        const score = scoreAliasMatch(d, m);
        if (score > localBest) localBest = score;
      }
    }

    if (!best || localBest > best.score) {
      best = { member, score: localBest };
    }
  }

  // Seuil assez strict pour eviter les mauvais rattachements automatiques.
  return best && best.score >= 0.86 ? best.member : null;
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

export const mapDiscordUserToAuthUser = (
  discordUser: DiscordUserResponse,
  guildMember?: DiscordGuildMember | null,
): AuthUser => {
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

  const linkedMemberId = [discordUser.id, discordUser.username, discordUser.global_name ?? '', discordTag, `@${discordUser.username}`]
    .map(normalizeIdentity)
    .find((key) => DISCORD_MEMBER_LINKS[key]);

  if (linkedMemberId) {
    const mappedMember = MEMBERS.find((member) => member.id === DISCORD_MEMBER_LINKS[linkedMemberId]);
    if (mappedMember) {
      return {
        id: mappedMember.id,
        name: serverNick || mappedMember.name,
        initials: toInitials(serverNick || mappedMember.name),
        discordTag: mappedMember.discordTag,
        role,
        avatarUrl,
      };
    }
  }

  const matchedMember = MEMBERS.find(
    (member) => member.discordTag.toLowerCase() === discordTag.toLowerCase(),
  );

  if (matchedMember) {
    return {
      id: matchedMember.id,
      name: serverNick || matchedMember.name,
      initials: toInitials(serverNick || matchedMember.name),
      discordTag: matchedMember.discordTag,
      role,
      avatarUrl,
    };
  }

  const autoMatchedMember = autoMatchMember(discordUser, discordTag);
  if (autoMatchedMember) {
    return {
      id: autoMatchedMember.id,
      name: serverNick || autoMatchedMember.name,
      initials: toInitials(serverNick || autoMatchedMember.name),
      discordTag: autoMatchedMember.discordTag,
      role,
      avatarUrl,
    };
  }

  return {
    id: discordUser.id,
    name: displayName,
    initials: toInitials(displayName),
    discordTag,
    role,
    avatarUrl,
  };
};
