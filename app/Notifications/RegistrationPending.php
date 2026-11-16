<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Notifications\Concerns\RetryableMailNotification;

class RegistrationPending extends Notification implements ShouldQueue
{
    use Queueable;
    use RetryableMailNotification;

    public function __construct(private readonly string $numeroDossier)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre dossier est en cours de validation')
            ->greeting('Bonjour '.$notifiable->name)
            ->line('Votre adresse email a été vérifiée.')
            ->line('Votre dossier '.$this->numeroDossier.' est maintenant en cours de validation.')
            ->action('Suivre mon dossier', route('registration.status'));
    }
}
