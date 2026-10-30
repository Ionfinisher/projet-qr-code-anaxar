<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyRegistrationEmail extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly ?string $numeroDossier = null) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('Vérifiez votre adresse email')
            ->greeting('Bonjour '.$notifiable->name)
            ->line('Merci pour votre inscription. Cliquez sur le bouton ci-dessous pour vérifier votre adresse email.');

        if ($this->numeroDossier !== null) {
            $message->line('Numéro de dossier : '.$this->numeroDossier);
        }

        return $message
            ->action('Vérifier mon email', URL::temporarySignedRoute('registration.verification', now()->addDay(), [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]))
            ->line('Votre dossier sera ensuite transmis pour validation.');
    }
}
