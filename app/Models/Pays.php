<?php

namespace App\Models;

use App\Models\Concerns\HasGeneratedKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pays extends Model
{
    use HasFactory, HasGeneratedKey;

    protected string $keyColumn = 'keypays';

    protected $fillable = [
        'keypays',
        'nom',
        'indicatif',
        'code',
    ];

    public function users()
    {
        return $this->hasMany(User::class, 'idpays');
    }
}
