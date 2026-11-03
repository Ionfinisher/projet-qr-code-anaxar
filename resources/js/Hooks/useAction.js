import { useCallback, useRef, useState } from "react";
import { notify } from "../Lib/alerts.js";

/**
 * Exécute une action d'API avec état « en cours » et notification d'erreur.
 *   const [save, saving] = useAction(api.save, { success: 'Enregistré' });
 *   const r = await save(args);   // r.ok, r.error…
 */
export function useAction(fn, { success, error = true } = {}) {
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const run = useCallback(
        async (...args) => {
            if (lock.current)
                return { ok: false, error: "Action déjà en cours." };
            lock.current = true;
            setBusy(true);
            try {
                const r = await fn(...args);
                if (r && r.ok === false && error)
                    notify(r.error || "Action impossible.", "bad");
                else if (r?.ok !== false && success)
                    notify(
                        typeof success === "function" ? success(r) : success,
                        "ok",
                    );
                return r;
            } finally {
                lock.current = false;
                setBusy(false);
            }
        },
        [fn, success, error],
    );
    return [run, busy];
}
