// Fenêtres SweetAlert2 de PortFlow, stylées avec Tailwind (buttonsStyling: false + customClass).
// Règle d'usage : SweetAlert pour confirmer, choisir un motif, informer ou notifier ;
// les formulaires à plusieurs champs restent dans <Modal> / <Drawer> (état React).
import Swal from "sweetalert2";
import { Alert } from "@/Components/ui/Feedback";

const BTN =
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50";
export const SWAL_BUTTONS = {
    primary: `${BTN} bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500`,
    danger: `${BTN} bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500`,
    ok: `${BTN} bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500`,
    dark: `${BTN} bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500`,
    cancel: `${BTN} bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400`,
};

const BASE_CLASSES = {
    container: "pf-swal-container",
    popup: "pf-swal",
    title: "pf-swal-title",
    htmlContainer: "pf-swal-html",
    actions: "pf-swal-actions",
    confirmButton: SWAL_BUTTONS.primary,
    denyButton: SWAL_BUTTONS.danger,
    cancelButton: SWAL_BUTTONS.cancel,
    validationMessage: "pf-swal-validation",
};
/** Classes de la fenêtre : SweetAlert remplace customClass en entier, on complète donc la base. */
export const swalClasses = (overrides = {}) => ({
    ...BASE_CLASSES,
    ...overrides,
});

/** Instance de base : à utiliser pour une fenêtre sur mesure (swal.fire({ ..., customClass: swalClasses({...}) })). */
export const swal = Swal.mixin({
    buttonsStyling: false,
    reverseButtons: true,
    returnFocus: true,
    customClass: BASE_CLASSES,
});

const esc = (s) =>
    String(s ?? "").replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[c],
    );

/**
 * Demande une confirmation. Renvoie true si l'utilisateur confirme.
 * tone : 'primary' | 'danger' | 'ok' | 'dark'
 */
export async function confirmAction({
    title,
    text,
    html,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    tone = "primary",
    icon = tone === "danger" ? "warning" : "question",
} = {}) {
    const r = await swal.fire({
        title,
        text,
        html,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        customClass: swalClasses({
            confirmButton: SWAL_BUTTONS[tone] || SWAL_BUTTONS.primary,
        }),
    });
    return r.isConfirmed;
}

/** Information bloquante (résultat important, erreur à lire). */
export function showMessage({
    title,
    text,
    html,
    icon = "info",
    confirmText = "Compris",
    tone = "primary",
} = {}) {
    return swal.fire({
        title,
        text,
        html,
        icon,
        confirmButtonText: confirmText,
        customClass: swalClasses({
            confirmButton: SWAL_BUTTONS[tone] || SWAL_BUTTONS.primary,
        }),
    });
}
export const showError = (title, text) =>
    showMessage({ title, text, icon: "error", tone: "dark" });
export const showSuccess = (title, text) =>
    showMessage({ title, text, icon: "success", tone: "ok" });

const toaster = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4200,
    timerProgressBar: true,
    customClass: {
        container: "pf-swal-toast-container",
        popup: "pf-swal-toast",
    },
    didOpen: (el) => {
        el.addEventListener("mouseenter", Swal.stopTimer);
        el.addEventListener("mouseleave", Swal.resumeTimer);
    },
});
const TOAST_ICON = {
    ok: "success",
    bad: "error",
    warn: "warning",
    info: "info",
    neutral: "info",
};

/** Notification discrète (remplace les toasts). tone : 'ok' | 'bad' | 'warn' | 'info' | 'neutral' */
export function notify(message, tone = "neutral") {
    return toaster.fire({ icon: TOAST_ICON[tone] || "info", title: message });
}

/**
 * Choix d'un motif dans une liste (+ « Autre motif » libre) et commentaire facultatif.
 * Renvoie { reason, comment } ou null si annulé.
 */
export async function chooseReason({
    title,
    text,
    reasons = [],
    allowOther = true,
    otherLabel = "Autre motif",
    confirmText = "Confirmer",
    cancelText = "Annuler",
    tone = "danger",
    comment = null, // { label, placeholder, required }
    maxLength = 150,
    notice = "",
} = {}) {
    const list = allowOther ? [...reasons, "__other"] : reasons;
    const items = list
        .map(
            (r, i) => `
    <label class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-sm text-slate-800 cursor-pointer hover:border-slate-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
      <input type="radio" name="pf-reason" value="${i}" class="mt-0.5 h-4 w-4 accent-brand-600" ${i === 0 ? "checked" : ""}>
      <span>${r === "__other" ? esc(otherLabel) : esc(r)}</span>
    </label>`,
        )
        .join("");
    const html = `
    <div class="flex flex-col gap-3 text-left">
      ${notice ? `<div class="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">${esc(notice)}</div>` : ""}
      ${text ? `<p class="text-sm text-slate-600">${esc(text)}</p>` : ""}
      <div class="flex flex-col gap-2" role="radiogroup" aria-label="Motif">${items}</div>
      <div id="pf-reason-other-wrap" class="${list[0] === "__other" ? "" : "hidden"}">
        <label for="pf-reason-other" class="mb-1 block text-sm font-medium text-slate-700">Motif</label>
        <input id="pf-reason-other" maxlength="${maxLength}" class="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30">
      </div>
      ${
          comment
              ? `
      <div>
        <label for="pf-reason-comment" class="mb-1 block text-sm font-medium text-slate-700">${esc(comment.label || "Commentaire")}${comment.required ? "" : ' <span class="font-normal text-slate-400">(facultatif)</span>'}</label>
        <textarea id="pf-reason-comment" rows="3" maxlength="500" placeholder="${esc(comment.placeholder || "")}" class="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"></textarea>
      </div>`
              : ""
      }
    </div>`;
    const r = await swal.fire({
        title,
        html,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        customClass: swalClasses({
            confirmButton: SWAL_BUTTONS[tone] || SWAL_BUTTONS.danger,
            popup: "pf-swal pf-swal--form",
        }),
        didOpen: (popup) => {
            const wrap = popup.querySelector("#pf-reason-other-wrap");
            popup.querySelectorAll('input[name="pf-reason"]').forEach((inp) =>
                inp.addEventListener("change", () => {
                    const other = list[Number(inp.value)] === "__other";
                    wrap.classList.toggle("hidden", !other);
                    if (other) popup.querySelector("#pf-reason-other").focus();
                }),
            );
        },
        preConfirm: () => {
            const popup = Swal.getPopup();
            const idx = Number(
                popup.querySelector('input[name="pf-reason"]:checked')?.value ??
                    -1,
            );
            const picked = list[idx];
            const reason =
                picked === "__other"
                    ? popup.querySelector("#pf-reason-other").value.trim()
                    : picked;
            const note =
                popup.querySelector("#pf-reason-comment")?.value.trim() || "";
            if (!reason) {
                Swal.showValidationMessage("Précisez le motif.");
                return false;
            }
            if (comment?.required && !note) {
                Swal.showValidationMessage("Le commentaire est obligatoire.");
                return false;
            }
            return { reason, comment: note };
        },
    });
    return r.isConfirmed ? r.value : null;
}

/** Affiche une valeur à transmettre (mot de passe provisoire, code) avec un bouton Copier. */
export async function showSecret({ title, text, value, label = "Valeur" }) {
    return swal.fire({
        title,
        icon: "success",
        html: `<div class="flex flex-col gap-3 text-left">
      ${text ? `<p class="text-sm text-slate-600">${esc(text)}</p>` : ""}
      <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span class="text-xs font-medium uppercase tracking-wide text-slate-500">${esc(label)}</span>
        <code class="font-mono text-base font-semibold text-slate-900 select-all">${esc(value)}</code>
      </div></div>`,
        showDenyButton: true,
        denyButtonText: "Copier",
        confirmButtonText: "Fermer",
        customClass: swalClasses({
            denyButton: SWAL_BUTTONS.cancel,
            confirmButton: SWAL_BUTTONS.dark,
        }),
        preDeny: async () => {
            try {
                await navigator.clipboard.writeText(value);
                notify("Copié dans le presse-papiers", "ok");
            } catch {
                notify("Copie impossible : sélectionnez le texte", "warn");
            }
            return false;
        },
    });
}

export { Swal };
