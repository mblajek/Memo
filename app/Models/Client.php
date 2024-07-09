<?php

namespace App\Models;

use App\Exceptions\FatalExceptionFactory;
use App\Models\Attributes\HasValues;
use App\Models\QueryBuilders\ClientBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
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

    // todo: assigning codes
    protected $attributes = ['short_code' => '-'];

    protected static function fieldValidator(string $field): string|array
    {
        // now client has no fields
        FatalExceptionFactory::unexpected()->throw();
    }

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }
}
