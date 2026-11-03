// Fenêtres React (formulaires) : <Modal> centrée et <Drawer> latéral (panneau du bas sur mobile).
// Focus piégé, Échap pour fermer, défilement de la page bloqué, rendu dans document.body.
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Swal } from '../../Lib/alerts.js';
import { IconButton } from './Button.jsx';
import { cn } from '../../Lib/cn.js';

const stack = [];
let locks = 0;
function lockScroll() {
  if (locks++ === 0) document.documentElement.style.overflow = 'hidden';
  return () => { if (--locks === 0) document.documentElement.style.overflow = ''; };
}
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useDialog(open, onClose, panelRef) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    stack.push(token);
    const previous = document.activeElement;
    const unlock = lockScroll();
    const el = panelRef.current;
    const t = setTimeout(() => {
      const target = el?.querySelector('[data-autofocus]') || el?.querySelector('[autofocus]') || el?.querySelector(FOCUSABLE) || el;
      target?.focus?.();
    }, 20);
    const onKey = e => {
      // Une fenêtre SweetAlert ouverte garde la main (les simples notifications, elles, n'interceptent rien)
      const swalModal = Swal.isVisible() && !Swal.getPopup()?.classList.contains('swal2-toast');
      if (stack[stack.length - 1] !== token || swalModal) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.(); return; }
      if (e.key !== 'Tab' || !el) return;
      const items = [...el.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      unlock();
      if (previous && document.contains(previous)) previous.focus?.();
    };
  }, [open, panelRef]);
}

function Frame({ open, onClose, title, description, footer, children, kind, size, className, bodyClassName, dismissible = true }) {
  const panel = useRef(null);
  const titleId = useId();
  const descId = useId();
  useDialog(open, dismissible ? onClose : undefined, panel);
  if (!open) return null;
  const widths = kind === 'modal'
    ? { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }
    : { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };
  return createPortal(
    <div className={cn('fixed inset-0 z-[60] flex', kind === 'modal' ? 'items-end justify-center sm:items-center sm:p-6' : 'items-end justify-end sm:items-stretch')} lang="fr">
      <div className="pf-anim-fade absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" aria-hidden="true" onMouseDown={dismissible ? onClose : undefined} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1}
        className={cn('relative flex max-h-[92vh] w-full flex-col bg-white shadow-[0_24px_64px_rgba(15,23,42,0.28)] focus:outline-none',
          kind === 'modal' ? 'pf-anim-pop rounded-t-3xl sm:rounded-2xl' : 'pf-anim-drawer rounded-t-3xl sm:h-full sm:max-h-none sm:rounded-none sm:rounded-l-3xl',
          widths[size] || widths.md, className)}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p id={descId} className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {dismissible && <IconButton icon="x" label="Fermer" onClick={onClose} className="-mr-2 -mt-1" />}
        </header>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>
          <div className="flex flex-col gap-5">{children}</div>
        </div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Fenêtre centrée. size : sm | md | lg | xl */
export function Modal(props) { return <Frame kind="modal" size="md" {...props} />; }

/** Panneau latéral (détail, formulaire long). size : sm | md | lg | xl */
export function Drawer(props) { return <Frame kind="drawer" size="md" {...props} />; }
