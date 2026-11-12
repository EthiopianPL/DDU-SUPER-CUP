import { useState, useEffect } from 'react';
import { resolveTeamLogoUrl } from '../../config/assets';

interface DepartmentMarkProps {
  shortName?: string;
  name?: string;
  color?: string;
  size?: number;
  src?: string;
  id?: string;
  className?: string;
}

export function getTeamAbbr(shortName?: string, name?: string, id?: string): string {
  // If shortName is already a clean concise abbreviation (<= 4 chars, no spaces), use it directly
  const cleanShort = shortName?.trim();
  if (cleanShort && cleanShort.length > 0 && cleanShort.length <= 4 && !cleanShort.includes(' ')) {
    return cleanShort.toUpperCase();
  }

  // Next prioritize name, e.g. "Information Technology" -> "IT"
  const raw = (name?.trim() || cleanShort || id?.trim() || '').trim();
  if (!raw) return '??';

  // Split words by space, hyphens, slashes, underscores, ampersands
  const words = raw
    .replace(/[-_/&]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 1) {
    // E.g. "Information Technology" -> "IT", "Bio Statistics" -> "BS"
    const abbr = words
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, '')[0] || '')
      .join('')
      .toUpperCase();
    if (abbr.length >= 2) return abbr.slice(0, 4);
  }

  // Single word: use shortName if available, else first 2-3 characters
  if (cleanShort && cleanShort.length <= 4) {
    return cleanShort.toUpperCase();
  }
  const clean = words[0]?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '';
  return clean.slice(0, Math.min(3, Math.max(2, clean.length))) || '??';
}

export function DepartmentMark({
  shortName,
  name,
  color = '#2450c8',
  size = 40,
  src,
  id,
  className = '',
}: DepartmentMarkProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveTeamLogoUrl(id, src) || (src && src.trim().length > 0 ? src.trim() : undefined);
  const abbr = getTeamAbbr(shortName, name, id);

  if (resolvedSrc && !failed) {
    return (
      <img
        src={resolvedSrc}
        alt={name || shortName || abbr}
        onError={() => setFailed(true)}
        className={`inline-block shrink-0 rounded-xl object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const bg = color || '#2450c8';
  const isYellow = bg.toLowerCase() === '#f5c518';
  const textColor = isYellow ? '#102018' : '#ffffff';
  const fontSize = Math.max(
    8,
    Math.round(size * (abbr.length >= 4 ? 0.28 : abbr.length === 3 ? 0.32 : 0.38))
  );

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-black leading-none select-none shadow-sm border border-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: textColor,
        fontSize,
        letterSpacing: abbr.length <= 2 ? '0.04em' : 'normal',
      }}
      title={name || shortName || abbr}
    >
      {abbr}
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
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setFailed(false);
    setTriedFallback(false);
  }, [src, id]);

  const initials = getPlayerInitials(name);
  const resolvedSrc = src && src.trim().length > 0 ? src.trim() : undefined;
  const fallbackSrc = id ? `/api/media/players/${encodeURIComponent(id)}` : undefined;

  const currentSrc = !triedFallback && resolvedSrc ? resolvedSrc : fallbackSrc;

  if (currentSrc && !failed) {
    return (
      <img
        src={currentSrc}
        alt={name}
        onError={() => {
          if (resolvedSrc && !triedFallback && id) {
            setTriedFallback(true);
          } else {
            setFailed(true);
          }
        }}
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
