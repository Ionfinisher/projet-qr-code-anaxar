<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RegistrationApproved extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('Votre compte est validé')
            ->greeting('Bonjour '.$notifiable->name)
            ->line('Votre dossier a été validé. Vous pouvez maintenant vous connecter à votre espace.');

        if (method_exists($notifiable, 'hasVerifiedEmail') && ! $notifiable->hasVerifiedEmail()) {
            $message->line('Pensez également à vérifier votre adresse email : un lien vous a été envoyé lors de votre inscription.');
        }

        return $message->action('Se connecter', route('login'));
    }
}
