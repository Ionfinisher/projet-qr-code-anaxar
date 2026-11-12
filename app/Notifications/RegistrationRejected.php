<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RegistrationRejected extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $reason, private readonly string $numeroDossier)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre dossier a été rejeté')
            ->greeting('Bonjour '.$notifiable->name)
            ->line('Votre dossier '.$this->numeroDossier.' a été rejeté. Vous devrez créer une nouvelle demande.')
            ->line('Motif : '.$this->reason)
            ->action('Suivre mes demandes', route('registration.status'));
    }
}
