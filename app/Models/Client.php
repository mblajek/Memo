<?php

namespace App\Models;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Attributes\HasValues;
use App\Models\QueryBuilders\ClientBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\ClientShortCodeRule;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string $short_code
 * @property-read Member $member
 * @method static ClientBuilder query()
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

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }

    public function fillShortCode(): void
    {
        if ($this->short_code !== null) {
            return;
        }
        $builder = Client::query()
            ->selectRaw(
                "lpad(cast(`clients`.`short_code` as int)+1, length(`clients`.`short_code`), '0') as `new_short_code`"
            )
            ->join('members', 'members.client_id', 'clients.id')
            ->where('members.facility_id', PermissionMiddleware::facility()->id)
            ->whereRaw("clients.short_code REGEXP '^[0-9]+$'")
            ->orderByRaw('cast(clients.short_code as int) desc');
        if ($this->id) {
            $builder->where('clients.id', '!=', $this->id);
        }
        $this->short_code = $builder->first(['new_short_code'])?->new_short_code ?? '1';
    }
}
