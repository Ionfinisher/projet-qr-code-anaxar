// QR code : matrice calculée par qrcode-generator, rendue en SVG (composant <QrCode>) ou sur canvas (images PNG).
import qrcode from 'qrcode-generator';

const cache = new Map();

/** Matrice du QR : { n, rows[][], ecc, version } ou null. Correction M, ou L au-delà de la version 19. */
export function qrMatrix(text) {
  if (!text) return null;
  if (cache.has(text)) return cache.get(text);
  let out = null;
  for (const ecc of ['M', 'L']) {
    try {
      const q = qrcode(0, ecc);
      q.addData(text, 'Byte');
      q.make();
      const n = q.getModuleCount();
      if (ecc === 'M' && n > 93) continue;
      const rows = [];
      for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); rows.push(row); }
      out = { n, rows, ecc, version: (n - 17) / 4 };
      break;
    } catch { /* données trop longues pour ce niveau */ }
  }
  cache.set(text, out);
  return out;
}

/** Chemin SVG des modules sombres (une ligne horizontale par plage contiguë). */
export function qrPath(m) {
  if (!m) return '';
  let p = '';
  m.rows.forEach((row, y) => {
    let x = 0;
    while (x < m.n) {
      if (row[x]) { let w = 1; while (x + w < m.n && row[x + w]) w++; p += `M${x} ${y}h${w}v1h-${w}z`; x += w; } else x++;
    }
  });
  return p;
}
