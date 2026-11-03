/** Concatène des classes Tailwind conditionnelles : cn('a', ok && 'b', ['c', null]) → 'a b c'. */
export const cn = (...a) => a.flat(Infinity).filter(Boolean).join(' ');
