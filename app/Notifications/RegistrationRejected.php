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
            ->subject('Votre dossier nécessite une correction')
            ->greeting('Bonjour '.$notifiable->name)
            ->line('Votre dossier '.$this->numeroDossier.' a été rejeté.')
            ->line('Motif : '.$this->reason)
            ->action('Modifier mon dossier', route('registration.status'));
    }
}
