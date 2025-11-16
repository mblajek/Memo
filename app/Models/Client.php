<?php

namespace App\Models;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Attributes\HasValues;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\ClientShortCodeRule;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property non-falsy-string $user_id
 * @property non-falsy-string $facility_id
 * @property non-empty-string $short_code
 * @property-read User $user
 * @property-read Facility $facility
 * @property-read Member $member
 * @property-read Collection<array-key, GroupClient> $groupClients
 * @method static Builder<self> query()
 */
class Client extends Model
{
    use BaseModel;
    use HasValues;
    use HasValidator;

    public const string EMPTY_SHORT_CODE = '-';

    protected $table = 'clients';

    protected $fillable = [
        'short_code',
    ];

    protected $casts = self::BASE_CASTS;

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'short_code' => Valid::trimmed([
                'lowercase',
                'regex:/^(-|[0-9]+)$/',
                new ClientShortCodeRule(),
            ], sometimes: true, nullable: true, max: 7),
        };
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }

    public function groupClients(): HasMany
    {
        return $this->hasMany(GroupClient::class, 'client_id')->from(
            GroupClient::query()
                ->join('members', 'members.user_id', 'group_clients.user_id')
                ->select(['group_clients.*', 'members.client_id']),
            'group_clients',
        );
    }

    public function fillShortCode(): void
    {
        if ($this->short_code !== null) {
            return;
        }
        $builder = Client::query()
            // ->lockForUpdate() // causes deadlocks on inserts
            ->join('members', 'members.client_id', 'clients.id')
            ->where('members.facility_id', PermissionMiddleware::facility()->id)
            ->whereRaw("clients.short_code REGEXP '^[0-9]+$'")
            ->orderByRaw('cast(clients.short_code as int) desc');
        if ($this->id) {
            $builder->where('clients.id', '!=', $this->id);
        }
        $lastShortCode = $builder->first(['short_code'])?->short_code ?? '0';
        $this->short_code = str_pad($lastShortCode + 1, strlen($lastShortCode), '0', STR_PAD_LEFT);
    }
}
