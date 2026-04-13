<?php

namespace App\Models;

use App\Exceptions\FatalExceptionFactory;
use App\Models\Traits\BaseModel;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use App\Services\IntegrationEvents\IntegrationEventStatus;
use App\Services\IntegrationEvents\IntegrationEventType;
use DateTimeImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @property string $facility_id
 * @property IntegrationEventType $type
 * @property string $object_id
 * @property IntegrationEventStatus $status
 * @method static Builder<self> query()
 */
class IntegrationEventOut extends Model
{
    use BaseModel;

    protected $connection = 'integration_events';
    protected $table = 'events_out';

    protected $fillable = [
        'type',
        'object_id',
        'status',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'type' => IntegrationEventType::class,
        'status' => IntegrationEventStatus::class,
    ];
}
