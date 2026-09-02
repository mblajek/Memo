<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper;
use Illuminate\Support\Facades\DB;

/**
 * Maintains the contiguous `default_order` sequence of orderable rows sharing one
 * scope-column value. Rows at or above the system order offset are kept out of the
 * managed sequence entirely and are never counted or shifted.
 *
 * The scope column name is caller-controlled (never user input) and is interpolated into
 * the SQL directly; the scope value is always bound.
 */
class DefaultOrderManager
{
    /**
     * Returns the order to assign to a new row, shifting later rows down to make room when
     * a specific order is requested. A null request appends after the last non-system row.
     */
    public static function insert(string $table, string $scopeColumn, string $scopeValue, ?int $requested): int
    {
        $last = self::lastOrder($table, $scopeColumn, $scopeValue) ?? 0;
        $order = min($requested ?? ($last + 1), $last + 1);
        if ($order <= $last) {
            DB::statement(
                "update `$table` set `default_order` = `default_order` + 1"
                . " where `$scopeColumn` = ? and `default_order` between ? and ?"
                . " order by `default_order` desc",
                [$scopeValue, $order, $last],
            );
        }
        return $order;
    }

    /** Moves an existing row to the target order within its scope, shifting the rows in between. */
    public static function reorder(
        string $table,
        string $scopeColumn,
        string $scopeValue,
        string $id,
        int $current,
        int $target,
    ): void {
        $last = self::lastOrder($table, $scopeColumn, $scopeValue) ?? $current;
        $target = max(1, min($target, $last));
        if ($target === $current) {
            return;
        }
        // Park the moving row outside the [1, last] range to free its slot during the shift.
        DB::table($table)->where('id', $id)->update(['default_order' => 0]);
        if ($target < $current) {
            DB::statement(
                "update `$table` set `default_order` = `default_order` + 1"
                . " where `$scopeColumn` = ? and `default_order` between ? and ?"
                . " order by `default_order` desc",
                [$scopeValue, $target, $current - 1],
            );
        } else {
            DB::statement(
                "update `$table` set `default_order` = `default_order` - 1"
                . " where `$scopeColumn` = ? and `default_order` between ? and ?"
                . " order by `default_order` asc",
                [$scopeValue, $current + 1, $target],
            );
        }
        DB::table($table)->where('id', $id)->update(['default_order' => $target]);
    }

    /**
     * Reads a row's current order under lock, for use before deleting it — a stale order
     * from a concurrently shifted row would make remove() compact the wrong range.
     * Callers must hold a transaction.
     *
     * @throws ApiException when the row no longer exists (deleted concurrently)
     */
    public static function lockedOrder(string $table, string $id): int
    {
        $order = DB::table($table)->where('id', $id)->lockForUpdate()->value('default_order');
        if ($order === null) {
            throw ExceptionFactory::notFound();
        }
        return (int) $order;
    }

    /** Closes the gap left by a removed row, shifting later rows in the scope down by one. */
    public static function remove(string $table, string $scopeColumn, string $scopeValue, int $removedOrder): void
    {
        DB::statement(
            "update `$table` set `default_order` = `default_order` - 1"
            . " where `$scopeColumn` = ? and `default_order` > ? and `default_order` < ?"
            . " order by `default_order` asc",
            [$scopeValue, $removedOrder, DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET],
        );
    }

    /**
     * Callers must hold a transaction: the lock serializes the read-then-shift sequence, so two
     * concurrent mutations of one scope cannot both read the same max and produce duplicate orders.
     * Concurrent first-inserts into an empty scope may deadlock instead; that is intentional — the
     * loser fails loudly rather than corrupt the sequence.
     */
    private static function lastOrder(string $table, string $scopeColumn, string $scopeValue): ?int
    {
        $max = DB::table($table)
            ->where($scopeColumn, $scopeValue)
            ->where('default_order', '<', DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET)
            ->lockForUpdate()
            ->max('default_order');
        return $max === null ? null : (int) $max;
    }
}
