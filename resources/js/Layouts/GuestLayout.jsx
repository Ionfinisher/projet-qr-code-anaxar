import { useState } from 'react';
import FlashAlerts from '@/Components/FlashAlerts';
import { LOCODE } from '../Lib/domain.js';
import { LogoMark } from '../Components/domain/Logo.jsx';
import { Icon } from '../Components/ui/Icon.jsx';
import { SkipLink } from './parts.jsx';

/** Piles de conteneurs : la signature visuelle du port. */
function ContainerStacks({ className }) {
    const boxes = [[8, 104, 118, '#fcd34d'], [130, 104, 118, '#334155'], [252, 104, 60, '#001f4b'], [36, 62, 118, '#001f4b'], [158, 62, 118, '#e2e8f0'], [96, 20, 118, '#fcd34d']];
    return (
        <svg viewBox="0 0 320 152" aria-hidden="true" focusable="false" className={className}>
            {boxes.map(([x, y, w, c], i) => (
                <g key={i}>
                    <rect x={x} y={y} width={w} height="38" rx="2.5" fill={c} opacity={c === '#e2e8f0' ? 0.9 : 1} />
                    {Array.from({ length: Math.floor((w - 10) / 7) }, (_, k) => <rect key={k} x={x + 6 + k * 7} y={y + 5} width="2.2" height="28" fill="#0f172a" opacity=".18" />)}
                </g>
            ))}
            <rect x="0" y="146" width="320" height="2" fill="#475569" />
        </svg>
    );
}

const STEPS = [
    ['Inscription du transporteur', 'Pièces vérifiées par l’administration avant l’ouverture du compte.'],
    ['Demande de rendez-vous', 'Créneau de 2 h choisi selon les places disponibles.'],
    ['QR code signé', 'Émis après validation, envoyé au chauffeur par WhatsApp.'],
];

export default function Guest({ children }) {
    return (
        <div lang="fr" className="grid min-h-screen grid-cols-1 bg-white text-slate-900 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <SkipLink />
            <aside className="relative flex flex-col justify-between gap-8 overflow-hidden bg-slate-950 px-6 py-6 text-white sm:px-10 lg:py-10">
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
                <span className="relative inline-flex items-center gap-3">
                    <LogoMark size={36} />
                    <span className="flex flex-col leading-none">
                        <span className="text-lg font-extrabold tracking-tight">PortFlow</span>
                        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-400">Port de Lomé · {LOCODE}</span>
                    </span>
                </span>
                <div className="relative hidden max-w-xl lg:block">
                    <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">Rendez-vous camions : réservés en ligne, validés par le port, contrôlés à la guérite.</h2>
                    <ol className="mt-8 flex flex-col gap-5">
                        {STEPS.map(([t, d], i) => (
                            <li key={t} className="flex gap-4">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-brand-400 ring-1 ring-white/15">{i + 1}</span>
                                <span><span className="block font-semibold">{t}</span><span className="text-sm text-slate-400">{d}</span></span>
                            </li>
                        ))}
                    </ol>
                </div>
                <ContainerStacks className="relative hidden w-full max-w-md lg:block" />
            </aside>
            <main id="pf-main" tabIndex={-1} className="flex items-start justify-center px-5 py-8 focus:outline-none sm:px-10 lg:items-center lg:py-12">
                <div className="w-full max-w-md">{children}</div>
            </main>
            <FlashAlerts />
        </div>
    );
}
