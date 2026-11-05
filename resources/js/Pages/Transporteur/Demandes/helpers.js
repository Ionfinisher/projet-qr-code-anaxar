import { COUNTRIES } from '@/Lib/domain';

export const fmtSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const slotKey = (date, start) => (date && start ? `${date}|${start}` : '');

export const parseSlotKey = (value) => {
    const [date, start] = String(value || '').split('|');
    return date && start ? { date, start } : null;
};

/** Sépare un numéro E.164 (+22890123456) en indicatif pays + numéro national. */
export const splitPhone = (e164) => {
    const raw = String(e164 || '');
    const match = raw.match(/^\+(\d{3})(\d+)$/);

    if (!match) {
        return { cc: 'TG', national: raw.replace(/[^\d ]/g, '') };
    }

    const country = COUNTRIES.find((item) => item.dial === match[1]);

    return { cc: country?.code || 'TG', national: match[2] };
};

export const newTruck = () => ({
    driver: { first: '', last: '', phone_cc: 'TG', phone_national: '', license: '' },
    vehicle: { country: 'TG', tractor: '', trailer: '' },
    container: { number: '', iso: '22G1', bl: '', goods: '', vgm: '' },
});

