<?php

namespace App\Notifications\Concerns;

trait RetryableMailNotification
{
    public int $tries = 5;

    public array $backoff = [60, 120, 240, 480];

}
