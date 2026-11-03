// Barrière : fenêtre SweetAlert affichée après une entrée ou une sortie validée (animation de la lisse).
import { swal, swalClasses, SWAL_BUTTONS } from '../../../lib/alerts.js';
import { driverName, fmtTimeS, fmtDuration } from '../../../lib/domain.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BARRIER = `
<svg class="pf-gate-svg mx-auto block h-auto w-full max-w-[340px]" viewBox="0 0 360 150" aria-hidden="true" focusable="false">
  <line x1="10" y1="132" x2="350" y2="132" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6" />
  <rect x="250" y="72" width="84" height="44" rx="5" fill="#334155" />
  <rect x="230" y="88" width="24" height="28" rx="4" fill="#475569" />
  <circle cx="262" cy="120" r="8" fill="#0f172a" /><circle cx="318" cy="120" r="8" fill="#0f172a" />
  <rect x="58" y="84" width="24" height="48" rx="4" fill="#0f172a" />
  <circle class="pf-gate-light" cx="70" cy="76" r="7" />
  <g class="pf-gate-arm">
    <rect x="70" y="88" width="250" height="9" rx="4.5" fill="#ffffff" stroke="#0f172a" stroke-width="1.5" />
    ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${90 + i * 40}" y="88.75" width="20" height="7.5" fill="#ff5b1f" />`).join('')}
    <circle cx="70" cy="92" r="9" fill="#0f172a" />
  </g>
</svg>`;

/**
 * Affiche la barrière ouverte (kind 'in') ou la sortie (kind 'out'). Se ferme avec « Camion suivant », Entrée ou Échap.
 * Résout quand la fenêtre est fermée.
 */
export function showGateOverlay({ kind, at, rdv }) {
  const isIn = kind === 'in';
  const lines = [];
  if (rdv) lines.push(`<p class="mt-1 text-[15px] text-slate-700"><span class="font-mono font-semibold text-slate-900">${esc(rdv.id)}</span> · ${esc(rdv.vehicle.country)} ${esc(rdv.vehicle.tractor)} · ${esc(driverName(rdv.driver))}</p>`);
  if (rdv && !isIn && rdv.entryAt) lines.push(`<p class="text-sm text-slate-500">Durée dans le port : ${esc(fmtDuration(at - Date.parse(rdv.entryAt)))}</p>`);
  return swal.fire({
    title: isIn ? 'Barrière ouverte' : 'Bonne route',
    html: `<div class="flex flex-col items-center gap-1 text-center">
      ${BARRIER}
      <p class="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">${isIn ? 'Entrée enregistrée' : 'Sortie enregistrée'} · ${esc(fmtTimeS(at))}</p>
      ${lines.join('')}
    </div>`,
    confirmButtonText: 'Camion suivant',
    allowOutsideClick: false,
    focusConfirm: true,
    customClass: swalClasses({ popup: 'pf-swal pf-swal--form', confirmButton: `${SWAL_BUTTONS.dark} h-12 px-6 text-base` }),
    didOpen: popup => { setTimeout(() => popup.querySelector('.pf-gate-svg')?.classList.add('is-open'), 60); },
  });
}
