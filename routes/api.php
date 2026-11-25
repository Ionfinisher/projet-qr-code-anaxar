<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ScanController;
use App\Http\Controllers\PlaceAutocompleteController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Autocomplete (proxy serveur vers Google Places, clé jamais exposée).
Route::get('/places/cities', [PlaceAutocompleteController::class, 'cities'])
    ->middleware('throttle:places')
    ->name('places.cities');

Route::get('/places/addresses', [PlaceAutocompleteController::class, 'addresses'])
    ->middleware('throttle:places')
    ->name('places.addresses');

// API mobile : login, scan en lecture seule et logout.
Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:10,1')
        ->name('login');

    Route::middleware(['auth:sanctum', 'mobile', 'throttle:mobile-scan'])->group(function () {
        Route::post('/scan', [ScanController::class, 'scan'])
            ->name('scan');
        Route::post('/logout', [AuthController::class, 'logout'])
            ->name('logout');
    });
});
