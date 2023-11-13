<?php

namespace App\Models;

use App\Models\QueryBuilders\UserBuilder;
use App\Rules\RequirePresentRule;
use App\Utils\Uuid\UuidTrait;
use App\Utils\Validation\HasValidator;
use App\Utils\Validation\RuleContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

use function App\Utils\Validation\insertAndPatch;
use function App\Utils\Validation\insertAndResource;
use function App\Utils\Validation\patch;
use function App\Utils\Validation\resource;


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
 * @property-read bool $has_password
 * @property-read bool $has_email_verified
 * @property-read bool $has_global_admin
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

    protected $appends = [
        'has_password',
        'has_email_verified',
        'has_global_admin',
    ];

    public static function getPasswordRules(): Password
    {
        return Password::min(8)->letters()->mixedCase()->numbers()->uncompromised();
    }

    /** @noinspection PhpUnused -> has_password */
    public function getHasPasswordAttribute(): bool
    {
        return $this->password !== null;
    }

    /** @noinspection PhpUnused -> has_email_verified */
    public function getHasEmailVerifiedAttribute(): bool
    {
        return $this->email_verified_at !== null;
    }

    /** @noinspection PhpUnused -> has_global_admin */
    public function getHasGlobalAdminAttribute(): bool
    {
        return $this->global_admin_grant_id !== null;
    }

    public static function validationRules(): array
    {
        return [
            'name' => [patch('sometimes'), 'required', 'string'],
            'email' => [
                patch('sometimes'),
                'nullable',
                'string',
                'email',
                insertAndPatch(
                    Rule::unique('users', 'email'),
                ),
                new RequirePresentRule('has_email_verified'),
                'required_if_accepted:has_global_admin'

            ],
            'has_email_verified' => [
                patch('sometimes'),
                'nullable',
                'bool',
                new RequirePresentRule('email'),
            ],
            'password' => [
                patch('sometimes'),
                'bail',
                'nullable',
                'string',
                insertAndPatch(self::getPasswordRules(), new RequirePresentRule('password_expire_at')),
                insertAndResource(new RequirePresentRule('email')),
            ],
            'password_expire_at' => [
                patch('sometimes'),
                'nullable',
                'date',
                new RequirePresentRule('password'),
                // TODO: When password is null, password_expire_at must be null as well
            ],
            'has_password' => [
                resource(
                    'bool',
                    'accepted_if:has_global_admin,true'
                )
            ],
            'has_global_admin' => [
                insertAndPatch('sometimes'),
                resource('required'),
                'bool'
            ]
        ];
    }

    public static function getInsertValidator(): array
    {
        return RuleContext::insert->selectRules(static::validationRules());
    }

    public static function getPatchValidator(): array
    {
        return RuleContext::patch->selectRules(static::validationRules());
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

    protected static function fieldValidator(string $field): string|array
    {
        // I would like to remove this method when I implement `validationRules`
        // in all entities.
        return [];
    }
}
