<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Google Places (Autocomplete des villes)
    |--------------------------------------------------------------------------
    |
    | La clé reste côté serveur : elle n'est jamais exposée au navigateur.
    | Activer « Places API (New) » dans le projet Google Cloud associé.
    |
    */

    'google_places' => [
        'key' => env('GOOGLE_PLACES_API_KEY'),
        'endpoint' => env(
            'GOOGLE_PLACES_ENDPOINT',
            'https://places.googleapis.com/v1/places:autocomplete'
        ),
        'timeout' => (int) env('GOOGLE_PLACES_TIMEOUT', 5),
    ],

];
