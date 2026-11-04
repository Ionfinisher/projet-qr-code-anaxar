// Lecture du QR par la caméra : BarcodeDetector natif, sinon jsQR image par image.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { decodeVideoFrame } from '../../../lib/qrscan.js';
import { Button, Icon } from '../../../Components/ui/index.js';

export function LiveScanner({ onCode, onClose }) {
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);
  const cb = useRef({ onCode, onClose });
  cb.current = { onCode, onClose };

  useEffect(() => {
    let stream = null;
    let raf = 0;
    let stopped = false;
    let detector = null;
    let last = 0;
    const canvas = document.createElement('canvas');
    const previous = document.activeElement;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => closeRef.current?.focus(), 20);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('nocam'), { name: 'NotSupportedError' });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play();
        setReady(true);
        if ('BarcodeDetector' in window) {
          try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch { detector = null; }
        }
        const loop = async t => {
          if (stopped) return;
          if (t - last > 160 && v.readyState >= 2 && v.videoWidth) {
            last = t;
            let code = null;
            try {
              if (detector) code = (await detector.detect(v))?.[0]?.rawValue || null;
              else code = decodeVideoFrame(v, canvas);
            } catch { code = null; }
            if (code && !stopped) {
              stopped = true;
              try { navigator.vibrate?.(60); } catch { /* sans vibreur */ }
              cb.current.onCode(code);
              return;
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        if (stopped) return;
        setErr(e?.name === 'NotAllowedError'
          ? 'Accès à la caméra refusé : autorisez la caméra pour ce site dans les réglages du navigateur.'
          : 'Caméra indisponible sur cet appareil : utilisez « Photographier le QR code » ou la douchette.');
      }
    })();
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); cb.current.onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      stream?.getTracks().forEach(t => t.stop());
      document.documentElement.style.overflow = overflow;
      if (previous && document.contains(previous)) previous.focus?.();
    };
  }, []);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Scanner le QR code avec la caméra" lang="fr"
      className="pf-anim-fade fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-slate-950/95 p-4">
      <div className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
        <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
        {ready && !err && (
          <span aria-hidden="true" className="absolute inset-[12%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]">
            <span className="pf-scan-line" />
          </span>
        )}
        {!ready && !err && <p className="absolute inset-0 flex items-center justify-center text-base text-slate-300">Ouverture de la caméra…</p>}
        {err && (
          <p role="alert" className="absolute inset-0 flex items-center justify-center gap-3 p-8 text-center text-base text-rose-200">
            <Icon name="camera-off" size={22} className="shrink-0" /> {err}
          </p>
        )}
      </div>
      <p className="text-center text-base text-slate-300">Cadrez le QR code du chauffeur : la lecture est automatique.</p>
      <Button ref={closeRef} variant="secondary" size="lg" icon="x" onClick={() => cb.current.onClose()}>Fermer la caméra</Button>
    </div>,
    document.body,
  );
}
