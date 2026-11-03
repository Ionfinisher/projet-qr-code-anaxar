<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CreatedUserCredentials extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $temporaryPassword)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Vos identifiants PortFlow')
            ->greeting('Bonjour '.($notifiable->prenom ?: $notifiable->name).',')
            ->line('Un compte PortFlow a été créé pour vous.')
            ->line('Email : '.$notifiable->email)
            ->line('Mot de passe temporaire : '.$this->temporaryPassword)
            ->line('Pour votre sécurité, vous devez modifier ce mot de passe lors de votre première connexion.')
            ->action('Se connecter', url('/login'));
    }
}
