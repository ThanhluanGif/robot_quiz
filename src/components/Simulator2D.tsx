import React, { useEffect, useRef } from 'react';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../data/enjoyAiMat';
import { QuizDefinition, SimulationSnapshot } from '../types/robotics';
import { drawEnjoyAiMat } from '../utils/matTexture';

interface Simulator2DProps {
  quiz: QuizDefinition;
  snapshot: SimulationSnapshot;
  showReferencePath: boolean;
  showSensorOverlay: boolean;
}

export const Simulator2D: React.FC<Simulator2DProps> = ({
  quiz,
  snapshot,
  showReferencePath,
  showSensorOverlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCacheRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(640, canvas.clientWidth || 720);
    const ch = Math.round((cw * BOARD_HEIGHT) / BOARD_WIDTH);

    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }

    const w = canvas.width;
    const h = canvas.height;
    const sx = w / BOARD_WIDTH;
    const sy = h / BOARD_HEIGHT;

    const cacheKey = `${quiz.slug}_${w}_${h}_${showReferencePath}_${snapshot.completedMissionIds.join(',')}`;
    if (!bgCacheRef.current || bgCacheRef.current.key !== cacheKey) {
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const offCtx = off.getContext('2d');
      if (offCtx) {
        drawEnjoyAiMat(offCtx, w, h, quiz, {
          showZoneFootprints: true,
          showReferencePath,
          completedMissionIds: snapshot.completedMissionIds,
        });
      }
      bgCacheRef.current = { key: cacheKey, canvas: off };
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bgCacheRef.current.canvas, 0, 0);

    // Draw robot trail
    if (snapshot.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = Math.max(2, 10 * sx);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(snapshot.trail[0].x * sx, snapshot.trail[0].y * sy);
      for (let i = 1; i < snapshot.trail.length; i++) {
        ctx.lineTo(snapshot.trail[i].x * sx, snapshot.trail[i].y * sy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw mission labels cleanly above each station
    const completedSet = new Set(snapshot.completedMissionIds);
    for (const m of quiz.missions) {
      const done = completedSet.has(m.id);
      const cx = (m.x + m.width / 2) * sx;
      const cy = (m.y + m.height / 2) * sy;
      const labelText = done ? `✓ ${m.label}` : m.label;

      ctx.save();
      ctx.font = `700 ${Math.max(10, Math.round(12 * dpr))}px "Plus Jakarta Sans", sans-serif`;
      const textW = ctx.measureText(labelText).width;
      const padX = 7 * dpr;
      const boxH = 20 * dpr;
      const bx = Math.max(6 * dpr, Math.min(w - textW - padX * 2 - 6 * dpr, cx - textW / 2 - padX));
      const by = Math.max(6 * dpr, cy - 26 * dpr);

      ctx.fillStyle = done ? '#059669' : '#ffffff';
      ctx.strokeStyle = done ? '#047857' : '#cbd5e1';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.roundRect(bx, by, textW + padX * 2, boxH, 5 * dpr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = done ? '#ffffff' : '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, bx + padX, by + boxH / 2 + 0.5);
      ctx.restore();
    }

    // Draw obstacle labels with clean high-contrast background
    for (const obs of quiz.obstacles) {
      const cx = (obs.x + obs.width / 2) * sx;
      const cy = (obs.y + obs.height / 2) * sy + 16 * dpr;
      ctx.save();
      ctx.font = `700 ${Math.max(8, Math.round(9.5 * dpr))}px "Plus Jakarta Sans", sans-serif`;
      const tw = ctx.measureText(obs.label).width;
      const px = 4.5 * dpr;
      const bh = 14 * dpr;
      ctx.fillStyle = 'rgba(254, 242, 242, 0.94)';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2 - px, cy - bh / 2, tw + px * 2, bh, 3.5 * dpr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#991b1b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obs.label, cx, cy + 0.5);
      ctx.restore();
    }

    // Draw Robot
    const rx = snapshot.robot.x * sx;
    const ry = snapshot.robot.y * sy;
    const rw = 165 * sx;
    const rh = 148 * sy;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(snapshot.robot.headingRad);

    // Contact shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.beginPath();
    ctx.ellipse(2 * dpr, 3 * dpr, rw * 0.56, rh * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-rw * 0.36, -rh * 0.58, rw * 0.32, rh * 0.16);
    ctx.fillRect(-rw * 0.36, rh * 0.42, rw * 0.32, rh * 0.16);
    ctx.fillRect(rw * 0.08, -rh * 0.58, rw * 0.3, rh * 0.16);
    ctx.fillRect(rw * 0.08, rh * 0.42, rw * 0.3, rh * 0.16);

    // Main white/blue body
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = snapshot.collidingObstacleId ? '#dc2626' : '#1d4ed8';
    ctx.lineWidth = Math.max(1.5, 2.2 * dpr);
    ctx.beginPath();
    ctx.roundRect(-rw * 0.46, -rh * 0.44, rw * 0.92, rh * 0.88, 6 * dpr);
    ctx.fill();
    ctx.stroke();

    // Yellow WhalesBot controller cap
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-rw * 0.22, -rh * 0.24, rw * 0.4, rh * 0.48);

    // Forward direction arrow & articulated arm
    const armExt = Math.sin(snapshot.robot.armAngle) * rw * 0.25;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = Math.max(2, 3 * dpr);
    ctx.beginPath();
    ctx.moveTo(rw * 0.42, -rh * 0.24);
    ctx.lineTo(rw * 0.62 + armExt, -rh * 0.16);
    ctx.moveTo(rw * 0.42, rh * 0.24);
    ctx.lineTo(rw * 0.62 + armExt, rh * 0.16);
    ctx.stroke();

    // 5-channel grayscale sensor bar visualization
    if (showSensorOverlay) {
      const sensorX = 76 * sx;
      const latOffsets = [-64, -32, 0, 32, 64];
      latOffsets.forEach((lat, idx) => {
        const val = snapshot.sensors.channels[idx];
        const isDark = val < 0.45;
        ctx.beginPath();
        ctx.arc(sensorX, lat * sy, Math.max(2.5, 4 * dpr), 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#06b6d4' : '#e2e8f0';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      });
    }

    ctx.restore();
  }, [quiz, snapshot, showReferencePath, showSensorOverlay]);

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-slate-200/80 p-3"
      data-testid="simulator-2d"
    >
      <canvas
        ref={canvasRef}
        className="max-h-full w-full rounded-lg shadow-sm"
        style={{ aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}` }}
      />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-slate-900/85 px-2.5 py-1 text-[11px] font-medium text-slate-100 tabular-nums">
        OXY 2D · 216 × 120 cm · 18.00 px/cm
      </div>
    </div>
  );
};
