// Étape 2 : camion(s) — chauffeur (téléphone, permis), véhicule (plaques ISO 3166-1), conteneur ISO 6346, BL, marchandise, VGM.
import { useMemo, useState } from 'react';
import { COUNTRIES, ISO_TYPES, ISO_TYPE, parseContainer, parseBL, normalizePlate, licenseValid } from '../../../../lib/domain.js';
import { notify } from '../../../../lib/alerts.js';
import { Field, Input, Select, Textarea, PhoneInput, Button, IconButton, Badge, Modal, Icon, fieldProps } from '../../../../components/ui/index.js';
import { ContainerNumber, Plate } from '../../../../components/domain/index.js';
import { cn } from '../../../../lib/cn.js';
import { newTruck, parsePastedTrucks } from '../../demandeForm.js';
import { TruckNo, SubTitle } from './WizardParts.jsx';

/** N° de conteneur avec diagnostic ISO 6346 en direct (chiffre de contrôle, propriétaire BIC). */
export function ContainerField({ id, value, onChange, error, optional }) {
  const p = parseContainer(value);
  const showErr = error && !p.valid ? error : null;
  const state = !value ? null : p.valid ? 'ok' : p.complete ? 'bad' : null;
  const hint = value ? p.message : 'ISO 6346 : 4 lettres + 7 chiffres, ex. CSQU 305438 3.';
  return (
    <Field id={id} label="N° de conteneur" required={!optional} optional={optional} error={showErr} hint={hint} hintTone={p.valid ? 'ok' : undefined}>
      <div className="relative">
        <Input mono autoComplete="off" spellCheck={false} maxLength={15} placeholder="Ex. MSCU 482913 0" className="pr-10"
          {...fieldProps(id, showErr, hint)} value={value} onChange={ev => onChange(ev.target.value.toUpperCase())} />
        {state && (
          <span className={cn('pointer-events-none absolute inset-y-0 right-3 flex items-center', state === 'ok' ? 'text-emerald-600' : 'text-rose-600')}>
            <Icon name={state === 'ok' ? 'circle-check' : 'circle-x'} size={20} />
          </span>
        )}
      </div>
    </Field>
  );
}

/** N° de connaissement ; le préfixe SCAC identifie l'armateur. */
export function BLField({ id, value, onChange, error, optional }) {
  const b = parseBL(value);
  const showErr = error && !b.valid ? error : null;
  const hint = value && b.message ? b.message : 'Le préfixe SCAC identifie l’armateur, ex. MEDU pour MSC.';
  return (
    <Field id={id} label="N° de connaissement (BL)" required={!optional} optional={optional} error={showErr} hint={hint} hintTone={b.valid && b.carrier ? 'ok' : undefined}>
      <Input mono autoComplete="off" spellCheck={false} maxLength={24} placeholder="Ex. MEDU45128830"
        {...fieldProps(id, showErr, hint)} value={value} onChange={ev => onChange(ev.target.value.toUpperCase())} />
    </Field>
  );
}

/** Formulaire d'un camion. */
export function TruckForm({ t, i, op, e, setTruck }) {
  const id = k => `k${i}-${k}`;
  const set = patch => setTruck(t.k, patch);
  const needBL = op === 'IMP' || op === 'EXP';
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SubTitle>Chauffeur</SubTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id={id('first')} label="Prénom" required error={e.first}><Input {...fieldProps(id('first'), e.first)} value={t.first} onChange={ev => set({ first: ev.target.value })} /></Field>
          <Field id={id('last')} label="Nom" required error={e.last}><Input {...fieldProps(id('last'), e.last)} value={t.last} onChange={ev => set({ last: ev.target.value })} /></Field>
          <Field id={id('phone')} label="Téléphone" required error={e.phone} hint="Reçoit le QR code par WhatsApp.">
            <PhoneInput id={id('phone')} cc={t.phoneCc} value={t.phone} onCc={v => set({ phoneCc: v })} onChange={v => set({ phone: v })} error={e.phone} hint="x" />
          </Field>
          <Field id={id('lic')} label="N° de permis de conduire" required error={e.license} hint="Catégorie C ou CE. Vérifié à la guérite avec le permis original.">
            <Input mono autoComplete="off" spellCheck={false} maxLength={24} placeholder="Ex. TG-1234567"
              {...fieldProps(id('lic'), e.license, 'x')} value={t.license} onChange={ev => set({ license: ev.target.value.toUpperCase().replace(/[^A-Z0-9 /-]/g, '') })} />
          </Field>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <SubTitle>Véhicule</SubTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field id={id('cc')} label="Pays d’immatriculation" hint="Code ISO 3166-1.">
            <Select {...fieldProps(id('cc'), null, 'x')} value={t.country} onChange={ev => set({ country: ev.target.value })}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
            </Select>
          </Field>
          <Field id={id('tractor')} label="Tracteur" required error={e.tractor}>
            <Input mono autoComplete="off" placeholder="Ex. 4521 BX" {...fieldProps(id('tractor'), e.tractor)} value={t.tractor} onChange={ev => set({ tractor: normalizePlate(ev.target.value) })} />
          </Field>
          <Field id={id('trailer')} label="Remorque" optional error={e.trailer}>
            <Input mono autoComplete="off" {...fieldProps(id('trailer'), e.trailer)} value={t.trailer} onChange={ev => set({ trailer: normalizePlate(ev.target.value) })} />
          </Field>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <SubTitle>Conteneur</SubTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ContainerField id={id('ctr')} value={t.container} onChange={v => set({ container: v })} error={e.container} optional={op === 'MTP'} />
          <Field id={id('iso')} label="Code taille/type ISO" hint={ISO_TYPE[t.iso]?.label}>
            <Select {...fieldProps(id('iso'), null, 'x')} value={t.iso} onChange={ev => set({ iso: ev.target.value })}>
              {ISO_TYPES.map(x => <option key={x.code} value={x.code}>{x.code} · {x.label}</option>)}
            </Select>
          </Field>
          <BLField id={id('bl')} value={t.bl} onChange={v => set({ bl: v })} error={e.bl} optional={!needBL} />
          {needBL && (
            <Field id={id('goods')} label="Marchandise" required error={e.goods}>
              <Input {...fieldProps(id('goods'), e.goods)} value={t.goods} onChange={ev => set({ goods: ev.target.value })} placeholder="Ex. Riz en sacs de 25 kg" />
            </Field>
          )}
          {op === 'EXP' && (
            <Field id={id('vgm')} label="Masse brute vérifiée (VGM, kg)" optional error={e.vgm} hint="Exigence SOLAS pour l’embarquement.">
              <Input inputMode="numeric" className="tabular-nums" {...fieldProps(id('vgm'), e.vgm, 'x')} value={t.vgm} onChange={ev => set({ vgm: ev.target.value.replace(/\D/g, '').slice(0, 5) })} />
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}

/** Collage d'une liste de camions depuis un tableur. */
export function PasteModal({ open, onClose, onImport }) {
  const [text, setText] = useState('');
  const rows = useMemo(() => parsePastedTrucks(text), [text]);
  const valid = rows.filter(r => parseContainer(r.container).valid).length;
  const noLic = rows.filter(r => !licenseValid(r.license)).length;
  return (
    <Modal open={open} onClose={onClose} title="Coller une liste de camions" size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button icon="table" disabled={!rows.length} onClick={() => { onImport(rows); setText(''); }}>Importer {rows.length || ''} ligne{rows.length > 1 ? 's' : ''}</Button></>}>
      <p className="text-sm text-slate-600">Une ligne par camion, colonnes séparées par tabulation (copie Excel), point-virgule ou virgule :</p>
      <p className="rounded-xl bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">conteneur ; connaissement ; tracteur ; prénom nom ; téléphone ; marchandise ; n° de permis</p>
      <label className="sr-only" htmlFor="paste-ta">Lignes à importer</label>
      <Textarea id="paste-ta" rows={7} className="min-h-[160px] font-mono text-[13px]" value={text} onChange={ev => setText(ev.target.value)}
        placeholder={'MSCU4829130;MEDU45128830;4521 BX;Komlan AGBEKO;90114477;Riz en sacs;TG-2014587\nCSQU3054383;MEDU45128830;7781 KT;Yao MENSAH;91223344;Riz en sacs;TG-1987345'} />
      {rows.length > 0 && (
        <p className="text-sm text-slate-600">
          {rows.length} ligne{rows.length > 1 ? 's' : ''} lue{rows.length > 1 ? 's' : ''} · {valid} numéro{valid > 1 ? 's' : ''} de conteneur valide{valid > 1 ? 's' : ''} (ISO 6346)
          {noLic > 0 ? ` · ${noLic} n° de permis manquant${noLic > 1 ? 's' : ''} ou invalide${noLic > 1 ? 's' : ''}` : ''}. Complétez les champs manquants après l’import.
        </p>
      )}
    </Modal>
  );
}

/** Étape 2 complète : un camion, ou liste de camions (ajout, duplication, repli, collage). */
export function StepTrucks({ f, set, setTruck, e }) {
  const [paste, setPaste] = useState(false);
  const [open, setOpen] = useState({});
  if (f.mode !== 'lot') {
    return <TruckForm t={f.trucks[0]} i={0} op={f.op} e={e[0] || {}} setTruck={setTruck} />;
  }
  const add = () => set(x => ({ trucks: [...x.trucks, newTruck(null)] }));
  const dup = t => set(x => ({ trucks: [...x.trucks, { ...newTruck(null), bl: t.bl, goods: t.goods, iso: t.iso, country: t.country }] }));
  const remove = k => set(x => ({ trucks: x.trucks.filter(t => t.k !== k) }));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{f.trucks.length} camion{f.trucks.length > 1 ? 's' : ''} · même créneau, un QR code par camion après validation.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon="clipboard-paste" onClick={() => setPaste(true)}>Coller depuis un tableur</Button>
          <Button variant="secondary" size="sm" icon="plus" onClick={add}>Ajouter un camion</Button>
        </div>
      </div>
      {f.trucks.map((t, i) => {
        const err = e[i] || {};
        const nErr = Object.keys(err).length;
        const collapsed = open[t.k] === false;
        const c = parseContainer(t.container);
        return (
          <section key={t.k} aria-label={`Camion ${i + 1}`} className={cn('overflow-hidden rounded-2xl border bg-white', nErr ? 'border-rose-300' : 'border-slate-200')}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <h4 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                <TruckNo n={i + 1} /> Camion {i + 1}
                {nErr > 0 && <Badge tone="bad" icon="triangle-alert">{nErr} à corriger</Badge>}
              </h4>
              <div className="flex items-center gap-1">
                <IconButton icon="copy-plus" size="sm" label={`Dupliquer le camion ${i + 1} (BL et marchandise)`} onClick={() => dup(t)} />
                {f.trucks.length > 2 && <IconButton icon="trash-2" size="sm" variant="danger" label={`Retirer le camion ${i + 1}`} onClick={() => remove(t.k)} />}
                <IconButton icon={collapsed ? 'chevron-down' : 'chevron-up'} size="sm" label={collapsed ? 'Déplier' : 'Replier'} onClick={() => setOpen(o => ({ ...o, [t.k]: collapsed }))} />
              </div>
            </div>
            {collapsed ? (
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-slate-600">
                {c.valid ? <ContainerNumber value={c.raw} size="sm" /> : <span>Conteneur à saisir</span>}
                {t.tractor && <Plate country={t.country} value={t.tractor} size="sm" />}
                <span>{`${t.first} ${t.last}`.trim() || 'Chauffeur à saisir'}</span>
              </div>
            ) : <div className="p-4 sm:p-5"><TruckForm t={t} i={i} op={f.op} e={err} setTruck={setTruck} /></div>}
          </section>
        );
      })}
      <div><Button variant="secondary" icon="plus" onClick={add}>Ajouter un camion</Button></div>
      <PasteModal open={paste} onClose={() => setPaste(false)} onImport={rows => {
        set(x => {
          const keep = x.trucks.filter(t => t.container || t.tractor || t.first);
          const all = [...keep, ...rows];
          return { trucks: all.length >= 2 ? all : [...all, newTruck(null)] };
        });
        setPaste(false);
        notify(`${rows.length} camion${rows.length > 1 ? 's' : ''} importé${rows.length > 1 ? 's' : ''}`, 'ok');
      }} />
    </>
  );
}
