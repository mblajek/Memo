<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\QueryBuilders\UserBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasCreatedBy;
use App\Models\Traits\HasValidator;
use App\Rules\RequirePresentRule;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * @property string name
 * @property ?string email
 * @property ?CarbonImmutable email_verified_at
 * @property ?string password
 * @property ?string remember_token
 * @property ?string $last_login_facility_id
 * @property ?string $global_admin_grant_id
 * @property ?CarbonImmutable $password_expire_at
 * @property-read Collection<Member> $members
 * @property-read Facility $lastLoginFacility
 * @method static UserBuilder query()
 */
class User extends Authenticatable
{
    use BaseModel;
    use Notifiable;
    use HasValidator;
    use HasCreatedBy;

    protected $table = 'users';

    public const SYSTEM = 'e144ff18-471f-456f-a1c2-971d88b3d213';

    /**
     * The attributes that are mass assignable.
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'email_verified_at',
        'password',
        'last_login_facility_id',
        'global_admin_grant_id',
        'password_expire_at',
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
        'password_expire_at' => 'immutable_datetime',
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'name' => 'required|string',
            'email' => ['nullable', 'string', 'email', Rule::unique('users', 'email'), new RequirePresentRule('has_email_verified')],
            'has_email_verified' => 'sometimes|bool',
            'password' => array_merge(
                ['bail', 'nullable', 'string'],
                self::fieldValidator('_password'),
                [new RequirePresentRule('password_expire_at')],
            ),
            '_password' => [Password::min(8)->letters()->mixedCase()->numbers()->uncompromised()],
            'password_expire_at' => 'sometimes|nullable|date',
            'last_login_facility_id' => 'nullable|uuid|exists:facilities,id',
            'has_global_admin' => 'required|bool',
        };
    }

    public function members(): HasMany
    {
        return $this->hasMany(Member::class);
    }

    public function lastLoginFacility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
