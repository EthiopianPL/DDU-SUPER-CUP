interface BrandLockupProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const imageSize = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
};

export function BrandLockup({ size = 'md', onClick }: BrandLockupProps) {
  const content = (
    <>
      <img
        src="/brand/ddu-logo.png"
        alt="Dire Dawa University"
        className={`${imageSize[size]} object-contain`}
      />
      <span className="text-left leading-none">
        <span className="block text-[10px] font-semibold tracking-[0.16em] text-[#f5c518]">
          DIRE DAWA UNIVERSITY
        </span>
        <span className={`mt-1 block font-black tracking-[0.14em] text-white ${size === 'lg' ? 'text-2xl' : 'text-sm'}`}>
          SUPERCUP
        </span>
      </span>
    </>
  );

  if (!onClick) {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 text-left">
      {content}
    </button>
  );
}
