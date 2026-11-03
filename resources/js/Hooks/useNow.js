import { useEffect, useState } from 'react';

/** Heure courante rafraîchie périodiquement (statuts dérivés : en retard, créneau dépassé…). */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
