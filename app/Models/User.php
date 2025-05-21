<?php

namespace App\Models;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Http\Permissions\PermissionMiddleware;
use App\Models\QueryBuilders\UserBuilder;
use App\Models\Traits\HasResourceValidator;
use App\Models\Traits\HasValidator;
use App\Rules\DataTypeRule;
use App\Rules\Valid;
use App\Utils\Date\SerializeDate;
use App\Models\Traits\BaseModel;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * @property string $name
 * @property ?string $email
 * @property ?CarbonImmutable $email_verified_at
 * @property ?string $password
 * @property ?string $remember_token
 * @property ?string $last_login_facility_id
 * @property ?string $managed_by_facility_id
 * @property ?string $global_admin_grant_id
 * @property ?CarbonImmutable $otp_required_at
 * @property ?string $otp_secret
 * @property ?int $otp_used_ts
 * @property ?CarbonImmutable $password_expire_at
 * @property-read bool $has_password
 * @property-read bool $has_email_verified
 * @property-read bool $has_global_admin
 * @property-read Collection<array-key, Member> $members
 * @property-read Facility $lastLoginFacility
 * @method static UserBuilder query()
 */
class User extends Authenticatable
{
    use BaseModel;
    use Notifiable;
    use HasResourceValidator;
    use SerializeDate;
    use HasValidator;

    protected $table = 'users';

    public const string SYSTEM = 'e144ff18-471f-456f-a1c2-971d88b3d213';

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
        'managed_by_facility_id',
        'global_admin_grant_id',
        'password_expire_at',
        'otp_required_at',
        'otp_secret',
        'otp_used_ts',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'created_by',
        'otp_secret',
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
        'otp_required_at' => 'immutable_datetime',
    ];

    protected $appends = [
        'has_password',
        'has_email_verified',
        'has_global_admin',
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'name' => Valid::trimmed(),
        };
    }

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

    public static function validationRules(
        bool $isResource,
        bool $isInsert,
        bool $isPatch,
        ?Model $original = null
    ): array {
        return [
            'name' => Valid::trimmed(['required'], sometimes: $isPatch),
            'email' =>
                [
                    // Email is required when hasGlobalAdmin is true. It must be checked before nullable, this is why I
                    // put this before the Valid::trimmed.
                    [
                        $isInsert || $isResource,
                        'required_if_accepted:has_global_admin',
                        'required_if_accepted:has_password',
                        // Required when has_email_verified is anything but null
                        'required_if_accepted:has_email_verified',
                        // If there's a password, there must also be an email.
                        'required_with:password',
                    ],
                    ...array_filter(Valid::trimmed([
                        // It is a valid email address
                        'email',
                        // Uniqueness is only checked for insert and patch
                        [$isInsert || $isPatch, self::getRuleUnique($original)],
                    ], nullable: true), fn(mixed $rule) => $rule !== 'present'),
                ],
            'has_email_verified' =>
                [
                    [$isInsert || $isPatch, 'required_with:email'],
                    'boolean',
                    DataTypeRule::bool(),
                ],
            'password' =>
                [
                    [
                        $isPatch,
                        $original && blank($original->password) ? 'required_if_accepted:has_password' : null,
                    ],
                    [
                        $isInsert,
                        'required_with:password_expire_at',
                        'required_with:otp_required_at',
                    ],
                    [
                        $isInsert || $isResource,
                        'required_if_accepted:has_password',
                        'required_if_accepted:has_global_admin',
                        'required_unless:otp_required_at,null',
                        'required_if_accepted:has_otp_configured',
                    ],
                    ...array_filter(Valid::string([
                        [
                            $isInsert || $isPatch,
                            // This is only applied to insert and patch because later on the password field gets replaced
                            // with the hashed password.
                            self::getPasswordRules(),
                            // When we update the password, we must also specify expiration time, but it can be null, it
                            // just has to be said explicitly (in the request).
                            // new RequirePresentRule('password_expire_at')
                        ],
                    ], nullable: true), fn(mixed $rule) => $rule !== 'present'),
                ],
            'password_expire_at' => [
                // TODO: Figure out how to implement an "implicit" custom validation rule
                // Password expiration is a valid datetime and if the date defined, the password must not be null.
                ...Valid::datetime(sometimes: $isPatch, nullable: true),
            ],
            'has_password' => [
                // It must be true if the user is a global admin.
                [
                    $isResource,
                    Valid::bool([
                        'accepted_if:has_global_admin,true',
                        $original && !blank($original->otp_required_at) ? 'accepted' : null,
                        'accepted_if:has_otp_configured,true',
                    ]),
                ],
            ],
            // A valid boolean
            'has_global_admin' => Valid::bool(sometimes: $isInsert || $isPatch, nullable: true),
            'managed_by_facility_id' => Valid::uuid(
                [Rule::exists('facilities', 'id')],
                sometimes: $isInsert || $isPatch,
                nullable: true,
            ),
            'otp_required_at' => [
                // TODO: Figure out how to implement an "implicit" custom validation rule (same as password_expire_at)
                ...Valid::datetime(sometimes: $isPatch, nullable: true),
            ],
            'has_otp_configured' => [
                [$isInsert, 'missing'],
                [
                    $isPatch,
                    Valid::bool(
                        [$original && blank($original->otp_secret) ? 'declined' : null],
                        sometimes: true,
                    )
                ],
            ],
        ];
    }

    public function members(): HasMany
    {
        return $this->hasMany(Member::class);
    }

    /** @throws ApiException */
    public function belongsToFacilityOrFail(
        Facility|null $facility = null,
        ?bool $isClient = null,
        ?bool $isStaff = null,
        ?bool $isFacilityAdmin = null,
        ?true $isManagedByFacility = null,
    ): Member {
        $facility ??= PermissionMiddleware::facility();
        if ($isManagedByFacility && ($facility->id !== $this->managed_by_facility_id)) {
            ExceptionFactory::userNotManagedByFacility()->throw();
        }
        $builder = Member::query()->select(['members.*'])->join('users', 'users.id', 'members.user_id')
            ->where('members.facility_id', $facility->id)->where('users.id', $this->id);
        if ($isClient !== null) {
            ($isClient ? $builder->whereNotNull(...) : $builder->whereNull(...))('members.client_id');
        }
        if ($isStaff !== null) {
            ($isStaff ? $builder->whereNotNull(...) : $builder->whereNull(...))('members.staff_member_id');
        }
        if ($isFacilityAdmin !== null) {
            ($isFacilityAdmin ? $builder->whereNotNull(...) : $builder->whereNull(...))(
                'members.facility_admin_grant_id'
            );
        }
        /** @var ?Member $member */
        $member = $builder->first();
        return $member ?? ExceptionFactory::notFound()->throw();
    }

    public function isUsedInTables(array $omit = []): bool
    {
        // todo: maybe do not use Schema in this way
        $omit = array_fill_keys($omit, true);
        $id = $this->id;
        foreach (Schema::getTableListing() as $table) {
            $query = DB::table($table);
            $ready = false;
            foreach (Schema::getColumns($table) as ['name' => $name, 'type' => $type]) {
                if (
                    $name !== 'id' && $type === 'char(36)'
                    && !array_key_exists("$table.$name", $omit)
                ) {
                    $query->orWhere($name, $id);
                    $ready = true;
                }
            }
            if ($ready && $query->exists()) {
                return true;
            }
        }
        return false;
    }

    public function memberByFacility(string|Facility $facility): ?Member
    {
        $facilityId = ($facility instanceof Facility) ? $facility->id : $facility;
        return $this->members->first(fn(Member $member) => $member->facility_id === $facilityId);
    }

    public function activeMembers(): Collection
    {
        return $this->members->filter(fn(Member $member): bool => //
            $member->facility_admin_grant_id || $member->client_id || $member->staffMember?->isActive());
    }

    public function passwordHashHash(): string
    {
        return hash('sha256', $this->id . $this->password); // low complexity hash of password hash
    }

    public static function fromAuthenticatable(?AuthenticatableContract $authenticatable): ?self
    {
        if ($authenticatable && !($authenticatable instanceof self)) {
            return self::query()->findOrFail($authenticatable->getAuthIdentifier());
        }
        return $authenticatable;
    }
}
