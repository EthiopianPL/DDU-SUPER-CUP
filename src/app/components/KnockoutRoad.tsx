import { useNavigate } from 'react-router';
import { knockoutRoad, thirdPlaceTie, type RoadTie } from '../../data/knockout';
import { useLeagueVersion } from '../../data/live';

const CARD_W = 112;
const CARD_H = 52;
const PITCH_W = 1040;
const PITCH_H = 580;

type Box = { x: number; y: number };

const leftX = [12, 164, 316];
const rightX = [916, 764, 612];
const finalX = (PITCH_W - CARD_W) / 2;
const sixteenY = [28, 168, 332, 472];

const leftSixteen = sixteenY.map((y) => ({ x: leftX[0], y }));
const rightSixteen = sixteenY.map((y) => ({ x: rightX[0], y }));
const leftQuarters = [pairY(0), pairY(1)].map((y) => ({ x: leftX[1], y }));
const rightQuarters = [pairY(0), pairY(1)].map((y) => ({ x: rightX[1], y }));
const leftSemi: Box = { x: leftX[2], y: joinY(leftQuarters[0].y, leftQuarters[1].y) };
const rightSemi: Box = { x: rightX[2], y: leftSemi.y };
const finalBox: Box = { x: finalX, y: leftSemi.y };
const thirdBox: Box = { x: finalX, y: 478 };

export function KnockoutRoad() {
  const version = useLeagueVersion();
  const navigate = useNavigate();
  void version;
  const ties = knockoutRoad();
  const pick = (stage: RoadTie['stage'], slot: number) => ties.find((tie) => tie.stage === stage && tie.slot === slot);
  const open = (id: string) => navigate(`/match/${id}`);

  return (
    <section className="-mx-4 overflow-hidden rounded-[28px] border border-[#d4a017]/35 bg-[#05070c] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_50%_0%,#24365c_0%,transparent_58%)] px-4 py-6 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.42em] text-[#f5c518]">Dire Dawa University</p>
        <h2 className="mt-2 text-4xl font-black uppercase tracking-[0.12em] text-white sm:text-5xl">Knockout</h2>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/50">Super Cup · last 16 to the final</p>
      </header>
      <div className="overflow-x-auto px-3 py-5">
        <div className="relative mx-auto" style={{ width: PITCH_W, height: PITCH_H }}>
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5c518]/10 blur-3xl" />
          <BracketLines />
          <ColumnLabel x={leftX[0]} label="Last 16" />
          <ColumnLabel x={leftX[1]} label="Quarters" />
          <ColumnLabel x={leftX[2]} label="Semis" />
          <ColumnLabel x={rightX[2]} label="Semis" />
          <ColumnLabel x={rightX[1]} label="Quarters" />
          <ColumnLabel x={rightX[0]} label="Last 16" />
          {leftSixteen.map((box, index) => (
            <TieCard key={`l16-${index}`} tie={pick('r16', index + 1)} box={box} onOpen={open} />
          ))}
          {rightSixteen.map((box, index) => (
            <TieCard key={`r16-${index}`} tie={pick('r16', index + 5)} box={box} onOpen={open} />
          ))}
          {leftQuarters.map((box, index) => (
            <TieCard key={`lq-${index}`} tie={pick('qf', index + 1)} box={box} onOpen={open} />
          ))}
          {rightQuarters.map((box, index) => (
            <TieCard key={`rq-${index}`} tie={pick('qf', index + 3)} box={box} onOpen={open} />
          ))}
          <TieCard tie={pick('sf', 1)} box={leftSemi} onOpen={open} />
          <TieCard tie={pick('sf', 2)} box={rightSemi} onOpen={open} />
          <div className="absolute flex flex-col items-center" style={{ left: finalBox.x - 16, top: finalBox.y - 86, width: CARD_W + 32 }}>
            <TrophyMark />
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.42em] text-[#f5c518]">Final</p>
          </div>
          <TieCard tie={pick('final', 1)} box={finalBox} onOpen={open} champion />
          <p className="absolute text-center text-[10px] font-black uppercase tracking-[0.28em] text-white/70" style={{ left: thirdBox.x, top: thirdBox.y - 20, width: CARD_W }}>
            3rd place
          </p>
          <TieCard tie={thirdPlaceTie()} box={thirdBox} onOpen={open} />
        </div>
      </div>
    </section>
  );
}

function BracketLines() {
  const paths = [
    spine(leftSixteen[0], leftSixteen[1], leftQuarters[0], 'left'),
    spine(leftSixteen[2], leftSixteen[3], leftQuarters[1], 'left'),
    spine(leftQuarters[0], leftQuarters[1], leftSemi, 'left'),
    spine(leftSemi, leftSemi, finalBox, 'left'),
    spine(rightSixteen[0], rightSixteen[1], rightQuarters[0], 'right'),
    spine(rightSixteen[2], rightSixteen[3], rightQuarters[1], 'right'),
    spine(rightQuarters[0], rightQuarters[1], rightSemi, 'right'),
    spine(rightSemi, rightSemi, finalBox, 'right'),
    [`M ${finalBox.x + CARD_W / 2} ${finalBox.y + CARD_H} V ${thirdBox.y}`],
  ].flat();

  return (
    <svg className="pointer-events-none absolute inset-0" viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} aria-hidden="true">
      {paths.map((path) => (
        <path key={path} d={path} fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function spine(top: Box, bottom: Box, target: Box, side: 'left' | 'right') {
  const fromX = side === 'left' ? top.x + CARD_W : top.x;
  const toX = side === 'left' ? target.x : target.x + CARD_W;
  const rail = side === 'left' ? fromX + (toX - fromX) / 2 : toX + (fromX - toX) / 2;
  const topY = top.y + CARD_H / 2;
  const bottomY = bottom.y + CARD_H / 2;
  const targetY = target.y + CARD_H / 2;
  if (top === bottom) return [`M ${fromX} ${topY} H ${toX}`];
  return [
    `M ${fromX} ${topY} H ${rail} V ${bottomY} H ${fromX}`,
    `M ${rail} ${targetY} H ${toX}`,
  ];
}

function pairY(index: number) {
  const top = sixteenY[index * 2];
  const bottom = sixteenY[index * 2 + 1];
  return (top + CARD_H / 2 + bottom + CARD_H / 2) / 2 - CARD_H / 2;
}

function joinY(top: number, bottom: number) {
  return (top + CARD_H / 2 + bottom + CARD_H / 2) / 2 - CARD_H / 2;
}

function ColumnLabel({ x, label }: { x: number; label: string }) {
  return (
    <p className="absolute top-0 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/40" style={{ left: x, width: CARD_W }}>
      {label}
    </p>
  );
}

function TieCard({
  tie,
  box,
  onOpen,
  champion = false,
}: {
  tie?: RoadTie;
  box: Box;
  onOpen: (id: string) => void;
  champion?: boolean;
}) {
  const fixture = tie?.fixture;
  const className = `absolute overflow-hidden rounded-md border text-left shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${champion ? 'border-[#f5c518] bg-[#1a1406]' : 'border-white/20 bg-[#101726]'}`;
  const body = (
    <>
      <SideRow tie={tie} home />
      <div className="h-px bg-white/10" />
      <SideRow tie={tie} />
    </>
  );
  const style = { left: box.x, top: box.y, width: CARD_W, height: CARD_H };
  if (!fixture) return <article className={className} style={style}>{body}</article>;
  return (
    <button type="button" className={`${className} transition hover:border-[#f5c518]`} style={style} onClick={() => onOpen(fixture.id)}>
      {body}
    </button>
  );
}

function SideRow({ tie, home = false }: { tie?: RoadTie; home?: boolean }) {
  const side = home ? tie?.home : tie?.away;
  const fixture = tie?.fixture;
  const scored = fixture && fixture.status !== 'upcoming';
  const score = scored ? (home ? fixture.homeScore : fixture.awayScore) : undefined;
  const teamId = side?.team?.id;
  const leading = Boolean(scored && teamId && winnerId(fixture) === teamId);
  return (
    <div className="flex h-[25px] items-center gap-1.5 px-1.5">
      <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ background: side?.team?.color || 'rgba(255,255,255,0.22)' }} />
      <span className={`min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wide ${leading ? 'text-[#f5c518]' : 'text-white'}`}>
        {side?.team?.shortName || side?.label || 'TBD'}
      </span>
      {score != null && <span className="font-mono text-[11px] font-black text-white">{score}</span>}
    </div>
  );
}

function winnerId(fixture?: RoadTie['fixture']) {
  if (!fixture || fixture.detail !== 'finished' || !fixture.confirmed) return undefined;
  if (fixture.pensHome != null && fixture.pensAway != null && fixture.pensHome !== fixture.pensAway) {
    return fixture.pensHome > fixture.pensAway ? fixture.homeId : fixture.awayId;
  }
  const home = fixture.homeScore ?? 0;
  const away = fixture.awayScore ?? 0;
  if (home === away) return undefined;
  return home > away ? fixture.homeId : fixture.awayId;
}

function TrophyMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12 drop-shadow" aria-hidden="true">
      <path d="M18 8h28v10c0 10-6 18-14 20-8-2-14-10-14-20V8Z" fill="#f5c518" />
      <path d="M18 14H8c0 9 5 14 10 16M46 14h10c0 9-5 14-10 16" fill="none" stroke="#f5c518" strokeWidth="3" />
      <path d="M28 38h8l2 8H26l2-8Z" fill="#ffe27a" />
      <path d="M20 50h24v5H20z" fill="#f5c518" />
      <circle cx="32" cy="22" r="5" fill="#fff6cc" />
    </svg>
  );
}
