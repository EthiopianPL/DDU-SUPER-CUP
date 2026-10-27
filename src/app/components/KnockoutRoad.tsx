import { useNavigate } from 'react-router';
import { knockoutRoad, thirdPlaceTie, type RoadSide, type RoadTie } from '../../data/knockout';

export function KnockoutRoad() {
  const navigate = useNavigate();
  const ties = knockoutRoad();
  const pick = (stage: RoadTie['stage'], slot: number) => ties.find((tie) => tie.stage === stage && tie.slot === slot)!;
  const open = (id: string) => navigate(`/match/${id}`);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="min-w-[940px] rounded-[28px] border border-white/10 bg-[#05070c] px-4 py-6 shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]">
        <header className="mb-5 text-center">
          <h2 className="text-3xl font-black tracking-[0.08em] text-white">KNOCKOUT STAGE</h2>
          <p className="mt-1 text-xs font-black tracking-[0.22em] text-[#f5c518]">DIRE DAWA UNIVERSITY SUPER CUP</p>
        </header>
        <div className="flex items-stretch justify-center">
          <Side r16={[pick('r16', 1), pick('r16', 2), pick('r16', 3), pick('r16', 4)]} qf={[pick('qf', 1), pick('qf', 2)]} sf={pick('sf', 1)} side="left" onOpen={open} />
          <div className="flex items-center">
            <span className="h-px w-6 bg-white/70" />
          </div>
          <Center final={pick('final', 1)} third={thirdPlaceTie()} onOpen={open} />
          <div className="flex items-center">
            <span className="h-px w-6 bg-white/70" />
          </div>
          <Side r16={[pick('r16', 5), pick('r16', 6), pick('r16', 7), pick('r16', 8)]} qf={[pick('qf', 3), pick('qf', 4)]} sf={pick('sf', 2)} side="right" onOpen={open} />
        </div>
      </div>
    </div>
  );
}

function Side({
  r16,
  qf,
  sf,
  side,
  onOpen,
}: {
  r16: RoadTie[];
  qf: RoadTie[];
  sf: RoadTie;
  side: 'left' | 'right';
  onOpen: (id: string) => void;
}) {
  const reverse = side === 'right' ? 'flex-row-reverse' : '';
  return (
    <div className={`flex items-stretch ${reverse}`}>
      <div className="flex flex-col justify-center">
        {chunk(r16).map((pair, index) => (
          <div key={pair[0].slot} className={`flex items-stretch ${reverse}`}>
            <div className="flex flex-col justify-center gap-1.5 py-1.5">
              <MatchBox tie={pair[0]} onOpen={onOpen} />
              <MatchBox tie={pair[1]} onOpen={onOpen} />
            </div>
            <Elbow side={side} />
            <div className="flex items-center">
              <MatchBox tie={qf[index]} onOpen={onOpen} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-stretch py-8">
        <Elbow side={side} />
      </div>
      <div className="flex items-center">
        <MatchBox tie={sf} onOpen={onOpen} />
      </div>
    </div>
  );
}

function Center({ final, third, onOpen }: { final: RoadTie; third: RoadTie; onOpen: (id: string) => void }) {
  return (
    <div className="relative flex w-[132px] items-center justify-center">
      <div className="w-full">
        <p className="mb-1 text-center text-[10px] font-black tracking-[0.22em] text-[#f5c518]">FINAL</p>
        <MatchBox tie={final} onOpen={onOpen} />
      </div>
      <div className="absolute top-[calc(50%+42px)] w-full">
        <p className="mb-1 text-center text-[10px] font-black tracking-[0.16em] text-white/45">3RD PLACE</p>
        <MatchBox tie={third} onOpen={onOpen} />
      </div>
    </div>
  );
}

function Elbow({ side }: { side: 'left' | 'right' }) {
  const edge = side === 'left' ? 'border-r' : 'border-l';
  return (
    <div className="flex w-4 flex-col self-stretch py-3">
      <div className={`flex-1 border-t ${edge} border-white/70`} />
      <div className={`flex-1 border-b ${edge} border-white/70`} />
    </div>
  );
}

function MatchBox({ tie, onOpen }: { tie: RoadTie; onOpen: (id: string) => void }) {
  const fixture = tie.fixture;
  const scored = fixture && fixture.status !== 'upcoming';
  const body = (
    <>
      <TeamLine side={tie.home} score={scored ? fixture.homeScore : undefined} />
      <TeamLine side={tie.away} score={scored ? fixture.awayScore : undefined} />
    </>
  );
  const className = 'w-[118px] overflow-hidden rounded-[3px] border border-white/30 bg-black/55 text-left';
  if (!fixture) return <div className={className}>{body}</div>;
  return (
    <button type="button" className={`${className} hover:border-[#f5c518]`} onClick={() => onOpen(fixture.id)}>
      {body}
    </button>
  );
}

function TeamLine({ side, score }: { side: RoadSide; score?: number }) {
  const name = side.team?.shortName || side.label;
  return (
    <div className="flex h-5 items-center gap-1 border-b border-white/10 px-1 last:border-b-0">
      <span className="h-3.5 w-1 shrink-0 rounded-[1px]" style={{ background: side.team?.color || '#334155' }} />
      <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wide text-white">{name}</span>
      {score != null && <span className="font-mono text-[10px] font-black text-white">{score}</span>}
    </div>
  );
}

function chunk(ties: RoadTie[]) {
  const pairs: RoadTie[][] = [];
  for (let index = 0; index < ties.length; index += 2) pairs.push(ties.slice(index, index + 2));
  return pairs;
}
