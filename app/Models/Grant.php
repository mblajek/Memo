<?php

namespace App\Models;

use App\Exceptions\FatalExceptionFactory;
use App\Models\QueryBuilders\GrantBuilder;
use App\Models\Traits\BaseModel;
use Illuminate\Database\Eloquent\Model;
use Throwable;

/**
 * @method static GrantBuilder query()
 */
class Grant extends Model
{
    use BaseModel;

    protected $table = 'grants';

    protected $casts = self::BASE_CASTS;

    public static function create(): self
    {
        try {
            $grant = new self();
            $grant->saveOrFail();
            return $grant;
        } catch (Throwable) {
            FatalExceptionFactory::unexpected()->throw();
        }
    }
}
