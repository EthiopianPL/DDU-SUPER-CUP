import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../server/db.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const GROUP_COLORS = {
  A: { primary: '#2563eb', secondary: '#1d4ed8', accent: '#60a5fa' },
  B: { primary: '#059669', secondary: '#047857', accent: '#34d399' },
  C: { primary: '#d97706', secondary: '#b45309', accent: '#fbbf24' },
  D: { primary: '#7c3aed', secondary: '#6d28d9', accent: '#a78bfa' },
  E: { primary: '#dc2626', secondary: '#b91c1c', accent: '#f87171' },
};

function createTeamBadgeSvg(team) {
  const group = team.group_id || 'A';
  const palette = GROUP_COLORS[group] || GROUP_COLORS.A;
  const short = (team.short_name || team.id.slice(0, 3)).toUpperCase().replace(/\\/g, '');
  const name = team.name || short;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.primary}" />
      <stop offset="100%" stop-color="${palette.secondary}" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>
  <rect width="200" height="200" rx="36" fill="#0d1527" />
  <circle cx="100" cy="100" r="82" fill="url(#bgGrad)" stroke="${palette.accent}" stroke-width="4" filter="url(#shadow)" />
  <circle cx="100" cy="100" r="72" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-dasharray="6,4" />
  <!-- Group Pill -->
  <rect x="76" y="32" width="48" height="20" rx="10" fill="#0a101d" fill-opacity="0.8" />
  <text x="100" y="46" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="${palette.accent}" text-anchor="middle" letter-spacing="1">GRP ${group}</text>
  <!-- Short Name -->
  <text x="100" y="112" font-family="system-ui, -apple-system, sans-serif" font-size="${short.length > 3 ? 34 : 44}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${short}</text>
  <!-- Team Name banner -->
  <rect x="25" y="142" width="150" height="24" rx="12" fill="#070c16" fill-opacity="0.75" />
  <text x="100" y="158" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#e2e8f0" text-anchor="middle" letter-spacing="0.5">${escapeXml(name.length > 20 ? name.slice(0, 18) + '...' : name)}</text>
</svg>`;
}

function createPlayerAvatarSvg(player) {
  const number = player.number || '';
  const name = player.name || 'Player';
  const pos = player.position || 'FWD';
  const initial = name.trim().charAt(0).toUpperCase();

  const posColors = {
    GK: '#f59e0b',
    DEF: '#3b82f6',
    MID: '#10b981',
    FWD: '#ef4444',
  };
  const color = posColors[pos] || '#6366f1';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%">
  <defs>
    <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <circle cx="80" cy="80" r="76" fill="url(#pGrad)" stroke="${color}" stroke-width="4" />
  <!-- Silhouette head and shoulders -->
  <circle cx="80" cy="56" r="26" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2" />
  <path d="M 36 126 C 36 94, 60 88, 80 88 C 100 88, 124 94, 124 126 Z" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2" />
  <!-- Initial or Shirt Number -->
  <text x="80" y="66" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">${initial}</text>
  <!-- Number and position badge -->
  <rect x="50" y="118" width="60" height="22" rx="11" fill="#090d16" stroke="${color}" stroke-width="1.5" />
  <text x="80" y="133" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">#${number} · ${pos}</text>
</svg>`;
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

async function run() {
  console.log('Connecting to database...');
  const db = openDatabase();
  console.log('DB Dialect:', db.dialect);

  const teams = db.prepare('SELECT id, name, short_name, group_id, color FROM teams').all();
  const players = db.prepare('SELECT id, name, number, position, team_id FROM players').all();

  console.log(`Found ${teams.length} teams and ${players.length} players.`);

  const teamUploadDir = join(root, 'public', 'uploads', 'teams');
  const playerUploadDir = join(root, 'public', 'uploads', 'players');
  mkdirSync(teamUploadDir, { recursive: true });
  mkdirSync(playerUploadDir, { recursive: true });

  const distTeamDir = join(root, 'dist', 'uploads', 'teams');
  const distPlayerDir = join(root, 'dist', 'uploads', 'players');
  if (existsSync(join(root, 'dist'))) {
    mkdirSync(distTeamDir, { recursive: true });
    mkdirSync(distPlayerDir, { recursive: true });
  }

  // 1. Generate local team SVGs and update DB
  for (const team of teams) {
    const filename = `${team.id}.svg`;
    const svg = createTeamBadgeSvg(team);
    writeFileSync(join(teamUploadDir, filename), svg, 'utf8');
    if (existsSync(join(root, 'dist'))) {
      writeFileSync(join(distTeamDir, filename), svg, 'utf8');
    }
    const localUrl = `/uploads/teams/${filename}`;
    db.prepare('UPDATE teams SET crest_url = ? WHERE id = ?').run(localUrl, team.id);
  }
  console.log(`Generated and linked ${teams.length} local team crests.`);

  // 2. Generate local player SVGs and update DB
  for (const player of players) {
    const filename = `${player.id}.svg`;
    const svg = createPlayerAvatarSvg(player);
    writeFileSync(join(playerUploadDir, filename), svg, 'utf8');
    if (existsSync(join(root, 'dist'))) {
      writeFileSync(join(distPlayerDir, filename), svg, 'utf8');
    }
    const localUrl = `/uploads/players/${filename}`;
    db.prepare('UPDATE players SET photo_url = ? WHERE id = ?').run(localUrl, player.id);
  }
  console.log(`Generated and linked ${players.length} local player photos.`);

  console.log('Database records updated with local file paths!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
