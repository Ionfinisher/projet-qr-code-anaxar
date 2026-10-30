<?php

use App\Http\Controllers\Admin\RegistrationController as AdminRegistrationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RegistrationEditController;
use App\Http\Controllers\RegistrationStatusController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/registration/status', [RegistrationStatusController::class, 'create'])->name('registration.status');
Route::get('/registration/verify/{id}/{hash}', [RegistrationStatusController::class, 'verify'])
    ->middleware('signed')
    ->name('registration.verification');
Route::get('/registration/status/search', [RegistrationStatusController::class, 'show'])
    ->middleware('throttle:10,1')
    ->name('registration.status.search');
Route::get('/registration/{numeroDossier}/edit', [RegistrationEditController::class, 'edit'])
    ->middleware('throttle:10,1')
    ->name('registration.edit');
Route::post('/registration/{numeroDossier}', [RegistrationEditController::class, 'update'])
    ->middleware('throttle:10,1')
    ->name('registration.update');

Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/registrations', [AdminRegistrationController::class, 'index'])->name('registrations.index');
    Route::get('/registrations/{inscription}', [AdminRegistrationController::class, 'show'])->name('registrations.show');
    Route::post('/registrations/{inscription}/approve', [AdminRegistrationController::class, 'approve'])->name('registrations.approve');
    Route::post('/registrations/{inscription}/reject', [AdminRegistrationController::class, 'reject'])->name('registrations.reject');
    Route::get('/registration-documents/{piece}/download', [AdminRegistrationController::class, 'download'])->name('registrations.documents.download');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
