<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:4200'), '/');
        $url = $frontendUrl.'/forgot-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        $minutes = (int) config('auth.passwords.'.config('auth.defaults.passwords', 'users').'.expire', 5);

        return (new MailMessage)
            ->subject('Restauracion de contrasena')
            ->greeting('Hola!')
            ->line('Recibimos una solicitud para restaurar tu contrasena.')
            ->line('Este enlace expirara en '.$minutes.' minutos.')
            ->action('Restaurar contrasena', $url)
            ->line('Si no solicitaste este cambio, puedes ignorar este correo.');
    }
}
