<?php

use App\Http\Controllers\Admin\RegistrationController as AdminRegistrationController;
use App\Http\Controllers\Admin\CreneauController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\DemandeRdvController as AdminDemandeRdvController;
use App\Http\Controllers\Admin\RdvController as AdminRdvController;
use App\Http\Controllers\Admin\ProfileController as AdminProfileController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\CompanyUserController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ProfileRoleController;
use App\Http\Controllers\RegistrationEditController;
use App\Http\Controllers\RegistrationStatusController;
use App\Http\Controllers\Transporteur\CreneauDisponibleController;
use App\Http\Controllers\Transporteur\DemandeDocumentController;
use App\Http\Controllers\Transporteur\DemandeRdvController;
use App\Http\Controllers\Transporteur\RdvController as TransporteurRdvController;
use App\Http\Controllers\Transporteur\TemporaryUploadController;
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

Route::get('/', [AuthenticatedSessionController::class, 'create'])
    ->middleware('guest');

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
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('/registrations', [AdminRegistrationController::class, 'index'])->name('registrations.index');
    Route::get('/registrations/{inscription}', [AdminRegistrationController::class, 'show'])->name('registrations.show');
    Route::post('/registrations/{inscription}/approve', [AdminRegistrationController::class, 'approve'])->name('registrations.approve');
    Route::post('/registrations/{inscription}/reject', [AdminRegistrationController::class, 'reject'])->name('registrations.reject');
    Route::get('/registration-documents/{piece}/download', [AdminRegistrationController::class, 'download'])->name('registrations.documents.download');

    Route::get('/creneaux', [CreneauController::class, 'index'])->name('creneaux.index');
    Route::post('/creneaux/batch', [CreneauController::class, 'batchStore'])->name('creneaux.batch');
    Route::put('/creneaux/{creneau}', [CreneauController::class, 'update'])->name('creneaux.update');
    Route::delete('/creneaux/{creneau}', [CreneauController::class, 'destroy'])->name('creneaux.destroy');

    Route::get('/demandes', [AdminDemandeRdvController::class, 'index'])->name('demandes.index');
    Route::get('/demandes/{demande}', [AdminDemandeRdvController::class, 'show'])->name('demandes.show');
    Route::post('/demandes/{demande}/approve', [AdminDemandeRdvController::class, 'approve'])->name('demandes.approve');
    Route::post('/demandes/{demande}/reject', [AdminDemandeRdvController::class, 'reject'])->name('demandes.reject');
    Route::get('/demandes/{demande}/documents/{document}/telecharger', [AdminDemandeRdvController::class, 'downloadDocument'])
        ->name('demandes.documents.download');

    Route::get('/rendez-vous', [AdminRdvController::class, 'index'])->name('rdv.index');

    Route::get('/profils', [AdminProfileController::class, 'index'])->name('profils.index');
    Route::post('/profils', [AdminProfileController::class, 'store'])->name('profils.store');
    Route::put('/profils/{role}', [AdminProfileController::class, 'update'])->name('profils.update');
    Route::delete('/profils/{role}', [AdminProfileController::class, 'destroy'])->name('profils.destroy');

    Route::get('/utilisateurs', [AdminUserController::class, 'index'])->name('utilisateurs.index');
    Route::post('/utilisateurs', [AdminUserController::class, 'store'])->name('utilisateurs.store');
    Route::put('/utilisateurs/{user}', [AdminUserController::class, 'update'])->name('utilisateurs.update');
    Route::patch('/utilisateurs/{user}/toggle', [AdminUserController::class, 'toggle'])->name('utilisateurs.toggle');
    Route::post('/utilisateurs/{user}/reset-password', [AdminUserController::class, 'resetPassword'])->name('utilisateurs.reset-password');
    Route::delete('/utilisateurs/{user}', [AdminUserController::class, 'destroy'])->name('utilisateurs.destroy');
});

Route::middleware(['auth', 'verified', 'transporteur'])
    ->prefix('transporteur')
    ->name('transporteur.')
    ->group(function () {
        Route::get('/creneaux', [CreneauDisponibleController::class, 'index'])->name('creneaux.index');

        Route::get('/rendez-vous', [TransporteurRdvController::class, 'index'])->name('rdv.index');
        Route::get('/demandes', [DemandeRdvController::class, 'index'])->name('demandes.index');
        Route::get('/demandes/nouvelle', [DemandeRdvController::class, 'create'])->name('demandes.create');
        Route::post('/demandes', [DemandeRdvController::class, 'store'])->name('demandes.store');
        Route::get('/demandes/{demande}', [DemandeRdvController::class, 'show'])->name('demandes.show');
        Route::get('/demandes/{demande}/envoyee', [DemandeRdvController::class, 'sent'])->name('demandes.sent');
        Route::get('/demandes/{demande}/modifier', [DemandeRdvController::class, 'edit'])->name('demandes.edit');
        Route::put('/demandes/{demande}', [DemandeRdvController::class, 'update'])->name('demandes.update');
        Route::post('/demandes/{demande}/annuler', [DemandeRdvController::class, 'cancel'])->name('demandes.cancel');
        Route::get('/demandes/{demande}/documents/{document}/telecharger', [DemandeDocumentController::class, 'download'])
            ->name('demandes.documents.download');

        Route::post('/uploads', [TemporaryUploadController::class, 'store'])
            ->middleware('throttle:30,1')
            ->name('uploads.store');
        Route::delete('/uploads/{upload}', [TemporaryUploadController::class, 'destroy'])
            ->middleware('throttle:30,1')
            ->name('uploads.destroy');
    });

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::middleware('verified')->group(function () {
        Route::resource('profiles', ProfileRoleController::class)->except(['show']);
    });
    Route::middleware('verified')->group(function () {
        Route::get('/users', [CompanyUserController::class, 'index'])->name('users.index');
        Route::get('/users/create', [CompanyUserController::class, 'create'])->name('users.create');
        Route::post('/users', [CompanyUserController::class, 'store'])->name('users.store');
        Route::get('/users/{user}/edit', [CompanyUserController::class, 'edit'])->name('users.edit');
        Route::put('/users/{user}', [CompanyUserController::class, 'update'])->name('users.update');
        Route::patch('/users/{user}/toggle', [CompanyUserController::class, 'toggle'])->name('users.toggle');
        Route::delete('/users/{user}', [CompanyUserController::class, 'destroy'])->name('users.destroy');
    });

    Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/permissions', [PermissionController::class, 'index'])->name('permissions.index');
        Route::post('/permissions', [PermissionController::class, 'store'])->name('permissions.store');
        Route::put('/permissions/{permission}', [PermissionController::class, 'update'])->name('permissions.update');
        Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy'])->name('permissions.destroy');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
