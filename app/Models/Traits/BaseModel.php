<?php

namespace App\Models\Traits;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Http\Permissions\PermissionMiddleware;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @mixin Model
 */
trait BaseModel
{
    use HasFactory;
    use HasUuid;

    private const BASE_CASTS = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public function saveOrApiFail(array $options = [])
    {
        try {
           return $this->saveOrFail($options);
        } catch (\Throwable) {
            FatalExceptionFactory::unexpected()->throw();
        }
    }

    /** @throws ApiException */
    private static function getAuthOrFail()
    {
        $user = PermissionMiddleware::permissions()->user;
        if (!($user instanceof User)) {
            ExceptionFactory::unauthorised()->throw();
        }
        return $user;
    }

    public static function boot()
    {
        /** @noinspection PhpMultipleClassDeclarationsInspection */
        parent::boot();
        $hasCreatedBy = method_exists(static::class, 'createdBy');
        $hasUpdatedBy = method_exists(static::class, 'updatedBy');
        if ($hasCreatedBy || $hasUpdatedBy) {
            static::creating(function (Model $model) use ($hasCreatedBy, $hasUpdatedBy) {
                /** @var $model HasCreatedBy */
                if ($hasCreatedBy && !$model->created_by) {
                    $model->created_by = self::getAuthOrFail()->id;
                }
                /** @var $model HasUpdatedBy */
                if ($hasUpdatedBy && !$model->updated_by) {
                    $model->updated_by = self::getAuthOrFail()->id;
                }
            });
        }
        if ($hasUpdatedBy) {
            static::updating(function (Model $model) {
                /** @var $model HasUpdatedBy */
                if (!$model->updated_by) {
                    $model->updated_by = self::getAuthOrFail()->id;
                }
            });
        }
    }
}
