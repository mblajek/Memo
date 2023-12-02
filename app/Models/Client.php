<?php

namespace App\Models;

use App\Models\QueryBuilders\ClientBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasUuid;
use App\Models\Traits\HasValues;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
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

    protected $table = 'clients';

    protected $fillable = [
        'gender_dict_id',
    ];

    protected $casts = self::BASE_CASTS;

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }
}
