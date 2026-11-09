import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpRight, Download, Check } from 'lucide-react';
import { DepartmentMark, Portrait, getTeamAbbr } from './DepartmentMark';
import type { MatchdayHighlight } from '../../data/motm';

interface MotmPosterProps {
  highlight: MatchdayHighlight;
  showDownload?: boolean;
}

export function MotmPoster({ highlight, showDownload = false }: MotmPosterProps) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const { player, photoUrl, department, homeTeam, awayTeam, homeScore, awayScore, stats, matchday, stage, matchId } = highlight;

  // Filter actual statistics that exist (never show 0 values or fake stats)
  const statCards: { value: string | number; label: string }[] = [];
  if (stats.goals > 0) statCards.push({ value: stats.goals, label: stats.goals === 1 ? 'Goal' : 'Goals' });
  if (stats.assists > 0) statCards.push({ value: stats.assists, label: stats.assists === 1 ? 'Assist' : 'Assists' });
  if (stats.cleanSheet) statCards.push({ value: '1', label: 'Clean Sheet' });
  if (stats.yellowCard) statCards.push({ value: '1', label: 'Yellow Card' });
  if (statCards.length === 0) statCards.push({ value: '★', label: 'Match MVP' });

  const posLabel =
    player.position === 'FWD'
      ? 'Forward'
      : player.position === 'MID'
      ? 'Midfielder'
      : player.position === 'DEF'
      ? 'Defender'
      : player.position === 'GK'
      ? 'Goalkeeper'
      : player.position || 'Player';

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;

    try {
      setDownloading(true);

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1440;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Deep cinematic stadium background
      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, 1080, 1440);

      // Stadium floodlights: Top-left spotlight focused on player stage
      const floodlightLeft = ctx.createRadialGradient(280, 220, 60, 280, 480, 680);
      floodlightLeft.addColorStop(0, 'rgba(245, 197, 24, 0.16)');
      floodlightLeft.addColorStop(0.35, 'rgba(24, 42, 80, 0.40)');
      floodlightLeft.addColorStop(1, 'rgba(4, 7, 17, 0)');
      ctx.fillStyle = floodlightLeft;
      ctx.fillRect(0, 0, 1080, 1440);

      // Stadium floodlights: Top-right ambient beam
      const floodlightRight = ctx.createRadialGradient(840, 200, 50, 840, 450, 600);
      floodlightRight.addColorStop(0, 'rgba(100, 160, 255, 0.12)');
      floodlightRight.addColorStop(0.45, 'rgba(16, 28, 54, 0.25)');
      floodlightRight.addColorStop(1, 'rgba(4, 7, 17, 0)');
      ctx.fillStyle = floodlightRight;
      ctx.fillRect(0, 0, 1080, 1440);

      // Subtle diagonal stadium light sweeps
      ctx.save();
      const sweepGrad = ctx.createLinearGradient(0, 0, 1080, 1440);
      sweepGrad.addColorStop(0, 'rgba(245, 197, 24, 0.04)');
      sweepGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.015)');
      sweepGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, 1080, 1440);
      ctx.restore();

      // Outer gold border frame with cinematic corner brackets
      ctx.strokeStyle = 'rgba(245, 197, 24, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 36, 1008, 1368);

      // Corner geometric brackets
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth = 6;
      const bSize = 42;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(36, 36 + bSize);
      ctx.lineTo(36, 36);
      ctx.lineTo(36 + bSize, 36);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(1044 - bSize, 36);
      ctx.lineTo(1044, 36);
      ctx.lineTo(1044, 36 + bSize);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(36, 1404 - bSize);
      ctx.lineTo(36, 1404);
      ctx.lineTo(36 + bSize, 1404);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(1044 - bSize, 1404);
      ctx.lineTo(1044, 1404);
      ctx.lineTo(1044, 1404 - bSize);
      ctx.stroke();

      // 2. HEADER: Tournament Branding & Matchday Badge
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DIRE DAWA UNIVERSITY SUPER CUP', 72, 86);

      ctx.fillStyle = '#f5c518';
      ctx.font = '800 15px sans-serif';
      ctx.fillText('FOOTBALL TOURNAMENT · OFFICIAL SPOTLIGHT', 72, 112);

      // Matchday badge (top right)
      ctx.fillStyle = '#f5c518';
      roundRect(ctx, 830, 62, 184, 52, 8);
      ctx.fill();
      ctx.fillStyle = '#060913';
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`MATCHDAY ${matchday}`, 922, 96);

      // 3. MAIN SECTION: Left (Player Stage, ~45-50% width) & Right (Player Info & Stats)
      const stageX = 64;
      const stageY = 150;
      const stageW = 460;
      const stageH = 720;

      // Draw Left Player Stage Container
      ctx.save();
      roundRect(ctx, stageX, stageY, stageW, stageH, 18);
      ctx.clip();

      // Stage backdrop
      const stageBg = ctx.createLinearGradient(stageX, stageY, stageX, stageY + stageH);
      stageBg.addColorStop(0, '#101c36');
      stageBg.addColorStop(0.5, '#0c1426');
      stageBg.addColorStop(1, '#060913');
      ctx.fillStyle = stageBg;
      ctx.fillRect(stageX, stageY, stageW, stageH);

      // Load & Draw Actual Player Photo
      let photoDrawn = false;
      if (photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = photoUrl;
          });

          // Intelligent framing preserving full head, face, shoulders & upper body
          const imgRatio = img.width / img.height;
          const stageRatio = stageW / stageH;
          let drawW = stageW;
          let drawH = stageH;
          let drawX = stageX;
          let drawY = stageY;

          if (imgRatio > stageRatio) {
            // Wider image: scale to match height, center horizontally
            drawW = stageH * imgRatio;
            drawX = stageX - (drawW - stageW) / 2;
          } else {
            // Taller image: anchor to TOP so head & face are completely visible
            drawH = stageW / imgRatio;
            drawY = stageY;
          }

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          photoDrawn = true;
        } catch {
          photoDrawn = false;
        }
      }

      if (!photoDrawn) {
        // Fallback athlete silhouette block
        ctx.fillStyle = department.color || '#1e293b';
        ctx.fillRect(stageX + stageW / 2 - 120, stageY + 140, 240, 320);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 110px sans-serif';
        ctx.textAlign = 'center';
        const initials = player.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'P';
        ctx.fillText(initials, stageX + stageW / 2, stageY + 320);
      }

      // Soft bottom blend ONLY at the bottom 90px (does NOT cover face/shoulders)
      const bottomFade = ctx.createLinearGradient(stageX, stageY + stageH - 90, stageX, stageY + stageH);
      bottomFade.addColorStop(0, 'rgba(6, 9, 19, 0)');
      bottomFade.addColorStop(1, '#060913');
      ctx.fillStyle = bottomFade;
      ctx.fillRect(stageX, stageY + stageH - 90, stageW, 90);

      ctx.restore();

      // Border on player stage
      ctx.strokeStyle = 'rgba(245, 197, 24, 0.45)';
      ctx.lineWidth = 2.5;
      roundRect(ctx, stageX, stageY, stageW, stageH, 18);
      ctx.stroke();

      // RIGHT COLUMN: Award Headline, Player Name, Metadata & Stat Panels
      const infoX = 560;
      const infoY = 170;
      const infoW = 456;

      // Gold headline bar
      ctx.fillStyle = '#f5c518';
      ctx.fillRect(infoX, infoY, 44, 4);

      ctx.fillStyle = '#f5c518';
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MAN OF THE MATCH', infoX + 56, infoY + 12);

      // Player Name (Responsive font sizing for long names)
      let nameFontSize = 52;
      ctx.font = `900 ${nameFontSize}px sans-serif`;
      const nameUpper = player.name.toUpperCase();
      while (ctx.measureText(nameUpper).width > infoW && nameFontSize > 28) {
        nameFontSize -= 4;
        ctx.font = `900 ${nameFontSize}px sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(nameUpper, infoX, infoY + 80);

      // Jersey Number, Position & Department Meta
      const metaY = infoY + 125;
      // Jersey number pill
      ctx.fillStyle = '#f5c518';
      roundRect(ctx, infoX, metaY - 24, 62, 34, 6);
      ctx.fill();
      ctx.fillStyle = '#060913';
      ctx.font = '900 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${player.number}`, infoX + 31, metaY - 1);

      // Position
      ctx.fillStyle = '#f5c518';
      ctx.font = '800 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(posLabel.toUpperCase(), infoX + 78, metaY - 1);

      // Department Full Name & Crest Badge
      const deptY = metaY + 48;
      ctx.fillStyle = department.color || '#3b82f6';
      roundRect(ctx, infoX, deptY - 24, 40, 32, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 16px sans-serif';
      ctx.textAlign = 'center';
      const deptAbbr = getTeamAbbr(department.shortName, department.name, department.id);
      ctx.fillText(deptAbbr, infoX + 20, deptY - 3);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(department.name.toUpperCase(), infoX + 52, deptY - 2);

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(infoX, deptY + 28);
      ctx.lineTo(infoX + infoW, deptY + 28);
      ctx.stroke();

      // Broadcast Stat Panels (Grid on the right)
      const statsStartY = deptY + 54;
      const panelW = 216;
      const panelH = 110;
      const panelGap = 16;

      statCards.slice(0, 4).forEach((sc, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const px = infoX + col * (panelW + panelGap);
        const py = statsStartY + row * (panelH + panelGap);

        // Panel background
        ctx.fillStyle = '#0c1527';
        roundRect(ctx, px, py, panelW, panelH, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 197, 24, 0.35)';
        ctx.lineWidth = 2;
        roundRect(ctx, px, py, panelW, panelH, 14);
        ctx.stroke();

        // Accent gold indicator at top of panel
        ctx.fillStyle = '#f5c518';
        roundRect(ctx, px + 16, py, 36, 4, 2);
        ctx.fill();

        // Metric value
        ctx.fillStyle = '#f5c518';
        ctx.font = '900 44px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(sc.value), px + 20, py + 56);

        // Metric label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '800 16px sans-serif';
        ctx.fillText(sc.label.toUpperCase(), px + 20, py + 88);
      });

      // 4. SCOREBOARD SECTION: Full-width broadcast bar at the bottom
      const boardX = 64;
      const boardY = 900;
      const boardW = 952;
      const boardH = 250;

      // Scoreboard container
      const boardBg = ctx.createLinearGradient(boardX, boardY, boardX + boardW, boardY);
      boardBg.addColorStop(0, '#0a1324');
      boardBg.addColorStop(0.5, '#101d36');
      boardBg.addColorStop(1, '#0a1324');
      ctx.fillStyle = boardBg;
      roundRect(ctx, boardX, boardY, boardW, boardH, 20);
      ctx.fill();

      ctx.strokeStyle = 'rgba(245, 197, 24, 0.35)';
      ctx.lineWidth = 2.5;
      roundRect(ctx, boardX, boardY, boardW, boardH, 20);
      ctx.stroke();

      // Home Team (Left side of scoreboard)
      ctx.fillStyle = homeTeam.color || '#3b82f6';
      roundRect(ctx, boardX + 40, boardY + 45, 72, 72, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(homeTeam.short_name.slice(0, 3), boardX + 76, boardY + 92);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(homeTeam.short_name.toUpperCase(), boardX + 130, boardY + 76);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '700 16px sans-serif';
      ctx.fillText((homeTeam.name || homeTeam.short_name).slice(0, 22), boardX + 130, boardY + 104);

      // Large Final Score in Center
      ctx.fillStyle = '#f5c518';
      ctx.font = '900 86px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${homeScore} – ${awayScore}`, 540, boardY + 108);

      // "CONFIRMED FINAL" pill beneath score
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      roundRect(ctx, 430, boardY + 130, 220, 36, 18);
      ctx.fill();
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 430, boardY + 130, 220, 36, 18);
      ctx.stroke();

      ctx.fillStyle = '#f5c518';
      ctx.font = '900 15px sans-serif';
      ctx.fillText('CONFIRMED FINAL', 540, boardY + 154);

      // Away Team (Right side of scoreboard)
      ctx.fillStyle = awayTeam.color || '#ef4444';
      roundRect(ctx, boardX + boardW - 112, boardY + 45, 72, 72, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(awayTeam.short_name.slice(0, 3), boardX + boardW - 76, boardY + 92);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(awayTeam.short_name.toUpperCase(), boardX + boardW - 130, boardY + 76);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '700 16px sans-serif';
      ctx.fillText((awayTeam.name || awayTeam.short_name).slice(0, 22), boardX + boardW - 130, boardY + 104);

      // Matchday & stage sub-bar inside scoreboard
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(boardX + 30, boardY + 195);
      ctx.lineTo(boardX + boardW - 30, boardY + 195);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '800 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`MATCHDAY ${matchday}  ·  ${stage.toUpperCase()}`, 540, boardY + 228);

      // 5. FOOTER
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '700 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DIRE DAWA UNIVERSITY SUPER CUP · OFFICIAL PLAYER OF THE MATCH AWARD', 540, 1370);

      // Export as PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cleanName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        a.href = url;
        a.download = `motm-matchday-${matchday}-${cleanName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 3000);
      }, 'image/png');
    } catch {
      // Fallback
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/match/${matchId}`)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl border border-[#f5c518]/30 bg-gradient-to-b from-[#080d1b] via-[#050813] to-[#04060e] p-3 sm:p-5 md:p-6 shadow-2xl transition-all duration-300 hover:border-[#f5c518]/70 hover:shadow-2xl hover:shadow-[#f5c518]/15"
    >
      {/* Cinematic corner gold brackets */}
      <span className="pointer-events-none absolute left-2.5 top-2.5 sm:left-3 sm:top-3 h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 border-l-2 border-t-2 border-[#f5c518]" />
      <span className="pointer-events-none absolute right-2.5 top-2.5 sm:right-3 sm:top-3 h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 border-r-2 border-t-2 border-[#f5c518]" />
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 border-b-2 border-l-2 border-[#f5c518]" />
      <span className="pointer-events-none absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 border-b-2 border-r-2 border-[#f5c518]" />

      {/* Atmospheric stadium floodlights */}
      <div
        className="pointer-events-none absolute -top-16 left-1/4 h-48 sm:h-64 w-60 sm:w-80 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #f5c518 0%, rgba(16, 28, 54, 0) 70%)' }}
      />
      <div
        className="pointer-events-none absolute -top-16 right-1/4 h-48 sm:h-64 w-60 sm:w-80 translate-x-1/2 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, rgba(16, 28, 54, 0) 70%)' }}
      />

      {/* 1. TOP SECTION: Tournament Branding & Matchday Label */}
      <div className="relative mb-2 sm:mb-4 flex items-center justify-between border-b border-white/10 pb-2 sm:pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <img
            src="/brand/ddu-logo.png"
            alt="DDU"
            className="h-5 w-5 sm:h-8 sm:w-8 object-contain opacity-95 brightness-110 drop-shadow"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white/90 leading-tight">
              DDU SUPER CUP
            </p>
            <p className="text-[7px] sm:text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#f5c518] leading-tight">
              FOOTBALL TOURNAMENT
            </p>
          </div>
        </div>

        <span className="rounded bg-[#f5c518] px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#060913] shadow-md">
          MATCHDAY {matchday}
        </span>
      </div>

      {/* 2. MAIN SECTION: Mobile Compact Vertical / Desktop Cinematic 2-Column */}
      <div className="relative flex flex-col sm:grid sm:grid-cols-12 gap-2.5 sm:gap-6 items-stretch">
        {/* Player Photograph: Compact portrait on phone (320-430px wide), full column on desktop */}
        <div className="sm:col-span-5 relative mx-auto sm:mx-0 w-32 xs:w-36 sm:w-full h-36 xs:h-40 sm:h-auto sm:min-h-[360px] overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-b from-[#121e38] via-[#0b1324] to-[#050811] flex items-center justify-center shadow-inner">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={player.name}
              crossOrigin="anonymous"
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center py-2 sm:py-10">
              <Portrait name={player.name} size={64} className="sm:hidden" />
              <Portrait name={player.name} size={110} className="hidden sm:block" />
            </div>
          )}

          {/* Edge vignette blending without covering the player's face */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_16px_rgba(5,8,17,0.7)] sm:shadow-[inset_0_0_24px_rgba(5,8,17,0.7)]" />
          {/* Subtle bottom edge fade only at the lowest 12% */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 sm:h-16 bg-gradient-to-t from-[#050811] via-[#050811]/40 to-transparent" />
        </div>

        {/* Info & Stats: Compact on mobile, expansive on desktop */}
        <div className="sm:col-span-7 flex flex-col justify-between text-center sm:text-left py-0 sm:py-1">
          <div>
            {/* Award Headline */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <span className="h-[2px] w-4 sm:w-6 bg-[#f5c518]" />
              <span className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-[0.2em] text-[#f5c518]">
                MAN OF THE MATCH
              </span>
              <span className="h-[2px] w-4 bg-[#f5c518] sm:hidden" />
            </div>

            {/* Player Full Name in Large Bold Typography */}
            <h3 className="mt-0.5 sm:mt-1.5 text-base xs:text-lg sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-white drop-shadow leading-tight transition-colors group-hover:text-[#f5c518]">
              {player.name}
            </h3>

            {/* Player Jersey Number, Position & Department */}
            <div className="mt-1 sm:mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-bold text-white/80">
              <span className="rounded bg-[#f5c518] px-1 py-0.2 text-[9px] sm:text-xs font-black text-[#060913]">
                #{player.number}
              </span>
              <span className="uppercase text-[#f5c518]/90 font-black">{posLabel}</span>
              <span className="text-white/30">|</span>
              <div className="inline-flex items-center gap-1 sm:gap-1.5">
                <DepartmentMark
                  id={department.id}
                  name={department.name}
                  shortName={department.shortName}
                  color={department.color}
                  size={14}
                  src={department.crestUrl || undefined}
                />
                <span className="text-white font-extrabold">{department.name}</span>
              </div>
            </div>
          </div>

          {/* Broadcast Stat Panels: Compact badges on mobile, rich broadcast panels on desktop */}
          <div className="mt-2 sm:mt-4 flex flex-wrap sm:grid sm:grid-cols-2 items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5">
            {statCards.map((stat, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-md sm:rounded-xl border border-[#f5c518]/25 bg-[#0a1222]/90 px-2 py-0.5 sm:p-2.5 backdrop-blur-sm transition-colors hover:border-[#f5c518]/60 flex sm:block items-center gap-1.5"
              >
                <div className="hidden sm:block absolute left-0 top-0 h-[2px] w-8 bg-[#f5c518]" />
                <div className="text-xs sm:text-xl lg:text-2xl font-black text-[#f5c518] leading-none">{stat.value}</div>
                <div className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. SCOREBOARD SECTION: Compact broadcast bottom bar on mobile */}
      <div className="relative mt-2.5 sm:mt-5 rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-r from-[#091122] via-[#0d182e] to-[#091122] p-2 sm:p-3.5 md:p-4 shadow-lg">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Home Team */}
          <div className="flex flex-1 items-center gap-1.5 sm:gap-3 min-w-0">
            <DepartmentMark
              id={homeTeam.id}
              name={homeTeam.name}
              shortName={homeTeam.short_name}
              color={homeTeam.color}
              size={24}
              src={homeTeam.logo_url}
            />
            <div className="min-w-0">
              <span className="block truncate text-xs sm:text-base font-black text-white uppercase">{homeTeam.short_name}</span>
              <span className="hidden sm:block truncate text-[11px] font-medium text-white/50">{homeTeam.name}</span>
            </div>
          </div>

          {/* Centered Final Score */}
          <div className="flex flex-col items-center px-2 sm:px-6">
            <div className="text-lg xs:text-xl sm:text-3xl md:text-4xl font-black tracking-wider sm:tracking-widest text-[#f5c518] drop-shadow-md">
              {homeScore} <span className="text-white/60 font-light mx-0.5">–</span> {awayScore}
            </div>
            <span className="mt-0.2 rounded-full bg-white/10 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.18em] text-[#f5c518]">
              FINAL
            </span>
          </div>

          {/* Away Team */}
          <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-3 min-w-0 text-right">
            <div className="min-w-0">
              <span className="block truncate text-xs sm:text-base font-black text-white uppercase">{awayTeam.short_name}</span>
              <span className="hidden sm:block truncate text-[11px] font-medium text-white/50">{awayTeam.name}</span>
            </div>
            <DepartmentMark
              id={awayTeam.id}
              name={awayTeam.name}
              shortName={awayTeam.short_name}
              color={awayTeam.color}
              size={24}
              src={awayTeam.logo_url}
            />
          </div>
        </div>

        {/* Matchday & stage sub-bar */}
        <div className="mt-1 sm:mt-2.5 border-t border-white/5 pt-1 sm:pt-2 text-center text-[8px] sm:text-[10px] font-bold tracking-widest uppercase text-white/40">
          MATCHDAY {matchday} · {stage.toUpperCase()}
        </div>
      </div>

      {/* 4. FOOTER: Match details link & PNG download */}
      <div className="relative mt-2 sm:mt-3.5 flex items-center justify-between border-t border-white/10 pt-2 sm:pt-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/match/${matchId}`);
          }}
          className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-white/70 transition-colors hover:text-[#f5c518]"
        >
          Match details <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#f5c518]" />
        </button>

        {showDownload && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-[#f5c518]/40 bg-[#f5c518]/10 px-2.5 py-1 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#f5c518] transition-all hover:bg-[#f5c518] hover:text-[#080c14] active:scale-95 shadow-md"
            title="Download official Man of the Match poster (PNG)"
          >
            {downloaded ? (
              <>
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                <span className="text-emerald-400">Downloaded</span>
              </>
            ) : downloading ? (
              <span>Exporting...</span>
            ) : (
              <>
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Download Poster</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
