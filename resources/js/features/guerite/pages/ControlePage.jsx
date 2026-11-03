import { useEffect, useRef } from 'react';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { useGateSession } from '../GateSession.jsx';
import { ScanPanel } from '../components/ScanPanel.jsx';
import { ScanResult } from '../components/ScanResult.jsx';

/** Contrôle : scan du QR (ou saisie) et décision sur le dossier du camion. */
export function ControlePage() {
  const { config, data } = usePortFlow();
  const { cur, busy, rdvs, process, clear } = useGateSession();
  const now = useNow(15000);
  const resultRef = useRef(null);
  // Sur téléphone, le résultat est sous le panneau de scan : on l'amène à l'écran
  useEffect(() => {
    if (cur && window.matchMedia?.('(max-width: 1023px)').matches) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [cur?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <h1 className="sr-only">Contrôle des camions</h1>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] xl:gap-6">
        <ScanPanel busy={busy} onInput={process} rdvs={rdvs} now={now} demo={!!config?.demo} />
        <div ref={resultRef} className="min-w-0 scroll-mt-36">
          <ScanResult cur={cur} rdvs={rdvs} post={data.post} now={now} onClear={clear} />
        </div>
      </div>
    </>
  );
}
