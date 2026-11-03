// Lien du pass chauffeur et message WhatsApp (même format que les SMS envoyés par le serveur : <site>/?p=CODE).
import { relDay, TERMINALS, driverName } from '../../lib/domain.js';

/** Adresse publique du site PortFlow (config.url renvoyée par le serveur). */
export const siteUrl = config => String(config?.url || window.location.origin).replace(/\/$/, '');

/** Lien court du pass : le serveur renvoie toujours le QR signé en vigueur. */
export const passLink = (config, r) => (r.passCode ? `${siteUrl(config)}/?p=${r.passCode}` : `${siteUrl(config)}/#${r.token}`);

export const waText = (config, r) => [
  `PortFlow · Gate pass ${r.id}`,
  `Créneau : ${relDay(r.slot.date)} ${r.slot.start}–${r.slot.end} · ${TERMINALS[r.terminal]?.label}`,
  `Conteneur : ${r.container.number || 'à attribuer'} · Tracteur ${r.vehicle.country} ${r.vehicle.tractor}`,
  r.driver.license && `Chauffeur : ${driverName(r.driver)} · permis n° ${r.driver.license}`,
  `Votre QR code : ${passLink(config, r)}`,
  'Ouvrez le lien et présentez le QR à la guérite, avec votre permis de conduire.',
].filter(Boolean).join('\n');

/** Lien WhatsApp (wa.me) vers le téléphone du chauffeur, message prérempli. */
export const waLink = (config, r) => (r.driver.phone ? `https://wa.me/${r.driver.phone.replace('+', '')}?text=${encodeURIComponent(waText(config, r))}` : null);
