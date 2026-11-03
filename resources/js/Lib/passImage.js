// Images PNG des gate pass (envoi au chauffeur, impression) dessinées sur canvas.
import { qrMatrix } from './qr.js';
import { splitContainer, driverName, TERMINALS, OPS, fmtDateTime, KID, ISO_TYPE, fmtDayLong, slotRange } from './domain.js';

const INK = '#0d1b26';
const INK2 = '#4a5b6b';
const LINE = '#d5dce3';
const ORANGE = '#ff5b1f';

async function fontsReady() {
  try { await document.fonts?.ready; } catch { /* ignore */ }
}
const SANS = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function drawQr(ctx, text, x, y, size) {
  const m = qrMatrix(text);
  if (!m) return false;
  const q = 4;
  const unit = size / (m.n + 2 * q);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#0b141c';
  for (let r = 0; r < m.n; r++) {
    for (let c = 0; c < m.n; c++) {
      if (m.rows[r][c]) ctx.fillRect(Math.floor(x + (c + q) * unit), Math.floor(y + (r + q) * unit), Math.ceil(unit), Math.ceil(unit));
    }
  }
  return true;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawContainerNo(ctx, value, x, y, px) {
  const p = splitContainer(value);
  ctx.font = `600 ${px}px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  if (!p) { ctx.fillText(value || 'À attribuer au terminal', x, y); return; }
  const a = `${p.owner} ${p.serial} `;
  ctx.fillText(a, x, y);
  const w = ctx.measureText(a).width;
  const cw = ctx.measureText(p.check).width;
  ctx.fillText(p.check, x + w + px * 0.18, y);
  ctx.lineWidth = Math.max(2, px / 14);
  ctx.strokeStyle = INK;
  roundRect(ctx, x + w, y - px * 0.86, cw + px * 0.36, px * 1.08, px * 0.12);
  ctx.stroke();
}

function toBlob(canvas) {
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('png'))), 'image/png'));
}

/** Image PNG d'un gate pass, prête à envoyer au chauffeur. */
export async function passPng(r) {
  await fontsReady();
  const W = 1080, H = 1560;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, 132);
  ctx.fillStyle = ORANGE;
  roundRect(ctx, 64, 38, 56, 56, 12); ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillRect(76, 52, 32, 11); ctx.fillRect(76, 70, 22, 11);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 44px ${SANS}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('PortFlow', 140, 68);
  ctx.fillStyle = ORANGE;
  ctx.font = `700 24px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText('GATE PASS NUMÉRIQUE', W - 64, 68);
  ctx.textAlign = 'left';

  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 64px ${MONO}`;
  ctx.fillText(r.id, 64, 222);
  if (r.lot) {
    ctx.font = `500 26px ${SANS}`;
    ctx.fillStyle = INK2;
    ctx.fillText(`Lot ${r.lot} · camion ${r.lotIndex}/${r.lotSize}`, 64, 262);
  }

  const qrSize = 700;
  drawQr(ctx, r.token, (W - qrSize) / 2, 290, qrSize);

  const { start } = slotRange(r.slot);
  let y = 1062;
  ctx.fillStyle = INK;
  ctx.font = `800 52px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${r.slot.start}–${r.slot.end}`, W / 2, y);
  ctx.font = `500 28px ${SANS}`;
  ctx.fillStyle = INK2;
  const day = fmtDayLong(start);
  ctx.fillText(`${day.charAt(0).toUpperCase() + day.slice(1)} · ${TERMINALS[r.terminal]?.label} · ${OPS[r.op]?.short}`, W / 2, y + 46);
  ctx.textAlign = 'left';

  y = 1170;
  ctx.strokeStyle = LINE;
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(64, y); ctx.lineTo(W - 64, y); ctx.stroke();
  ctx.setLineDash([]);

  const rows = [
    ['Conteneur', () => drawContainerNo(ctx, r.container.number, 330, yy, 38), r.container.iso],
    ['Tracteur', `${r.vehicle.country} · ${r.vehicle.tractor}`, r.vehicle.trailer ? `Remorque ${r.vehicle.trailer}` : ''],
    ['Chauffeur', driverName(r.driver), r.driver.license ? `Permis ${r.driver.license}` : ''],
    ['Connaissement', r.container.bl || '—', ISO_TYPE[r.container.iso]?.label || ''],
  ];
  let yy = 1240;
  for (const [k, v, aside] of rows) {
    ctx.font = `600 24px ${SANS}`;
    ctx.fillStyle = INK2;
    ctx.fillText(k.toUpperCase(), 64, yy);
    if (typeof v === 'function') v();
    else { ctx.font = `600 34px ${k === 'Connaissement' ? MONO : SANS}`; ctx.fillStyle = INK; ctx.fillText(v, 330, yy); }
    if (aside) { ctx.font = `500 24px ${SANS}`; ctx.fillStyle = INK2; ctx.textAlign = 'right'; ctx.fillText(aside, W - 64, yy); ctx.textAlign = 'left'; }
    yy += 64;
  }

  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = INK2;
  ctx.fillText(`Signé ES256 · clé ${KID} · émis le ${fmtDateTime(r.issuedAt)} (heure de Lomé)`, 64, H - 52);
  return toBlob(cv);
}

/** Planche PNG de tous les passes d'un lot. */
export async function lotSheetPng(list) {
  await fontsReady();
  const cols = list.length > 1 ? 2 : 1;
  const CW = 560, CH = 700, GAP = 32, M = 56, HEAD = 170;
  const rowsN = Math.ceil(list.length / cols);
  const W = M * 2 + cols * CW + (cols - 1) * GAP;
  const H = HEAD + rowsN * CH + (rowsN - 1) * GAP + M;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f2f4f6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.font = `800 40px ${SANS}`;
  ctx.fillText('PortFlow · Lot ' + (list[0]?.lot || ''), M, 84);
  ctx.font = `500 24px ${SANS}`;
  ctx.fillStyle = INK2;
  const r0 = list[0];
  if (r0) ctx.fillText(`${list.length} camions · ${r0.slot.date} ${r0.slot.start}–${r0.slot.end} · ${TERMINALS[r0.terminal]?.label}`, M, 126);

  list.forEach((r, i) => {
    const x = M + (i % cols) * (CW + GAP);
    const y = HEAD + Math.floor(i / cols) * (CH + GAP);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, CW, CH, 22); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `600 34px ${MONO}`;
    ctx.fillText(r.id, x + 32, y + 58);
    ctx.font = `600 22px ${SANS}`;
    ctx.fillStyle = ORANGE;
    ctx.textAlign = 'right';
    ctx.fillText(`CAMION ${r.lotIndex}/${r.lotSize}`, x + CW - 32, y + 56);
    ctx.textAlign = 'left';
    drawQr(ctx, r.token, x + (CW - 420) / 2, y + 82, 420);
    drawContainerNo(ctx, r.container.number, x + 32, y + 562, 28);
    ctx.font = `600 26px ${SANS}`;
    ctx.fillStyle = INK;
    ctx.fillText(`${r.vehicle.country} · ${r.vehicle.tractor}`, x + 32, y + 610);
    ctx.font = `500 22px ${SANS}`;
    ctx.fillStyle = INK2;
    ctx.fillText(driverName(r.driver) + (r.driver.license ? ` · permis ${r.driver.license}` : ''), x + 32, y + 650);
  });
  return toBlob(cv);
}
