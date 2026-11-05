<?php

namespace App\Notifications;

use App\Models\DemandeRdv;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DemandeRdvSubmitted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly DemandeRdv $demande)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $creneau = $this->demande->creneau;

        return (new MailMessage)
            ->subject('Demande de rendez-vous reçue — '.$this->demande->reference)
            ->greeting('Bonjour '.$notifiable->name)
            ->line('Votre demande de rendez-vous a bien été enregistrée.')
            ->line('Référence : '.$this->demande->reference)
            ->line('Créneau : '.($creneau
                ? $creneau->date->format('d/m/Y').' de '.$creneau->start.' à '.$creneau->end
                : '—'))
            ->line('Nombre de camions : '.$this->demande->trucks_count)
            ->action('Suivre ma demande', route('transporteur.demandes.sent', $this->demande))
            ->line('La décision de l’administration vous sera notifiée par e-mail.');
    }
}
