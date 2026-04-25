<?php

namespace App\Models;

use App\Models\Traits\BaseModel;
use App\Services\IntegrationEvents\IntegrationEventType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property int $seq
 * @property string $facility_id
 * @property IntegrationEventType $type
 * @property string $object_id
 * @method static Builder<self> query()
 */
class IntegrationEventOut extends Model
{
    use BaseModel;

    protected $connection = 'integration_events';
    protected $table = 'events_out';
    protected $primaryKey = 'seq';
    protected $keyType = 'int';
    public $incrementing = true;

    protected $fillable = [
        'type',
        'object_id',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'type' => IntegrationEventType::class,
    ];

    public function uniqueIds(): array
    {
        return ['id'];
    }
}
