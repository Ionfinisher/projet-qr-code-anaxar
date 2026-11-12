<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RegistrationComplementsRequested extends Notification implements ShouldQueue
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
            ->subject('Des compléments sont nécessaires pour votre dossier')
            ->greeting('Bonjour '.$notifiable->name)
            ->line('Des compléments sont nécessaires pour votre dossier '.$this->numeroDossier.'.')
            ->line('Demandes de l’administration : '.$this->reason)
            ->action('Compléter mon dossier', route('registration.status'));
    }
}
