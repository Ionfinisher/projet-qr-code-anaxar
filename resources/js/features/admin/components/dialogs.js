// Fenêtres SweetAlert2 propres à l'administration : rejet motivé, demande de compléments, récapitulatifs.
import { swal, swalClasses, SWAL_BUTTONS, Swal } from '../../../lib/alerts.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TEXTAREA = 'block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25';

/** Paragraphe d'introduction (texte échappé ; **gras** autorisé). */
export const introHtml = text => `<p class="text-left text-[15px] text-slate-700">${esc(text).replace(/\*\*(.+?)\*\*/g, '<b class="font-semibold text-slate-900">$1</b>')}</p>`;

/** Récapitulatif libellé / valeur pour une fenêtre de confirmation. */
export function kvHtml(items) {
  const rows = items.filter(Boolean).map(([k, v]) => `<dt class="text-slate-500">${esc(k)}</dt><dd class="min-w-0 break-words text-slate-900">${esc(v)}</dd>`).join('');
  return `<dl class="mt-4 grid grid-cols-[minmax(110px,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">${rows}</dl>`;
}

/** Avertissement dans une fenêtre de confirmation. */
export const warnHtml = text => `<div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-left text-sm text-amber-900">${esc(text)}</div>`;

/**
 * Rejet motivé : un motif de la liste ; « Autre motif » impose des précisions.
 * Renvoie { motif, comment } ou null si l'utilisateur annule.
 */
export async function rejectWithMotif({ title, motifs, otherMotif = 'Autre motif' }) {
  const items = motifs.map((m, i) => `
    <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-sm text-slate-800 hover:border-slate-300 has-[:checked]:border-rose-400 has-[:checked]:bg-rose-50">
      <input type="radio" name="pf-motif" value="${i}" class="mt-0.5 h-4 w-4 accent-rose-600" ${i === 0 ? 'checked' : ''}>
      <span>${esc(m)}</span>
    </label>`).join('');
  const r = await swal.fire({
    title,
    html: `<div class="flex flex-col gap-4 text-left">
      <div class="flex flex-col gap-2" role="radiogroup" aria-label="Motif du rejet">${items}</div>
      <div>
        <label for="pf-motif-comment" class="mb-1 block text-sm font-medium text-slate-700">Précisions pour le demandeur
          <span data-opt class="font-normal text-slate-400">(facultatif)</span><span data-req class="hidden text-rose-600"> *</span></label>
        <textarea id="pf-motif-comment" rows="3" maxlength="1000" class="${TEXTAREA}"></textarea>
        <p class="mt-1 text-xs text-slate-500">Reprises dans l’e-mail et le SMS de notification.</p>
      </div>
    </div>`,
    showCancelButton: true,
    confirmButtonText: 'Rejeter et notifier',
    cancelButtonText: 'Annuler',
    customClass: swalClasses({ popup: 'pf-swal pf-swal--form', confirmButton: SWAL_BUTTONS.danger }),
    didOpen: popup => {
      const sync = () => {
        const idx = Number(popup.querySelector('input[name="pf-motif"]:checked')?.value ?? 0);
        const need = motifs[idx] === otherMotif;
        popup.querySelector('[data-opt]').classList.toggle('hidden', need);
        popup.querySelector('[data-req]').classList.toggle('hidden', !need);
        if (need) popup.querySelector('#pf-motif-comment').focus();
      };
      popup.querySelectorAll('input[name="pf-motif"]').forEach(inp => inp.addEventListener('change', sync));
    },
    preConfirm: () => {
      const popup = Swal.getPopup();
      const motif = motifs[Number(popup.querySelector('input[name="pf-motif"]:checked')?.value ?? -1)];
      const comment = popup.querySelector('#pf-motif-comment').value.trim();
      if (!motif) { Swal.showValidationMessage('Choisissez un motif.'); return false; }
      if (motif === otherMotif && comment.length <= 3) { Swal.showValidationMessage('Précisez le motif pour le demandeur.'); return false; }
      return { motif, comment };
    },
  });
  return r.isConfirmed ? r.value : null;
}

/**
 * Demande de compléments : suggestions à insérer en un clic, texte obligatoire (5 caractères minimum).
 * Renvoie le texte ou null.
 */
export async function requestComplements({ title, suggestions }) {
  const chips = suggestions.map((c, i) => `
    <button type="button" data-sugg="${i}" class="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-xs font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <span aria-hidden="true" class="text-brand-600">+</span> ${esc(c)}
    </button>`).join('');
  const r = await swal.fire({
    title,
    html: `<div class="flex flex-col gap-3 text-left">
      <p class="text-sm text-slate-600">Le demandeur reçoit votre message par e-mail et SMS, puis met à jour sa demande avec sa référence.</p>
      <div class="flex flex-wrap gap-1.5" aria-label="Suggestions">${chips}</div>
      <div>
        <label for="pf-compl" class="mb-1 block text-sm font-medium text-slate-700">Éléments à fournir <span class="text-rose-600">*</span></label>
        <textarea id="pf-compl" rows="5" maxlength="1000" class="${TEXTAREA}"></textarea>
      </div>
    </div>`,
    showCancelButton: true,
    confirmButtonText: 'Envoyer la demande',
    cancelButtonText: 'Annuler',
    customClass: swalClasses({ popup: 'pf-swal pf-swal--form' }),
    didOpen: popup => {
      const area = popup.querySelector('#pf-compl');
      popup.querySelectorAll('[data-sugg]').forEach(b => b.addEventListener('click', () => {
        const c = suggestions[Number(b.dataset.sugg)];
        area.value = area.value.trim() ? `${area.value.trim()}\n${c}` : c;
        area.focus();
      }));
    },
    preConfirm: () => {
      const text = Swal.getPopup().querySelector('#pf-compl').value.trim();
      if (text.length < 5) { Swal.showValidationMessage('Indiquez les éléments à fournir.'); return false; }
      return text;
    },
  });
  return r.isConfirmed ? r.value : null;
}
