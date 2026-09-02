<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Runs a delete inside a transaction, converting a foreign-key "row is referenced" failure
 * into a validation `in_use` error instead of a server error.
 */
final class GuardedDelete
{
    private const int MYSQL_FK_ROW_IS_REFERENCED = 1451;

    /** @throws ApiException|Throwable */
    public static function transaction(callable $callback): void
    {
        try {
            DB::transaction($callback);
        } catch (QueryException $queryException) {
            if (($queryException->errorInfo[1] ?? null) === self::MYSQL_FK_ROW_IS_REFERENCED) {
                throw ExceptionFactory::fieldValidation('id', 'in_use');
            }
            throw $queryException;
        }
    }
}
