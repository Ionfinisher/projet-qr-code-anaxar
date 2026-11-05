<?php

namespace App\Notifications;

use App\Models\DemandeRdv;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DemandeRdvDecided extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly DemandeRdv $demande,
        private readonly bool $approved
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $creneau = $this->demande->creneau;
        $message = (new MailMessage)
            ->subject(($this->approved ? 'Demande validée' : 'Demande rejetée').' — '.$this->demande->reference)
            ->greeting('Bonjour '.$notifiable->name)
            ->line('Votre demande de rendez-vous '.$this->demande->reference.' a été '
                .($this->approved ? 'validée.' : 'rejetée.'));

        if ($creneau) {
            $message->line('Créneau : '.$creneau->date->format('d/m/Y').' de '
                .$creneau->start.' à '.$creneau->end);
        }

        if ($this->approved) {
            $message->line('Merci de vous présenter 30 minutes avant le début du créneau.');
        } elseif ($this->demande->rejection_reason) {
            $message->line('Motif : '.$this->demande->rejection_reason);
        }

        if ($this->demande->decision_comment) {
            $message->line('Commentaire : '.$this->demande->decision_comment);
        }

        return $message->action(
            'Voir ma demande',
            route('transporteur.demandes.sent', $this->demande)
        );
    }
}
