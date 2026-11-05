// Étape 3 : les 6 documents obligatoires (empreinte SHA-256 inscrite dans le QR signé).
import { useState } from 'react';
import { DOCS } from '@/Lib/domain';
import { notify } from '@/Lib/alerts';
import { useApi, useServerConfig } from '../../../../providers/PortFlowProvider.jsx';
import { Alert, Button } from '../../../../Components/ui/index.js';
import { DocumentUpload, sampleMeta } from '../../../../Components/domain/index.js';
import { cn } from '@/Lib/cn';

export function StepDocs({ f, set, show }) {
  const api = useApi();
  const config = useServerConfig();
  const n = DOCS.filter(d => f.docs[d.key]).length;
  const missing = DOCS.filter(d => !f.docs[d.key]);
  const [filling, setFilling] = useState(false);
  const fillDemo = async () => {
    setFilling(true);
    try {
      const docs = { ...f.docs };
      for (const d of DOCS) if (!docs[d.key]) docs[d.key] = await sampleMeta(api, d.label, 'Demande de rendez-vous');
      set(x => ({ docs: { ...docs, ...x.docs } }));
    } catch (e) { notify(e.message, 'bad'); } finally { setFilling(false); }
  };
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex gap-1" aria-hidden="true">{DOCS.map((d, i) => <i key={d.key} className={cn('block h-2 w-6 rounded-full', i < n ? 'bg-emerald-500' : 'bg-slate-200')} />)}</span>
          <span className="text-sm tabular-nums text-slate-600">{n}/6 documents déposés</span>
        </div>
        {n < 6 && config.demo && <Button variant="ghost" size="sm" icon="sparkles" loading={filling} onClick={fillDemo}>{filling ? 'Préparation…' : 'Compléter avec des fichiers d’exemple'}</Button>}
      </div>
      <p className="text-sm text-slate-500">PDF, JPG, PNG ou WebP · 10 Mo maximum par fichier. Chaque fichier reçoit une empreinte SHA-256, inscrite dans le QR code signé.</p>
      {n < 6 && (
        <Alert tone={show ? 'bad' : 'warn'} icon="triangle-alert" role={show ? 'alert' : undefined} title="Dossier incomplet · la demande ne peut pas être envoyée">
          Manquant : {missing.map(d => d.label).join(', ')}.
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {DOCS.map(d => (
          <DocumentUpload key={d.key} id={`doc-${d.key}`} label={d.label} hint={d.hint} icon={d.icon} meta={f.docs[d.key]}
            onFile={meta => set(x => ({ docs: { ...x.docs, [d.key]: meta } }))}
            onRemove={() => set(x => { const docs = { ...x.docs }; delete docs[d.key]; return { docs }; })} />
        ))}
      </div>
    </section>
  );
}
