<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemporaryUpload extends Model
{
    use HasFactory;

    protected $fillable = [
        'token',
        'user_id',
        'type',
        'original_name',
        'path',
        'mime',
        'size',
        'sha256',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function getRouteKeyName(): string
    {
        return 'token';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
