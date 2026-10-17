<?php

namespace Tests\Feature;

use App\Exceptions\ApiValidationException;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Value;
use App\Services\Attribute\DeleteAttributeService;
use App\Services\Dictionary\PositionRequiredAttributes;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * A delete of an attribute interleaved with a concurrent save of a value referencing it (through
 * values.ref_object_id, which has no foreign key), simulated on a second connection. The rows
 * must be committed to be visible to it, so this test cannot use DatabaseTransactions and
 * removes its rows itself.
 */
class AttributeDeleteConcurrencyTest extends TestCase
{
    use UserTrait;

    private const string OTHER_CONNECTION = 'attribute_delete_concurrency';
    private const int LOCK_WAIT_TIMEOUT = 1205;
    private const int RECORD_CHANGED_SINCE_LAST_READ = 1020;

    private Attribute $attribute;
    private Dictionary $dictionary;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        Config::set(
            'database.connections.' . self::OTHER_CONNECTION,
            Config::get('database.connections.' . DB::getDefaultConnection()),
        );
        $this->attribute = Attribute::factory()->create(['table' => 'positions']);
        $this->dictionary = Dictionary::factory()->create();
        // loaded upfront, so that the next query is the one of the code under test
        Attribute::clearCacheAll();
        Dictionary::attrMapGlobal();
    }

    protected function tearDown(): void
    {
        Value::query()->where('object_id', $this->dictionary->id)->delete();
        Dictionary::query()->whereKey($this->dictionary->id)->delete();
        Attribute::query()->whereKey($this->attribute->id)->delete();
        Attribute::clearCacheAll();
        DB::purge(self::OTHER_CONNECTION);
        parent::tearDown();
    }

    /**
     * MariaDB's innodb_snapshot_isolation (the default since 11.6) changes how a locking read
     * treats rows committed after the transaction's snapshot, so both settings are tested.
     */
    public static function snapshotIsolationProvider(): array
    {
        return ['without snapshot isolation' => [false], 'with snapshot isolation' => [true]];
    }

    public function testDeleteWaitsForUncommittedReference(): void
    {
        $otherConnection = DB::connection(self::OTHER_CONNECTION);
        $otherConnection->beginTransaction();
        try {
            $this->onOtherConnection(fn() => $this->saveReference());
            DB::statement('SET SESSION innodb_lock_wait_timeout = 1');
            try {
                $this->deleteAttribute();
                self::fail('the delete should wait for the lock');
            } catch (QueryException $exception) {
                self::assertSame(self::LOCK_WAIT_TIMEOUT, $exception->errorInfo[1] ?? null);
            }
        } finally {
            $otherConnection->commit();
        }

        self::assertNotNull(Attribute::query()->find($this->attribute->id));
        self::assertSame(1, $this->referenceCount());
    }

    #[DataProvider('snapshotIsolationProvider')]
    public function testReferenceToAttributeDeletedConcurrentlyIsRejected(bool $snapshotIsolation): void
    {
        $this->setSnapshotIsolation($snapshotIsolation);
        $otherDelete = $this->onOtherConnectionAfterNextQuery(null, fn() => $this->deleteAttribute());

        try {
            DB::transaction(fn() => $this->saveReference());
            self::fail('the save should fail');
        } catch (ApiValidationException $exception) {
            self::assertFalse($snapshotIsolation);
            self::assertContains(
                [
                    'field' => Str::camel(PositionRequiredAttributes::API_NAME),
                    'code' => 'validation.exists',
                ],
                $exception->renderContent()['errors'],
            );
        } catch (QueryException $exception) {
            // with snapshot isolation, the locking read of the attribute deleted after the
            // transaction's snapshot fails with an error that DB::transaction() can retry
            self::assertTrue($snapshotIsolation, $exception->getMessage());
            self::assertSame(self::RECORD_CHANGED_SINCE_LAST_READ, $exception->errorInfo[1] ?? null);
        }

        self::assertTrue($otherDelete->committed);
        self::assertNull(Attribute::query()->find($this->attribute->id));
        self::assertSame(0, $this->referenceCount());
    }

    #[DataProvider('snapshotIsolationProvider')]
    public function testReferenceSavedRightAfterReferenceCheckWaitsForDelete(bool $snapshotIsolation): void
    {
        $this->setSnapshotIsolation($snapshotIsolation);
        $otherSave = $this->onOtherConnectionAfterNextQuery(
            'ref_object_id',
            fn() => DB::transaction(fn() => $this->saveReference()),
        );

        $this->deleteAttribute();

        self::assertFalse($otherSave->committed, 'the concurrent save should wait for the lock');
        self::assertNull(Attribute::query()->find($this->attribute->id));
        self::assertSame(0, $this->referenceCount());
    }

    private function setSnapshotIsolation(bool $snapshotIsolation): void
    {
        DB::statement('SET SESSION innodb_snapshot_isolation = ' . ($snapshotIsolation ? 'ON' : 'OFF'));
    }

    private function deleteAttribute(): void
    {
        (new DeleteAttributeService())->handle(Attribute::query()->findOrFail($this->attribute->id));
    }

    private function saveReference(): void
    {
        Dictionary::query()->findOrFail($this->dictionary->id)
            ->attrSave(null, [PositionRequiredAttributes::API_NAME => [$this->attribute->id]]);
    }

    private function referenceCount(): int
    {
        return Value::query()->where('ref_object_id', $this->attribute->id)->count();
    }

    /**
     * Runs the callback on the other connection right after the next query on this one whose SQL
     * contains the given text (or right after the next query at all).
     */
    private function onOtherConnectionAfterNextQuery(?string $sqlPart, callable $callback): object
    {
        $mainConnection = DB::getDefaultConnection();
        $other = (object)['armed' => true, 'committed' => null];
        DB::listen(function (QueryExecuted $query) use ($other, $mainConnection, $sqlPart, $callback) {
            if (
                !$other->armed
                || $query->connectionName !== $mainConnection
                || ($sqlPart !== null && !str_contains($query->sql, $sqlPart))
            ) {
                return;
            }
            $other->armed = false;
            $other->committed = $this->onOtherConnection($callback);
        });
        return $other;
    }

    /** @return bool whether the callback completed, false if it timed out waiting for a lock */
    private function onOtherConnection(callable $callback): bool
    {
        $defaultConnection = DB::getDefaultConnection();
        DB::setDefaultConnection(self::OTHER_CONNECTION);
        try {
            DB::statement('SET SESSION innodb_lock_wait_timeout = 1');
            $callback();
            return true;
        } catch (QueryException $exception) {
            if (($exception->errorInfo[1] ?? null) !== self::LOCK_WAIT_TIMEOUT) {
                throw $exception;
            }
            return false;
        } finally {
            DB::setDefaultConnection($defaultConnection);
        }
    }
}
