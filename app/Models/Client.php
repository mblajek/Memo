<?php

namespace App\Models;

use App\Models\Attributes\HasValues;
use App\Models\QueryBuilders\ClientBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string gender_dict_id
 * @property-read Member $member
 * @method static ClientBuilder query()
 */
class Client extends Model
{
    use BaseModel;
    use HasValues;
    use HasValidator;

    protected $table = 'clients';

    protected $casts = self::BASE_CASTS;

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'notes' => Valid::text(sometimes: true, nullable: true),
        };
    }

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }
}
