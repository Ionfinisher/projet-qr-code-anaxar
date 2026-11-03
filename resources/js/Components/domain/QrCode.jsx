import { useMemo } from 'react';
import { qrMatrix, qrPath } from '../../Lib/qr.js';
import { Icon } from '../ui/Icon.jsx';
import { cn } from '../../Lib/cn.js';

/** QR code en SVG, toujours sombre sur blanc (lecture fiable par les douchettes et caméras). */
export function QrCode({ text, label = 'QR code du gate pass', className }) {
  const m = useMemo(() => qrMatrix(text), [text]);
  const d = useMemo(() => qrPath(m), [m]);
  if (!m) {
    return (
      <div role="img" aria-label="QR code indisponible" className={cn('flex aspect-square flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm text-slate-500', className)}>
        <Icon name="qr-code" size={36} /><span>QR indisponible</span>
      </div>
    );
  }
  const q = 4;
  return (
    <svg viewBox={`${-q} ${-q} ${m.n + 2 * q} ${m.n + 2 * q}`} role="img" aria-label={label} shapeRendering="crispEdges"
      data-version={m.version} data-ecc={m.ecc} className={cn('block h-auto w-full', className)}>
      <rect x={-q} y={-q} width={m.n + 2 * q} height={m.n + 2 * q} fill="#ffffff" />
      <path d={d} fill="#0b141c" />
    </svg>
  );
}
