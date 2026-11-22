import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Drawer } from '@/Components/ui/Overlay';
import { Button } from '@/Components/ui/Button';
import { Field, Input, Select } from '@/Components/ui/Field';

export function TerminalDrawer({ open, terminal, onClose }) {
    const isEditing = !!terminal;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        code: terminal?.code || '',
        short: terminal?.short || '',
        label: terminal?.label || '',
        statut: terminal?.statut || 'active',
    });

    const submit = (e) => {
        e?.preventDefault();
        if (isEditing) {
            put(route('admin.terminals.update', terminal.id), {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post(route('admin.terminals.store'), {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={isEditing ? `Modifier le terminal · ${terminal.code}` : 'Ajouter un terminal'}
            description="Configuration du terminal portuaire de rendez-vous"
            footer={
                <div className="flex w-full items-center justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        form="terminal-form"
                        loading={processing}
                        icon="check"
                    >
                        {isEditing ? 'Enregistrer les modifications' : 'Créer le terminal'}
                    </Button>
                </div>
            }
        >
            <form id="terminal-form" onSubmit={submit} className="flex flex-col gap-4">
                <Field
                    id="term-code"
                    label="Code du terminal"
                    required
                    error={errors.code}
                    hint="Identifiant court unique en majuscules (ex. LCT, TGT, QCV)"
                >
                    <Input
                        id="term-code"
                        placeholder="Ex. LCT"
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        maxLength={10}
                        required
                    />
                </Field>

                <Field
                    id="term-short"
                    label="Nom abrégé"
                    required
                    error={errors.short}
                    hint="Nom court utilisé dans les badges et plannings (ex. LCT)"
                >
                    <Input
                        id="term-short"
                        placeholder="Ex. LCT"
                        value={data.short}
                        onChange={(e) => setData('short', e.target.value)}
                        maxLength={20}
                        required
                    />
                </Field>

                <Field
                    id="term-label"
                    label="Nom complet du terminal"
                    required
                    error={errors.label}
                    hint="Libellé officiel complet (ex. Lomé Container Terminal)"
                >
                    <Input
                        id="term-label"
                        placeholder="Ex. Lomé Container Terminal"
                        value={data.label}
                        onChange={(e) => setData('label', e.target.value)}
                        maxLength={100}
                        required
                    />
                </Field>

                <Field
                    id="term-statut"
                    label="Statut"
                    required
                    error={errors.statut}
                >
                    <Select
                        id="term-statut"
                        value={data.statut}
                        onChange={(e) => setData('statut', e.target.value)}
                    >
                        <option value="active">Actif (ouvert aux réservations)</option>
                        <option value="inactive">Inactif (masqué / fermé)</option>
                    </Select>
                </Field>
            </form>
        </Drawer>
    );
}

