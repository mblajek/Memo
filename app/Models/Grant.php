<?php

namespace App\Models;

use App\Models\QueryBuilders\GrantBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Throwable;

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
    use HasFactory;
    use UuidTrait;

    protected $table = 'grants';

    protected $fillable = [
        'created_by',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    /**
     * @throws Throwable
     */
    public static function createForUser(?string $userId = null): self
    {
        $grant = new self();
        $grant->created_by = $userId ?? Auth::user()->id;
        $grant->saveOrFail();

        return $grant;
    }
}
