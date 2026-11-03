// Génère src/portflow/lib/icons.js : registre « nom-lucide » -> composant lucide-react (imports nommés, arbre secoué).
import { writeFileSync } from 'node:fs';
import * as lucide from 'lucide-react';

const NAMES = [
  'truck', 'container', 'qr-code', 'scan-line', 'scan', 'shield-check', 'shield-alert', 'shield-x',
  'file-check', 'file-text', 'file-up', 'file-x', 'upload', 'check', 'circle-check', 'x', 'circle-x',
  'triangle-alert', 'clock', 'calendar', 'calendar-clock', 'map-pin', 'user', 'building-2', 'phone',
  'mail', 'id-card', 'ship', 'anchor', 'warehouse', 'package', 'boxes', 'plus', 'trash-2', 'copy',
  'download', 'send', 'arrow-right', 'arrow-left', 'chevron-right', 'chevron-left', 'chevron-down',
  'search', 'log-in', 'log-out', 'lock', 'lock-open', 'key-round', 'history', 'list', 'layout-dashboard',
  'camera', 'image-up', 'keyboard', 'refresh-cw', 'rotate-ccw', 'timer', 'activity',
  'fingerprint', 'hash', 'info', 'eye', 'users', 'badge-check', 'smartphone', 'stamp',
  'circle-dashed', 'link', 'message-circle', 'arrow-up-right', 'file-down', 'table',
  'list-checks', 'layers', 'house', 'route', 'gauge', 'circle-dot', 'clipboard-paste', 'pencil',
  'octagon-alert', 'monitor', 'user-check', 'circle', 'ellipsis', 'copy-plus',
  'sparkles', 'repeat', 'shield', 'link-2', 'external-link', 'flag',
  'bell', 'menu', 'user-plus', 'user-x', 'eye-off', 'power', 'calendar-plus', 'calendar-x', 'message-square',
  'inbox', 'circle-user', 'shield-plus', 'briefcase', 'hourglass', 'mail-check', 'circle-help', 'book-open',
  'clipboard-list', 'user-cog', 'calendar-days', 'calendar-check', 'file-search', 'settings-2', 'chevron-up',
  'building', 'square-pen', 'lock-keyhole', 'shield-user', 'scroll-text', 'list-todo', 'at-sign',
  'camera-off', 'wifi-off', 'settings', 'server', 'mail-warning', 'share-2', 'image', 'printer',
  'filter', 'panel-left', 'arrow-down-up', 'loader-circle', 'circle-alert', 'square-check-big', 'user-round',
];

// Noms absents de la version installée de lucide-react : remplacés par une icône proche
const ALIASES = { 'shield-user': 'UserCog' };

const pascal = n => ALIASES[n] || n.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
const found = [], missing = [];
for (const n of NAMES) (lucide[pascal(n)] ? found : missing).push(n);
if (missing.length) { console.error('Icônes absentes de lucide-react :', missing.join(', ')); process.exit(1); }

const out = `// Fichier généré par tools/gen-icons.mjs — icônes Lucide (https://lucide.dev, licence ISC)
// Ajouter une icône : compléter NAMES dans tools/gen-icons.mjs puis \`npm run icons\`.
import {
${[...new Set(found.map(pascal))].map(c => `  ${c},`).join('\n')}
} from 'lucide-react';

export const ICONS = {
${found.map(n => `  '${n}': ${pascal(n)},`).join('\n')}
};
`;
writeFileSync(new URL('../src/portflow/lib/icons.js', import.meta.url), out);
console.log(`icons.js : ${found.length} icônes`);
