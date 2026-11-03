// Formulaire utilisateur : valeurs initiales et contrôles (le serveur revérifie).
import { COUNTRY, phoneCountry, phoneValid, emailValid, toE164 } from '../../../lib/domain.js';

export function userForm(u) {
  const p = phoneCountry(u?.phone || '');
  return {
    first: u?.first || '', last: u?.last || '', email: u?.email || '', phoneCc: u?.phone ? p.cc : 'TG', phone: u?.phone ? p.digits : '',
    title: u?.title || '', profileId: u?.profileId || 'bureau', active: u?.active ?? true,
  };
}

export function userErrors(f, internal) {
  const e = {};
  if (internal && !f.first.trim()) e.first = 'Prénom requis.';
  if (internal && !f.last.trim()) e.last = 'Nom requis.';
  if (!emailValid(f.email)) e.email = 'Adresse e-mail invalide.';
  if (f.phone && !phoneValid(f.phoneCc, f.phone)) e.phone = `Numéro à ${COUNTRY[f.phoneCc].digits} chiffres.`;
  if (!internal && !f.phone) e.phone = 'Téléphone requis pour un transporteur.';
  return e;
}

/** Données envoyées à l'API (téléphone E.164). */
export const userPayload = f => ({ ...f, phone: f.phone ? toE164(f.phoneCc, f.phone) : '' });
