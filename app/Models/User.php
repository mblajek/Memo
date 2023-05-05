<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Utils\Date\DateTimeTrait;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property string id
 * @property string name
 * @property string email
 * @property ?CarbonImmutable email_verified_at
 * @property ?string password
 * @property ?string remember_token
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property string created_by
 */
class User extends Authenticatable
{
    public const SYSTEM = 'e144ff18-471f-456f-a1c2-971d88b3d213';
    use HasApiTokens, HasFactory, Notifiable, DateTimeTrait, UuidTrait;

    /**
     * The attributes that are mass assignable.
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'email_verified_at',
        'password',
        'created_by',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'immutable_datetime',
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'created_by');
    }
}
