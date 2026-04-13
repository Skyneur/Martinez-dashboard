import type { AuthUser } from '../types';
import { DISCORD_MEMBER_LINKS, MEMBERS } from '../data/mockData';

const DISCORD_STATE_KEY = 'martinez.discord.oauth.state';
const ADMIN_DISCORD_IDS = new Set(['1470476450691022869', '251407844312612864']);

interface DiscordUserResponse {
  id: string;
  username: string;
  global_name: string | null;
  discriminator: string;
}

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
    scope: 'identify',
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

export const mapDiscordUserToAuthUser = (discordUser: DiscordUserResponse): AuthUser => {
  const discordTag = buildDiscordTag(discordUser);
  const isAdmin = ADMIN_DISCORD_IDS.has(discordUser.id);

  const linkedMemberId = [discordUser.id, discordUser.username, discordUser.global_name ?? '', discordTag, `@${discordUser.username}`]
    .map(normalizeIdentity)
    .find((key) => DISCORD_MEMBER_LINKS[key]);

  if (linkedMemberId) {
    const mappedMember = MEMBERS.find((member) => member.id === DISCORD_MEMBER_LINKS[linkedMemberId]);
    if (mappedMember) {
      return {
        id: mappedMember.id,
        name: mappedMember.name,
        initials: mappedMember.initials,
        discordTag: mappedMember.discordTag,
        role: isAdmin ? 'boss' : mappedMember.role,
      };
    }
  }

  const matchedMember = MEMBERS.find(
    (member) => member.discordTag.toLowerCase() === discordTag.toLowerCase(),
  );

  if (matchedMember) {
    return {
      id: matchedMember.id,
      name: matchedMember.name,
      initials: matchedMember.initials,
      discordTag: matchedMember.discordTag,
      role: isAdmin ? 'boss' : matchedMember.role,
    };
  }

  const autoMatchedMember = autoMatchMember(discordUser, discordTag);
  if (autoMatchedMember) {
    return {
      id: autoMatchedMember.id,
      name: autoMatchedMember.name,
      initials: autoMatchedMember.initials,
      discordTag: autoMatchedMember.discordTag,
      role: isAdmin ? 'boss' : autoMatchedMember.role,
    };
  }

  const displayName = discordUser.global_name || discordUser.username;

  return {
    id: discordUser.id,
    name: displayName,
    initials: toInitials(displayName),
    discordTag,
    role: isAdmin ? 'boss' : 'associe',
  };
};
