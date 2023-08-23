<?php

namespace App\Models;

use App\Models\QueryBuilders\ClientBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property-read Member $member
 * @method static ClientBuilder query()
 */
class Client extends Model
{
    use HasFactory;
    use UuidTrait;

    protected $table = 'clients';

    protected $fillable = [
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }
}
