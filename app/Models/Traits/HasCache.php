<?php

namespace App\Models\Traits;

use App\Exceptions\FatalExceptionFactory;
use App\Models\UuidEnum\UuidEnum;

trait HasCache
{
    use BaseModel;

    private static ?array $all = null;
    private static ?bool $hasOrderBy = null;

    /** @return array<non-falsy-string,self> */
    public static function getCacheAll(): array
    {
        if (self::$all === null) {
            self::$hasOrderBy ??= in_array('default_order', self::getInstanceField('fillable'), true);

            self::$all = (self::$hasOrderBy ? self::query()->orderBy('default_order')
                : self::query())->get()->keyBy('id')->all();
        }
        return self::$all;
    }

    public static function getCacheById(UuidEnum|string $id): self
    {
        return self::getCacheAll()[($id instanceof UuidEnum) ? $id->value : $id]
            ?? FatalExceptionFactory::unexpected()->throw();
    }

    public static function getCacheByIdNullable(null|UuidEnum|string $id): ?self
    {
        return ($id === null) ? null : self::getCacheById($id);
    }

    public static function clearCacheAll(): void
    {
        self::$all = null;
    }
}
