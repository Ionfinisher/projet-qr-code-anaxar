import { Button, Icon } from '@/Components/ui';
import { DOCS } from '@/Lib/domain';
import { docSlot, fmtSize } from './helpers';

/**
 * Les 6 documents obligatoires d'un seul camion.
 * Le formulaire reste responsable de l'état : ce composant est purement présentationnel.
 */
export default function TruckDocuments({
    truck,
    index,
    truckKey,
    docs = {},
    uploaded = {},
    uploading = {},
    uploadErrors = {},
    errors = {},
    fileInputs,
    onUpload,
    onRemove,
}) {
    const plate = truck.vehicle?.tractor?.trim();
    const driver = [truck.driver?.last?.trim(), truck.driver?.first?.trim()].filter(Boolean).join(' ');

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                        Camion {index + 1}
                        {plate ? <span className="ml-2 font-mono text-xs text-slate-500">{plate}</span> : null}
                    </p>
                    {driver ? <p className="truncate text-xs text-slate-500">{driver}</p> : null}
                </div>
                <p className="shrink-0 text-xs text-slate-500">
                    Clé : <code className="rounded bg-white px-1.5 py-0.5 font-mono">{truckKey}</code>
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {DOCS.map((doc) => {
                    const slot = docSlot(truckKey, doc.key);
                    const meta = uploaded[slot];
                    const busy = uploading[slot];
                    const error = errors[`docs.${truckKey}.${doc.key}`] || uploadErrors[slot] || errors.docs;

                    return (
                        <div key={doc.key} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <Icon name={doc.icon} size={17} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900">
                                        {doc.label}
                                        <span className="text-rose-600" aria-hidden="true"> *</span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">{doc.hint}</p>
                                </div>
                            </div>

                            {meta ? (
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-medium text-slate-700">{meta.name}</p>
                                        <p className="text-xs text-slate-500">{fmtSize(meta.size)}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        {meta.url ? (
                                            <a
                                                href={meta.url}
                                                className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 hover:underline"
                                            >
                                                Télécharger
                                            </a>
                                        ) : null}
                                        {meta.existing ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => fileInputs.current?.[slot]?.click()}
                                                disabled={busy}
                                            >
                                                Remplacer
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onRemove(doc.key)}
                                                disabled={busy}
                                            >
                                                Retirer
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    icon="upload"
                                    className="mt-3"
                                    loading={busy}
                                    onClick={() => fileInputs.current?.[slot]?.click()}
                                >
                                    Téléverser le fichier
                                </Button>
                            )}

                            {busy ? <p className="mt-2 text-xs text-slate-500">Téléversement en cours…</p> : null}
                            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}

                            <input
                                ref={(element) => { fileInputs.current[slot] = element; }}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                className="sr-only"
                                onChange={(event) => onUpload(doc.key, event.target.files?.[0])}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
