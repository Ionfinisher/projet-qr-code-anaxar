<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Administrateur initial
    |--------------------------------------------------------------------------
    |
    | Utilisées uniquement par AdminUserSeeder pour créer le premier compte
    | administrateur. Laisser vides pour ne créer aucun compte automatique.
    |
    */

    'email' => env('ADMIN_EMAIL'),
    'password' => env('ADMIN_PASSWORD'),
];
