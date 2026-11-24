import { BOARD_HEIGHT, BOARD_WIDTH, ENJOY_AI_LINE_LAYERS } from '../data/enjoyAiMat';
import { QuizDefinition } from '../types/robotics';

/**
 * Renders the Enjoy AI 2026 competition mat onto an HTMLCanvasElement.
 * Produces an authentic high-DPI lilac-lavender competition field with subtle
 * hex grid, exact 13 black line-following tracks, start box ("2026"),
 * central oval star emblem, mission zone footprints, and obstacle hazard markers.
 */
export function drawEnjoyAiMat(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  quiz: QuizDefinition,
  options?: {
    showZoneFootprints?: boolean;
    showReferencePath?: boolean;
    completedMissionIds?: string[];
  }
): void {
  const sx = width / BOARD_WIDTH;
  const sy = height / BOARD_HEIGHT;
  const completedSet = new Set(options?.completedMissionIds || []);

  ctx.save();

  // 1. Dark mat outer frame
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, width, height);

  const borderPx = 22 * sx;
  const innerW = width - borderPx * 2;
  const innerH = height - borderPx * 2;

  // 2. Soft lilac-lavender competition mat base gradient (matches Enjoy AI 2026 official mat)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#c8b4dc');
  bgGrad.addColorStop(0.5, '#d7c9e6');
  bgGrad.addColorStop(1, '#c3b0d9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(borderPx, borderPx, innerW, innerH);

  // 3. Subtle geometric hex/diamond grid across the mat surface
  ctx.save();
  ctx.beginPath();
  ctx.rect(borderPx, borderPx, innerW, innerH);
  ctx.clip();

  ctx.strokeStyle = 'rgba(109, 76, 152, 0.12)';
  ctx.lineWidth = Math.max(1, 2.5 * sx);
  const gridStep = 144 * sx; // 8 cm grid
  for (let gx = borderPx; gx < width; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, borderPx);
    ctx.lineTo(gx, height - borderPx);
    ctx.stroke();
  }
  for (let gy = borderPx; gy < height; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(borderPx, gy);
    ctx.lineTo(width - borderPx, gy);
    ctx.stroke();
  }

  // Decorative subtle diagonal bands like the real competition print
  ctx.fillStyle = 'rgba(139, 92, 246, 0.06)';
  ctx.beginPath();
  ctx.moveTo(width * 0.56, 0);
  ctx.lineTo(width * 0.72, 0);
  ctx.lineTo(width * 0.48, height);
  ctx.lineTo(width * 0.34, height);
  ctx.closePath();
  ctx.fill();

  // Decorative start box ("2026" corner zone in bottom-left)
  const startBoxX = 56 * sx;
  const startBoxY = 1620 * sy;
  const startBoxW = 468 * sx;
  const startBoxH = 485 * sy;
  ctx.fillStyle = '#7c3aed';
  ctx.fillRect(startBoxX, startBoxY, startBoxW, startBoxH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, 6 * sx);
  ctx.strokeRect(startBoxX + 10 * sx, startBoxY + 10 * sy, startBoxW - 20 * sx, startBoxH - 20 * sy);

  // Inner pale lavender pad inside start box
  ctx.fillStyle = 'rgba(245, 243, 255, 0.88)';
  ctx.fillRect(startBoxX + 36 * sx, startBoxY + 36 * sy, startBoxW - 72 * sx, startBoxH - 120 * sy);

  // "2026" label on start box
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.max(12, Math.round(70 * sx))}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('2026', startBoxX + startBoxW / 2, startBoxY + startBoxH - 44 * sy);

  // Central right oval star-pentagon emblem (x ~ 3155, y ~ 1080)
  const starCx = 3158 * sx;
  const starCy = 1080 * sy;
  const outerR = 235 * sx;
  const innerR = 115 * sx;

  ctx.save();
  ctx.translate(starCx, starCy);
  // Soft violet circular halo
  const halo = ctx.createRadialGradient(0, 0, innerR * 0.2, 0, 0, outerR * 1.15);
  halo.addColorStop(0, 'rgba(132, 204, 22, 0.38)');
  halo.addColorStop(0.55, 'rgba(124, 58, 237, 0.25)');
  halo.addColorStop(1, 'rgba(124, 58, 237, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, outerR * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // 5-pointed star emblem
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(109, 40, 217, 0.26)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(132, 204, 22, 0.72)';
  ctx.lineWidth = Math.max(1.5, 8 * sx);
  ctx.stroke();

  // Center bright circle
  ctx.beginPath();
  ctx.arc(0, 0, 56 * sx, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = Math.max(1.2, 5 * sx);
  ctx.stroke();
  ctx.restore();

  // Subtle printed mat title band along bottom border (like physical WhalesBot mat)
  ctx.fillStyle = 'rgba(76, 29, 149, 0.16)';
  ctx.font = `800 ${Math.max(14, Math.round(115 * sx))}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WHALESBOT · ENJOY AI 2026', width * 0.44, 1660 * sy);

  // 4. Exact 13 black line-following tracks
  ctx.strokeStyle = '#111827';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const layer of ENJOY_AI_LINE_LAYERS) {
    if (layer.points.length < 2) continue;
    ctx.lineWidth = Math.max(2.5, layer.width * sx);
    ctx.beginPath();
    ctx.moveTo(layer.points[0].x * sx, layer.points[0].y * sy);
    for (let i = 1; i < layer.points.length; i++) {
      ctx.lineTo(layer.points[i].x * sx, layer.points[i].y * sy);
    }
    ctx.stroke();
  }

  // 5. Optional Finish zone ring
  ctx.save();
  ctx.translate(quiz.finish.x * sx, quiz.finish.y * sy);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
  ctx.lineWidth = Math.max(1.5, 6 * sx);
  ctx.setLineDash([12 * sx, 8 * sx]);
  ctx.beginPath();
  ctx.arc(0, 0, 88 * sx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 6. Mission Zone pads on the mat
  if (options?.showZoneFootprints !== false) {
    for (const m of quiz.missions) {
      const done = completedSet.has(m.id);
      const cx = (m.x + m.width / 2) * sx;
      const cy = (m.y + m.height / 2) * sy;
      const rw = m.width * sx;
      const rh = m.height * sy;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(((m.rotation || 0) * Math.PI) / 180);

      ctx.fillStyle = done ? 'rgba(16, 185, 129, 0.28)' : 'rgba(59, 130, 246, 0.18)';
      ctx.strokeStyle = done ? '#059669' : '#2563eb';
      ctx.lineWidth = Math.max(1.5, 5 * sx);
      ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
      ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);

      // Highlight the interaction edge in bright cyan/emerald
      ctx.strokeStyle = done ? '#10b981' : '#0ea5e9';
      ctx.lineWidth = Math.max(3, 12 * sx);
      ctx.beginPath();
      if (m.interactionEdge === 'right') {
        ctx.moveTo(rw / 2, -rh / 2);
        ctx.lineTo(rw / 2, rh / 2);
      } else if (m.interactionEdge === 'left') {
        ctx.moveTo(-rw / 2, -rh / 2);
        ctx.lineTo(-rw / 2, rh / 2);
      } else if (m.interactionEdge === 'top') {
        ctx.moveTo(-rw / 2, -rh / 2);
        ctx.lineTo(rw / 2, -rh / 2);
      } else {
        ctx.moveTo(-rw / 2, rh / 2);
        ctx.lineTo(rw / 2, rh / 2);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // 7. Obstacle hazard footprints
  for (const obs of quiz.obstacles) {
    const cx = (obs.x + obs.width / 2) * sx;
    const cy = (obs.y + obs.height / 2) * sy;
    const rw = obs.width * sx;
    const rh = obs.height * sy;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((obs.rotation || 0) * Math.PI) / 180);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = Math.max(1.5, 5 * sx);
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);
    ctx.restore();
  }

  // 8. Optional Reference Route dashed guide
  if (options?.showReferencePath) {
    ctx.save();
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.45)';
    ctx.lineWidth = Math.max(2, 10 * sx);
    ctx.setLineDash([22 * sx, 16 * sx]);
    ctx.beginPath();
    ctx.moveTo(quiz.start.x * sx, quiz.start.y * sy);
    for (const m of quiz.missions) {
      ctx.lineTo((m.x + m.width / 2) * sx, (m.y + m.height / 2) * sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();

  // Bottom border crisp plate
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(width * 0.4, height - borderPx * 0.95, width * 0.2, borderPx * 0.9);
  ctx.fillStyle = '#f8fafc';
  ctx.font = `700 ${Math.max(8, Math.round(17 * sx))}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WHALESBOT', width * 0.5, height - borderPx * 0.48);

  ctx.restore();
}
