import { useState } from 'react';
import { resolveTeamLogoUrl } from '../../config/assets';

interface DepartmentMarkProps {
  shortName: string;
  color: string;
  size?: number;
  src?: string;
  id?: string;
}

export function DepartmentMark({ shortName, color, size = 40, src, id }: DepartmentMarkProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = src || (id ? resolveTeamLogoUrl(id) : undefined);
  if (resolvedSrc && !failed) {
    return (
      <img
        src={resolvedSrc}
        alt=""
        onError={() => setFailed(true)}
        className="inline-block shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl font-black leading-none text-white"
      style={{
        width: size,
        height: size,
        background: color,
        color: color.toLowerCase() === '#f5c518' ? '#102018' : '#ffffff',
        fontSize: shortName.length > 3 ? 9 : 11,
      }}
    >
      {shortName}
    </span>
  );
}

export function getPlayerInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return '??';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return clean.slice(0, 2).toUpperCase();
  }
  const first = parts[0];
  const second = parts[1].replace(/[^a-zA-Z]/g, '');
  if (second) {
    return (first[0] + second[0]).toUpperCase();
  }
  return first.slice(0, 2).toUpperCase();
}

export function Portrait({ name, src, size = 36, id }: { name: string; src?: string; size?: number; id?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = getPlayerInitials(name);
  const resolvedSrc = src && src.trim().length > 0 ? src.trim() : undefined;

  if (resolvedSrc && !failed) {
    return (
      <img
        src={resolvedSrc}
        alt={name}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1e293b] to-[#0b1329] font-black text-[#f5c518] border border-white/15 shadow-inner select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        letterSpacing: '0.05em',
      }}
      title={name}
    >
      {initials}
    </span>
  );
}
