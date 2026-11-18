// Formulaire de demande de rendez-vous : valeurs initiales et import de liste de camions.
import { normalizePlate, phoneCountry, uid } from '@/Lib/domain';

/** Camion vide ; un transporteur particulier est son propre chauffeur par défaut. */
export const newTruck = self => ({
  k: uid(), rdvId: null, first: self?.first || '', last: self?.last || '',
  phoneCc: self ? phoneCountry(self.phone).cc : 'TG', phone: self ? phoneCountry(self.phone).digits : '',
  license: '', country: self?.country || 'TG', tractor: '', trailer: '', container: '', iso: '45G1', bl: '', goods: '', vgm: '',
});

/** Lignes collées depuis un tableur : conteneur ; BL ; tracteur ; prénom nom ; téléphone ; marchandise ; permis. */
export function parsePastedTrucks(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
    const c = line.split(/\t|;|,/).map(x => x.trim());
    const [first, ...rest] = (c[3] || '').split(/\s+/);
    return {
      ...newTruck(null), container: (c[0] || '').toUpperCase(), bl: (c[1] || '').toUpperCase(), tractor: normalizePlate(c[2] || ''),
      first: first || '', last: rest.join(' '), phone: (c[4] || '').replace(/[^\d]/g, ''), goods: c[5] || '',
      license: (c[6] || '').toUpperCase().replace(/[^A-Z0-9 /-]/g, ''),
    };
  });
}

export const CANCEL_MOTIFS = ['Conteneur non encore libéré', 'Camion ou chauffeur indisponible', 'Changement de programme', 'Autre motif'];
