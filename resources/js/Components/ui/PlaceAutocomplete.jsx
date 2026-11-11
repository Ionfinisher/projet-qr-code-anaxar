import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { Spinner } from './Spinner.jsx';
import { controlClass } from './Field.jsx';
import { cn } from '../../Lib/cn.js';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

/**
 * Champ de saisie avec suggestions Google Places via le proxy Laravel.
 *
 * `kind="city"` suggère des villes, `kind="address"` des adresses.
 * La saisie libre reste possible : si l'API est indisponible, l'utilisateur peut
 * taper sa valeur manuellement. Le pays sélectionné restreint les suggestions.
 */
export function PlaceAutocomplete({
  id,
  value,
  onChange,
  countryCode,
  kind = 'city',
  placeholder,
  invalid = false,
  disabled = false,
  autoComplete = 'off',
}) {
  const listId = useId();
  const wrapperRef = useRef(null);
  const justSelected = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const isAddress = kind === 'address';
  const endpoint = isAddress ? route('places.addresses') : route('places.cities');

  const country = (countryCode || '').trim().toLowerCase();
  // « XX » correspond au pays « Autre » du seeder : aucune restriction possible.
  const normalizedCountry = country === 'xx' ? '' : country;

  // Ferme la liste au clic extérieur.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Changement de pays : les suggestions précédentes ne sont plus pertinentes.
  useEffect(() => {
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }, [normalizedCountry]);

  useEffect(() => {
    const term = (value || '').trim();

    // Après sélection, on ne relance pas de requête sur la valeur choisie.
    if (justSelected.current !== null) {
      const selected = justSelected.current;
      justSelected.current = null;
      if (term === selected) {
        setLoading(false);
        return undefined;
      }
    }

    if (term.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: term });
        if (normalizedCountry) params.set('country', normalizedCountry);

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }

        const data = await response.json();
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setOpen(list.length > 0);
        setActiveIndex(-1);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, normalizedCountry, endpoint]);

  const choose = (suggestion) => {
    if (!suggestion) return;

    justSelected.current = suggestion.label;
    onChange(suggestion.label);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(suggestions.length > 0);
        return;
      }
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return;
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      if (open && activeIndex >= 0) {
        event.preventDefault();
        choose(suggestions[activeIndex]);
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={invalid ? 'true' : undefined}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        className={controlClass(invalid, 'h-11 px-3.5 pr-10')}
      />

      {loading && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <Spinner size={16} label="Recherche de villes" />
        </span>
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={isAddress ? 'Adresses suggérées' : 'Villes suggérées'}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.place_id || `${suggestion.label}-${index}`} role="presentation">
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(suggestion)}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm',
                  index === activeIndex ? 'bg-brand-50 text-brand-900' : 'text-slate-800 hover:bg-slate-50'
                )}
              >
                <Icon name={isAddress ? 'house' : 'map-pin'} size={16} className="mt-0.5 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{suggestion.main}</span>
                  {suggestion.secondary && (
                    <span className="block truncate text-xs text-slate-500">{suggestion.secondary}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
