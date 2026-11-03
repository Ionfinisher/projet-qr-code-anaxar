<?php

namespace App\Models;

use App\Models\Concerns\HasGeneratedKey;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, HasGeneratedKey, HasRoles, Notifiable;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    protected string $keyColumn = 'keyuser';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'keyuser',
        'nom',
        'prenom',
        'email',
        'password',
        'telephone',
        'adresse',
        'access_token',
        'idpays',
        'idtransporteur',
        'statut',
        'created_by',
        'updated_by',
        'firebase_token',
        'name',
        'user_type',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'access_token',
        'firebase_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'must_change_password' => 'boolean',
    ];

    public function transporteur()
    {
        return $this->belongsTo(Transporteur::class, 'idtransporteur');
    }

    public function pays()
    {
        return $this->belongsTo(Pays::class, 'idpays');
    }

    public function isApproved(): bool
    {
        return $this->statut === null
            || $this->statut === self::STATUS_APPROVED
            || $this->statut === self::STATUS_ACTIVE;
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function creator()
    {
        return $this->belongsTo(self::class, 'created_by');
    }

    public function createdUsers()
    {
        return $this->hasMany(self::class, 'created_by');
    }

    public function isActive(): bool
    {
        return $this->statut !== self::STATUS_INACTIVE;
    }
}
