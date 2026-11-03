// Lecture de QR codes : photo ou image (BarcodeDetector natif, sinon jsQR) et image vidéo de la caméra.
import jsQR from 'jsqr';

/* ───────────── Lecture d'un QR depuis une photo ───────────── */

function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
    img.src = url;
  });
}

export async function decodeQrFromFile(file) {
  let src;
  try { src = await createImageBitmap(file); } catch { src = await loadImage(file); }
  const w0 = src.width, h0 = src.height;

  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      const codes = await det.detect(src);
      if (codes?.[0]?.rawValue) return codes[0].rawValue;
    } catch { /* on passe à jsQR */ }
  }
    for (const maxDim of [1600, 1100, 2400, 800]) {
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const code = jsQR(data.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (code?.data) return code.data;
    if (scale === 1 && maxDim >= 1600) continue;
  }
  return null;
}

/** Lit un QR dans l'image courante d'une vidéo (caméra) ; renvoie le texte ou null. */
export function decodeVideoFrame(video, canvas) {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, 960 / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(img.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' })?.data || null;
}
