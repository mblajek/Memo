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
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Throwable;

/**
 * @property string id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 *
 * @property string created_by
 * @property User createdBy
 * @property string updated_by
 * @property User updatedBy
 *
 * @mixin Model
 */
trait BaseModel
{
    use HasFactory;
    use HasUuid;

    private const array BASE_CASTS = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'updated_by');
    }

    private static Model $instance;

    public static function getInstanceField(string $field): string|array
    {
        self::$instance ??= (new self());
        return match ($field) {
            'table' => self::$instance->table,
            'fillable' => self::$instance->fillable,
            default => FatalExceptionFactory::unexpected()->throw(),
        };
    }

    public function saveOrApiFail(array $options = [])
    {
        try {
            return $this->saveOrFail($options);
        } catch (Throwable) {
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

    public static function boot(): void
    {
        /** @noinspection PhpMultipleClassDeclarationsInspection */
        parent::boot();
        static::creating(function (Model $model) {
            /** @var $model self */
            if (!$model->created_by) {
                $model->created_by = self::getAuthOrFail()->id;
            }
            if (!$model->updated_by) {
                $model->updated_by = self::getAuthOrFail()->id;
            }
        });
        static::updating(function (Model $model) {
            /** @var $model self */
            $model->updated_by = self::getAuthOrFail()->id;
        });
        if (method_exists(static::class, 'deletedBy')) {
            static::softDeleted(/** @throws ApiException */ function (Model $model) {
                /** @var $model HasDeletedBy */
                $model->deleted_by = self::getAuthOrFail()->id;
                $model->save();
            });
        }
    }
}
