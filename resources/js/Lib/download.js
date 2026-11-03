// Téléchargement de fichiers générés dans le navigateur et copie dans le presse-papiers.
import { notify } from './alerts.js';

export async function saveFile(filename, data) {
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    notify('Fichier téléchargé', 'ok');
    return true;
  } catch {
    notify('Téléchargement impossible dans ce navigateur', 'warn');
    return false;
  }
}

export async function copyText(text, fallbackEl) {
  try {
    await navigator.clipboard.writeText(text);
    notify('Copié dans le presse-papiers', 'ok');
    return true;
  } catch {
    if (fallbackEl) { fallbackEl.focus(); fallbackEl.select?.(); }
    notify('Texte sélectionné : copiez-le avec Ctrl+C', 'neutral');
    return false;
  }
}

/** Aperçus locaux des images déposées pendant la session (sha256 → objectURL). */
export const previews = new Map();
