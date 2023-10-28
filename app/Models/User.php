<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\QueryBuilders\UserBuilder;
use App\Rules\RequirePresentRule;
use App\Utils\Uuid\UuidTrait;
use App\Utils\Validation\HasValidator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;

/**
 * @property string id
 * @property string name
 * @property ?string email
 * @property ?CarbonImmutable email_verified_at
 * @property ?string password
 * @property ?string remember_token
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property string created_by
 * @property ?string $last_login_facility_id
 * @property ?string $global_admin_grant_id
 * @property ?CarbonImmutable $password_expire_at
 * @property-read Collection<Member> $members
 * @property-read User $createdBy
 * @property-read Facility $lastLoginFacility
 * @method static UserBuilder query()
 */
class User extends Authenticatable
{
    use HasFactory;
    use Notifiable;
    use UuidTrait;
    use HasValidator;

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
        'created_by',
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

    public static function getPatchValidator(): array
    {
        return [
            'name' => 'sometimes|required|string',
            'email' => ['sometimes','nullable','string', 'email',
                 Rule::unique('users', 'email'),
                new RequirePresentRule('has_email_verified')
            ],
            'has_email_verified' => ['sometimes', 'nullable', 'bool',
                new RequirePresentRule('email'),
                // TODO: When email == null, has_email_verified must be null as well
            ],
            'password' => array_merge(
                ['bail', 'nullable', 'string'],
                self::fieldValidator('_password'),
                [new RequirePresentRule('password_expire_at')],
            ),
            '_password' => [Password::min(8)->letters()->mixedCase()->numbers()->uncompromised()],
            'password_expire_at' => ['sometimes', 'nullable', 'date',
                new RequirePresentRule('password'),
                // TODO: When password is null, password_expire_at must be null as well
            ],
            'has_global_admin' => 'sometimes|bool',
        ];
    }

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'name' => 'required|string',
            'email' => ['nullable', 'string', 'email',
                Rule::unique('users', 'email'),
                new RequirePresentRule('has_email_verified'),
                'required_if_accepted:has_global_admin'
            ],
            'has_email_verified' => ['sometimes', 'bool',
                new RequirePresentRule('email'),
            ],
            'password' => array_merge(
                ['bail', 'nullable', 'string'],
                self::fieldValidator('_password'),
                [new RequirePresentRule('password_expire_at'),
                    new RequirePresentRule('email')],
            ),
            '_password' => [Password::min(8)->letters()->mixedCase()->numbers()->uncompromised()],
            'password_expire_at' => ['sometimes', 'nullable', 'date',
                new RequirePresentRule('password'),
            ],
            'last_login_facility_id' => 'nullable|uuid|exists:facilities,id',
            'has_global_admin' => 'required|bool',
        };
    }

    public function members(): HasMany
    {
        return $this->hasMany(Member::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'created_by');
    }

    public function lastLoginFacility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
