import type { ShootoutSummary } from '../../data/supercup';

interface Props {
  summary: ShootoutSummary;
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
}

type Outcome = 'scored' | 'saved' | 'missed';

function KickDot({ outcome, pending = false }: { outcome?: Outcome; pending?: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-white/20 text-white/20 text-xs">
        ·
      </span>
    );
  }
  if (outcome === 'scored') {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-sm font-black">
        ✓
      </span>
    );
  }
  if (outcome === 'saved') {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs font-bold">
        S
      </span>
    );
  }
  // missed
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-black">
      ✕
    </span>
  );
}

function KickRow({
  round,
  homeKick,
  awayKick,
  totalRounds,
  currentRound,
  nextSide,
  isDecided,
}: {
  round: number;
  homeKick?: { playerName: string; playerNumber?: number; outcome: Outcome };
  awayKick?: { playerName: string; playerNumber?: number; outcome: Outcome };
  totalRounds: number;
  currentRound: number;
  nextSide: 'home' | 'away';
  isDecided: boolean;
}) {
  const homePending = !homeKick && round <= totalRounds && !isDecided && (round < currentRound || (round === currentRound && nextSide === 'home'));
  const awayPending = !awayKick && round <= totalRounds && !isDecided && (round < currentRound || (round === currentRound && nextSide === 'away'));
  const homeFuture = !homeKick && !homePending;
  const awayFuture = !awayKick && !awayPending;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1">
      {/* Home side */}
      <div className="flex items-center justify-end gap-2 min-w-0">
        {homeKick ? (
          <span className="truncate text-right text-xs text-white/70">
            {homeKick.playerNumber != null && (
              <span className="font-mono text-white/40 mr-1">#{homeKick.playerNumber}</span>
            )}
            {homeKick.playerName}
          </span>
        ) : !homeFuture ? (
          <span className="text-xs text-white/30">—</span>
        ) : null}
        {homeKick ? (
          <KickDot outcome={homeKick.outcome} />
        ) : homePending ? (
          <KickDot pending />
        ) : (
          <span className="h-7 w-7" />
        )}
      </div>

      {/* Round number */}
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-white/40">
        {round}
      </span>

      {/* Away side */}
      <div className="flex items-center justify-start gap-2 min-w-0">
        {awayKick ? (
          <KickDot outcome={awayKick.outcome} />
        ) : awayPending ? (
          <KickDot pending />
        ) : (
          <span className="h-7 w-7" />
        )}
        {awayKick ? (
          <span className="truncate text-left text-xs text-white/70">
            {awayKick.playerNumber != null && (
              <span className="font-mono text-white/40 mr-1">#{awayKick.playerNumber}</span>
            )}
            {awayKick.playerName}
          </span>
        ) : !awayFuture ? (
          <span className="text-xs text-white/30">—</span>
        ) : null}
      </div>
    </div>
  );
}

export function PenaltyShootoutBoard({ summary, homeName, awayName, homeColor, awayColor }: Props) {
  const { homeKicks, awayKicks, homeScore, awayScore, rounds, nextSide, isDecided, isSuddenDeath, winnerSide } = summary;

  // Determine which rounds to render
  const totalRounds = Math.max(5, rounds);
  const currentRound = Math.max(homeKicks.length, awayKicks.length) + 1;

  const roundNumbers = Array.from({ length: totalRounds }, (_, i) => i + 1);

  const winnerName = winnerSide === 'home' ? homeName : winnerSide === 'away' ? awayName : null;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0c1424]">
      {/* Header: Team names + Score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 bg-[#10192b] px-4 py-3">
        <div className="text-left">
          <p className="truncate text-xs font-bold text-white/80">{homeName}</p>
          <p
            className="mt-0.5 font-mono text-3xl font-black"
            style={{ color: homeColor || '#f5c518' }}
          >
            {homeScore}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[9px] font-black tracking-widest text-white/30 uppercase">
            {isSuddenDeath ? 'Sudden Death' : 'Penalty Shootout'}
          </p>
          <p className="mt-0.5 text-sm font-black text-white/50">—</p>
        </div>

        <div className="text-right">
          <p className="truncate text-xs font-bold text-white/80">{awayName}</p>
          <p
            className="mt-0.5 font-mono text-3xl font-black"
            style={{ color: awayColor || '#a78bfa' }}
          >
            {awayScore}
          </p>
        </div>
      </div>

      {/* Kick rows */}
      <div className="px-4 py-2">
        {/* Column labels */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-1 border-b border-white/5 mb-1">
          <p className="text-right text-[9px] font-black tracking-widest text-white/25 uppercase">{homeName}</p>
          <span className="w-5" />
          <p className="text-left text-[9px] font-black tracking-widest text-white/25 uppercase">{awayName}</p>
        </div>

        {roundNumbers.map((round) => {
          const homeKick = homeKicks.find((k) => k.round === round);
          const awayKick = awayKicks.find((k) => k.round === round);
          return (
            <KickRow
              key={round}
              round={round}
              homeKick={homeKick}
              awayKick={awayKick}
              totalRounds={totalRounds}
              currentRound={currentRound}
              nextSide={nextSide}
              isDecided={isDecided}
            />
          );
        })}
      </div>

      {/* Winner banner */}
      {winnerName && (
        <div className="border-t border-[#f5c518]/20 bg-[#f5c518]/10 px-4 py-2.5 text-center">
          <p className="text-xs font-black tracking-wide text-[#f5c518] uppercase">
            🏆 {winnerName} wins on penalties
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 border-t border-white/5 px-4 py-2 bg-[#0c1424]">
        <span className="flex items-center gap-1 text-[10px] text-white/35">
          <KickDot outcome="scored" /> Scored
        </span>
        <span className="flex items-center gap-1 text-[10px] text-white/35">
          <KickDot outcome="saved" /> Saved
        </span>
        <span className="flex items-center gap-1 text-[10px] text-white/35">
          <KickDot outcome="missed" /> Missed
        </span>
      </div>
    </div>
  );
}

