/**
 * Centralized Static Asset Configuration
 * Resolves static GitHub assets, team logos, group graphics, and placeholders.
 * Decoupled from team display names: relies strictly on stable team IDs / slugs.
 */

// GitHub asset repository configuration
// When the dedicated asset repository is published, raw GitHub or CDN URL is used.
/**
 * Normalizes any GitHub repository URL (e.g. .git clone URL or github.com link)
 * to its corresponding raw content delivery endpoint.
 */
export function normalizeGitHubAssetsBaseUrl(url?: string | null): string {
  if (!url) return 'https://raw.githubusercontent.com/EthiopianPL/ddu-super-cup-assets/main';
  let clean = url.trim().replace(/\/+$/, '');
  if (clean.includes('github.com/') && !clean.includes('raw.githubusercontent.com')) {
    clean = clean.replace(/\.git$/, '');
    const match = clean.match(/github\.com\/([^/]+)\/([^/]+)(?:\/(?:raw|tree|blob)\/([^/]+))?/);
    if (match) {
      const owner = match[1];
      const repo = match[2];
      const branch = match[3] || 'main';
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
    }
  }
  return clean;
}

const rawConfiguredUrl =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_GITHUB_ASSETS_URL || import.meta.env?.VITE_STATIC_ASSETS_BASE_URL)) ||
  (typeof process !== 'undefined' &&
    (process.env?.VITE_GITHUB_ASSETS_URL || process.env?.VITE_STATIC_ASSETS_BASE_URL)) ||
  'https://cdn.jsdelivr.net/gh/EthiopianPL/ddu-super-cup-assets@main';

export const GITHUB_ASSETS_BASE_URL = normalizeGitHubAssetsBaseUrl(rawConfiguredUrl);

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

export const LOCAL_TEAM_LOGO_FILES: Record<string, string> = {
  'accounting': 'accounting.jpg',
  'accounting-finance': 'accounting.jpg',
  'architecture': 'architecture.jpg',
  'arc': 'architecture.jpg',
  'bio-statistics': 'bio-statistics.jpg',
  'bio-stat': 'bio-statistics.jpg',
  'biostat': 'bio-statistics.jpg',
  'chemical-engineering': 'chemical-engineering.jpg',
  'chemical': 'chemical-engineering.jpg',
  'civil-engineering': 'civil-engineering.jpg',
  'civil': 'civil-engineering.jpg',
  'cotm': 'cotm.jpg',
  'electrical-engineering': 'electrical-engineering.jpg',
  'elec': 'electrical-engineering.jpg',
  'geo-sport': 'geo-sport.jpg',
  'geosport': 'geo-sport.jpg',
  'gs': 'geo-sport.jpg',
  'health': 'health.jpg',
  'hea': 'health.jpg',
  'industrial-mechanical': 'industrial-mechanical.jpg',
  'indu-mecha': 'industrial-mechanical.jpg',
  'information-technology': 'information-technology.jpg',
  'it': 'information-technology.jpg',
  'journalism-sosa': 'journalism-sosa.jpg',
  'jo-sosa': 'journalism-sosa.jpg',
  'jososa': 'journalism-sosa.jpg',
  'law-economics': 'law-economics.svg',
  'law-eco': 'law-economics.svg',
  'logistics': 'logistics.jpg',
  'log': 'logistics.jpg',
  'management': 'management.jpg',
  'mgt': 'management.jpg',
  'marketing': 'marketing.jpg',
  'mkt': 'marketing.jpg',
  'p-p-o': 'p-p-o.jpg',
  'ppo': 'p-p-o.jpg',
  'padm': 'padm.jpg',
  'real-properties': 'real-properties.svg',
  'real': 'real-properties.svg',
  'software-engineering': 'software-engineering.svg',
  'soft': 'software-engineering.svg',
  'survey': 'survey.svg',
  'surveying': 'survey.svg',
};

/**
 * Resolves a team logo URL:
 * 1. If explicit custom `crest_url` is stored in DB and non-empty, use it.
 * 2. If team ID has a local static logo file, resolve to /uploads/teams/<filename>.
 * 3. Fallback to /uploads/teams/<teamId>.svg.
 */
export function resolveTeamLogoUrl(teamId?: string | null, customCrestUrl?: string | null): string {
  if (customCrestUrl && customCrestUrl.trim().length > 0) {
    return customCrestUrl.trim();
  }
  if (!teamId) return '';
  const normalizedId = teamId.toLowerCase().trim();
  const localFileName = LOCAL_TEAM_LOGO_FILES[normalizedId];
  if (localFileName) {
    return `/uploads/teams/${localFileName}`;
  }
  return `/uploads/teams/${normalizedId}.svg`;
}

/**
 * Resolves a group cover graphic URL from the GitHub asset repository.
 */
export function resolveGroupCoverUrl(groupId?: string | null): string {
  if (!groupId) return '';
  const clean = groupId.toLowerCase().trim().replace(/^group[\s-_]*/, '');
  if (!clean) return '';
  return `${GITHUB_ASSETS_BASE_URL}/groups/group-${clean}/group-cover.png`;
}

