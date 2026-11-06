/**
 * Centralized Static Asset Configuration
 * Resolves static GitHub assets, team logos, group graphics, and placeholders.
 * Decoupled from team display names: relies strictly on stable team IDs / slugs.
 */

// GitHub asset repository configuration
// When the dedicated asset repository is published, raw GitHub or CDN URL is used.
export const GITHUB_ASSETS_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_GITHUB_ASSETS_URL || import.meta.env?.VITE_STATIC_ASSETS_BASE_URL)) ||
  (typeof process !== 'undefined' &&
    (process.env?.VITE_GITHUB_ASSETS_URL || process.env?.VITE_STATIC_ASSETS_BASE_URL)) ||
  'https://raw.githubusercontent.com/EthiopianPL/ddu-super-cup-assets/main';

/**
 * High-performance CDN delivery base URL via jsDelivr.
 * Features:
 * - Global edge caching (Fastly / Cloudflare / Akamai backbones)
 * - Automatic CORS headers (Access-Control-Allow-Origin: *) for MOTM Canvas export
 * - WebP automatic compression on supported clients
 * Active once repository is public.
 */
export const JSDELIVR_ASSETS_BASE_URL =
  'https://cdn.jsdelivr.net/gh/EthiopianPL/ddu-super-cup-assets@main';

/**
 * Maps known stable team IDs to their relative static logo paths in ddu-super-cup-assets.
 * If a team is not in this map or the logo is not yet committed to GitHub,
 * components fall back gracefully to the SVG DepartmentMark initials/color badge.
 */
export const STATIC_TEAM_LOGO_PATHS: Record<string, string> = {
  // Group A
  'management': 'teams/group-a/mgt/logo.png',
  'mgt': 'teams/group-a/mgt/logo.png',
  'chemical-engineering': 'teams/group-a/chemical/logo.png',
  'chemical': 'teams/group-a/chemical/logo.png',
  'information-technology': 'teams/group-a/it/logo.png',
  'it': 'teams/group-a/it/logo.png',
  'civil-engineering': 'teams/group-a/civil/logo.png',
  'civil': 'teams/group-a/civil/logo.png',

  // Group B
  'p-p-o': 'teams/group-b/p-p-o/logo.png',
  'ppo': 'teams/group-b/p-p-o/logo.png',
  'health': 'teams/group-b/health/logo.png',
  'hea': 'teams/group-b/health/logo.png',
  'padm': 'teams/group-b/padm/logo.png',
  'bio-statistics': 'teams/group-b/bio-stat/logo.png',
  'bio-stat': 'teams/group-b/bio-stat/logo.png',
  'biostat': 'teams/group-b/bio-stat/logo.png',
  'bs': 'teams/group-b/bio-stat/logo.png',

  // Group C
  'arc': 'teams/group-c/arc/logo.png',
  'architecture': 'teams/group-c/arc/logo.png',
  'geo-sport': 'teams/group-c/geo-sport/logo.png',
  'geosport': 'teams/group-c/geo-sport/logo.png',
  'gs': 'teams/group-c/geo-sport/logo.png',
  'log': 'teams/group-c/log/logo.png',
  'logistics': 'teams/group-c/log/logo.png',
  'journalism-sosa': 'teams/group-c/jo-sosa/logo.png',
  'jo-sosa': 'teams/group-c/jo-sosa/logo.png',
  'jososa': 'teams/group-c/jo-sosa/logo.png',
  'js': 'teams/group-c/jo-sosa/logo.png',

  // Group D
  'real-properties': 'teams/group-d/real/logo.png',
  'real': 'teams/group-d/real/logo.png',
  'rp': 'teams/group-d/real/logo.png',
  'cotm': 'teams/group-d/cotm/logo.png',
  'soft': 'teams/group-d/soft/logo.png',
  'software-engineering': 'teams/group-d/soft/logo.png',
  'se': 'teams/group-d/soft/logo.png',
  'elec': 'teams/group-d/elec/logo.png',
  'electrical-engineering': 'teams/group-d/elec/logo.png',

  // Group E
  'acc': 'teams/group-e/acc/logo.png',
  'accounting': 'teams/group-e/acc/logo.png',
  'accounting-finance': 'teams/group-e/acc/logo.png',
  'mkt': 'teams/group-e/mkt/logo.png',
  'marketing': 'teams/group-e/mkt/logo.png',
  'industrial-mechanical': 'teams/group-e/indu-mecha/logo.png',
  'indu-mecha': 'teams/group-e/indu-mecha/logo.png',
  'indumecha': 'teams/group-e/indu-mecha/logo.png',
  'im': 'teams/group-e/indu-mecha/logo.png',
  'law-economics': 'teams/group-e/law-eco/logo.png',
  'law-eco': 'teams/group-e/law-eco/logo.png',
  'laweco': 'teams/group-e/law-eco/logo.png',
  'le': 'teams/group-e/law-eco/logo.png',
  'survey': 'teams/group-e/survey/logo.png',
  'surveying': 'teams/group-e/survey/logo.png',
  'su': 'teams/group-e/survey/logo.png',
};

export const PLACEHOLDER_ASSETS = {
  player: `${GITHUB_ASSETS_BASE_URL}/placeholders/player-placeholder.png`,
  team: `${GITHUB_ASSETS_BASE_URL}/placeholders/team-placeholder.png`,
  department: `${GITHUB_ASSETS_BASE_URL}/placeholders/department-placeholder.png`,
  motm: `${GITHUB_ASSETS_BASE_URL}/placeholders/motm-placeholder.png`,
  brandingLogo: '/brand/ddu-logo.png',
};

/**
 * Resolves a team logo URL:
 * 1. If explicit custom `crest_url` is stored in DB and non-empty, use it.
 * 2. If team ID has a mapped GitHub static logo path, resolve to GitHub asset repository.
 * 3. Otherwise return empty string to allow DepartmentMark to render its high-contrast SVG badge.
 */
export function resolveTeamLogoUrl(teamId?: string | null, customCrestUrl?: string | null): string {
  if (customCrestUrl && customCrestUrl.trim().length > 0) {
    return customCrestUrl.trim();
  }
  if (!teamId) return '';
  const normalizedId = teamId.toLowerCase().trim();
  const relPath = STATIC_TEAM_LOGO_PATHS[normalizedId];
  if (relPath) {
    return `${GITHUB_ASSETS_BASE_URL}/${relPath}`;
  }
  return '';
}

/**
 * Resolves a group cover graphic URL from the GitHub asset repository.
 */
export function resolveGroupCoverUrl(groupId?: string | null): string {
  if (!groupId) return '';
  const g = groupId.toLowerCase().trim();
  return `${GITHUB_ASSETS_BASE_URL}/groups/group-${g}/group-cover.png`;
}

