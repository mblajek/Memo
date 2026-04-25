<?php

namespace App\Models;

use App\Models\Traits\HasUuid;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property string $listener_code
 * @property ?int $last_processed_event_seq
 * @method static Builder<self> query()
 */
class Listener extends Model
{
    use HasUuid;

    protected $connection = 'integration_events';
    protected $table = 'listeners';

    protected $fillable = [
        'listener_code',
        'last_processed_event_seq',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'last_processed_event_seq' => 'integer',
    ];
}
