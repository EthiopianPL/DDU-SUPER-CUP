interface DepartmentMarkProps {
  shortName: string;
  color: string;
  size?: number;
}

export function DepartmentMark({ shortName, color, size = 40 }: DepartmentMarkProps) {
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
