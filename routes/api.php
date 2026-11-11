<?php

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
