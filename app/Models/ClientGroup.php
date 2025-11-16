<?php

namespace App\Models;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Resources\ClientGroup\GroupClientResource;
use App\Models\Enums\AttendanceType;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\MemberExistsRule;
use App\Rules\UniqueWithMemoryRule;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\Rule;

/**
 * @property string $facility_id
 * @property string $notes
 * @property-read Collection<array-key, GroupClientResource> $groupClients
 * @method static Builder<self> query()
 */
class ClientGroup extends Model
{
    use HasValidator;
    use BaseModel;

    protected $table = 'client_groups';

    protected $fillable = [
        'facility_id',
        'notes',
    ];

    protected $casts = self::BASE_CASTS;

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'facility_id' => Valid::uuid([Rule::exists('facilities', 'id')]),
            'notes' => Valid::text(sometimes: true, nullable: true),
            'clients' => Valid::list(sometimes: true),
            'clients.*' => Valid::array(keys: ['user_id', 'role']),
            'clients.*.role' => Valid::trimmed(sometimes: true, nullable: true),
            'clients.*.user_id' => Valid::uuid([
                new UniqueWithMemoryRule('client'),
                new MemberExistsRule(AttendanceType::Client),
            ]),
        };
    }

    public function groupClients(): HasMany
    {
        return $this->hasMany(GroupClient::class);
    }

    /** @throws ApiException */
    public function belongsToFacilityOrFail(
        Facility|null $facility = null,
    ): void {
        $facility ??= PermissionMiddleware::facility();
        if ($this->facility_id !== $facility->id) {
            ExceptionFactory::notFound()->throw();
        }
    }
}
