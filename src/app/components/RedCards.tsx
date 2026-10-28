export function RedCards({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" aria-label={`${count} red ${count === 1 ? 'card' : 'cards'}`}>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="inline-block h-3.5 w-2.5 rounded-[1.5px] bg-[#e11d48] shadow-[0_1px_2px_rgba(0,0,0,0.8)] ring-1 ring-black/40"
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
