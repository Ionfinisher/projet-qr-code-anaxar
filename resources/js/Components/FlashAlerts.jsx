import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

const AUTO_DISMISS_MS = 6000;

const VARIANTS = {
    success: {
        label: 'Succès',
        wrapper: 'border-emerald-200 bg-emerald-50',
        icon: 'bg-emerald-100 text-emerald-700',
        title: 'text-emerald-950',
        message: 'text-emerald-800',
        close: 'text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-500',
    },
    error: {
        label: 'Erreur',
        wrapper: 'border-rose-200 bg-rose-50',
        icon: 'bg-rose-100 text-rose-700',
        title: 'text-rose-950',
        message: 'text-rose-800',
        close: 'text-rose-700 hover:bg-rose-100 focus:ring-rose-500',
    },
};

function AlertIcon({ type }) {
    if (type === 'error') {
        return (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                />
            </svg>
        );
    }

    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
        </svg>
    );
}

function Alert({ alert, onClose }) {
    const variant = VARIANTS[alert.type] ?? VARIANTS.success;

    useEffect(() => {
        const timer = window.setTimeout(() => onClose(alert.id), AUTO_DISMISS_MS);

        return () => window.clearTimeout(timer);
    }, [alert.id, onClose]);

    return (
        <div
            role={alert.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-xl ring-1 ring-black/5 ${variant.wrapper}`}
        >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${variant.icon}`}>
                <AlertIcon type={alert.type} />
            </span>

            <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${variant.title}`}>{variant.label}</p>
                <p className={`mt-1 text-sm leading-5 ${variant.message}`}>{alert.message}</p>
            </div>

            <button
                type="button"
                onClick={() => onClose(alert.id)}
                className={`-me-1 -mt-1 rounded-md p-1 transition focus:outline-none focus:ring-2 ${variant.close}`}
                aria-label="Fermer l'alerte"
            >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export default function FlashAlerts() {
    const { flash = {}, errors = {} } = usePage().props;
    const [alerts, setAlerts] = useState([]);
    const sequence = useRef(0);

    const removeAlert = useCallback((id) => {
        setAlerts((current) => current.filter((alert) => alert.id !== id));
    }, []);

    useEffect(() => {
        const success = typeof flash?.success === 'string' ? flash.success.trim() : '';
        const error = typeof flash?.error === 'string' ? flash.error.trim() : '';
        const globalError = typeof errors?.global === 'string' ? errors.global.trim() : '';
        const incoming = [];

        if (success) {
            incoming.push({ type: 'success', message: success });
        }

        if (error) {
            incoming.push({ type: 'error', message: error });
        }

        if (globalError && globalError !== error) {
            incoming.push({ type: 'error', message: globalError });
        }

        if (incoming.length === 0) {
            return;
        }

        setAlerts((current) => [
            ...current,
            ...incoming.map((alert) => ({
                ...alert,
                id: `${flash?.key ?? 'local'}-${++sequence.current}`,
            })),
        ]);
    }, [flash?.key, flash?.success, flash?.error, errors?.global]);

    if (alerts.length === 0) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
        >
            {alerts.map((alert) => (
                <Alert key={alert.id} alert={alert} onClose={removeAlert} />
            ))}
        </div>
    );
}
