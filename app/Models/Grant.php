<?php

namespace App\Models;

use App\Models\QueryBuilders\GrantBuilder;
use App\Models\QueryBuilders\TimetableBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;

/**
 * @property string id
 * @property string created_by
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property-read Collection|Facility[] $facilities
 * @method static GrantBuilder query()
 */
class Grant extends Model
{
    use HasFactory, Notifiable, UuidTrait;

    protected $table = 'grants';

    protected $fillable = [
        'created_by',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];
}
