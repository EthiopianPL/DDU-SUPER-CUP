import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PERMISSIONS = {
  super_admin: ['*'],
  match_admin: ['match.write', 'match.clock', 'lineup.write'],
  competition_manager: ['match.write', 'match.clock', 'match.correct', 'match.confirm', 'match.schedule', 'team.write', 'player.write', 'news.write', 'rules.write', 'lineup.write'],
  team_manager: ['team.write', 'player.write'],
  reader: [],
};

export const ROLES = Object.keys(PERMISSIONS);

export function can(actor, permission) {
  if (!actor) return false;
  const granted = PERMISSIONS[actor.role] ?? [];
  return granted.includes('*') || granted.includes(permission);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function newToken() {
  return randomBytes(32).toString('hex');
}
