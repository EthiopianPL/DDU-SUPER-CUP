interface DepartmentMarkProps {
  shortName: string;
  color: string;
  size?: number;
  src?: string;
}

export function DepartmentMark({ shortName, color, size = 40, src }: DepartmentMarkProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
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

export function Portrait({ name, src, size = 36 }: { name: string; src?: string; size?: number }) {
  if (src) {
    return <img src={src} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/10 font-black text-white/80"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
