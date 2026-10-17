<?php

namespace Tests\Feature;

use App\Models\Dictionary;
use App\Models\Position;
use App\Models\Value;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * A save of attribute values interleaved with a concurrent save of the same row, simulated on
 * a second connection. The rows must be committed to be visible to it, so this test cannot use
 * DatabaseTransactions and removes its rows itself.
 */
class AttrSaveConcurrencyTest extends TestCase
{
    use UserTrait;

    private const string OTHER_CONNECTION = 'attr_save_concurrency';
    private const string ATTRIBUTE = 'duration_minutes';
    private const int LOCK_WAIT_TIMEOUT = 1205;

    private ?Dictionary $dictionary = null;
    private ?Position $position = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        Config::set(
            'database.connections.' . self::OTHER_CONNECTION,
            Config::get('database.connections.' . DB::getDefaultConnection()),
        );
    }

    protected function tearDown(): void
    {
        if ($this->position) {
            Value::query()->where('object_id', $this->position->id)->delete();
            Position::query()->whereKey($this->position->id)->delete();
        }
        if ($this->dictionary) {
            Dictionary::query()->whereKey($this->dictionary->id)->delete();
        }
        DB::purge(self::OTHER_CONNECTION);
        parent::tearDown();
    }

    public function testConcurrentSaveCannotLeaveTwoValuesOfSingleValueAttribute(): void
    {
        $positionId = $this->createPosition();
        $position = Position::query()->findOrFail($positionId);

        $otherSave = $this->saveOnOtherConnectionAfterNextQuery($positionId, 30);
        DB::transaction(fn() => $position->attrSave(null, [self::ATTRIBUTE => 20]));

        $this->assertSavedValue($positionId, 20);
        self::assertFalse($otherSave->committed, 'the concurrent save should wait for the lock');
    }

    public function testSaveSeesValuesCommittedAfterItsTransactionStarted(): void
    {
        $positionId = $this->createPosition();
        $position = Position::query()->findOrFail($positionId);

        $otherSave = $this->saveOnOtherConnectionAfterNextQuery($positionId, 30);
        DB::transaction(function () use ($position) {
            // takes the transaction's snapshot before the concurrent save commits
            Value::query()->where('object_id', $position->id)->count();
            $position->attrSave(null, [self::ATTRIBUTE => 20]);
            self::assertSame(20, $position->attrValues()[self::ATTRIBUTE]);
        });

        $this->assertSavedValue($positionId, 20);
        self::assertTrue($otherSave->committed);
    }

    private function createPosition(): string
    {
        $this->dictionary = new Dictionary();
        $this->dictionary->fillOnly([
            'facility_id' => null,
            'name' => '+AttrSaveConcurrencyTest',
            'is_fixed' => false,
            'is_extendable' => true,
        ]);
        $this->dictionary->save();
        $this->position = new Position();
        $this->position->fillOnly([
            'dictionary_id' => $this->dictionary->id,
            'facility_id' => null,
            'name' => '+AttrSaveConcurrencyTest',
            'is_fixed' => false,
            'is_disabled' => false,
            'default_order' => 1,
        ]);
        $this->position->attrSave(null, [self::ATTRIBUTE => 10]);
        // loaded upfront, so that the next query is the one of the code under test
        Position::attrMapGlobal();
        return $this->position->id;
    }

    private function assertSavedValue(string $positionId, int $value): void
    {
        self::assertSame([$value], Value::query()->where('object_id', $positionId)->pluck('int_value')->all());
        self::assertSame($value, Position::query()->findOrFail($positionId)->attrValues()[self::ATTRIBUTE]);
    }

    /** Saves the value on the other connection right after the next query on this one. */
    private function saveOnOtherConnectionAfterNextQuery(string $positionId, int $value): object
    {
        $mainConnection = DB::getDefaultConnection();
        $otherSave = (object)['armed' => true, 'committed' => null];
        DB::listen(function (QueryExecuted $query) use ($otherSave, $mainConnection, $positionId, $value) {
            if (!$otherSave->armed || $query->connectionName !== $mainConnection) {
                return;
            }
            $otherSave->armed = false;
            $otherSave->committed = self::saveOnOtherConnection($positionId, $value);
        });
        return $otherSave;
    }

    /** @return bool whether the save was committed, false if it timed out waiting for a lock */
    private static function saveOnOtherConnection(string $positionId, int $value): bool
    {
        $defaultConnection = DB::getDefaultConnection();
        DB::setDefaultConnection(self::OTHER_CONNECTION);
        try {
            $connection = DB::connection();
            $connection->statement('SET SESSION innodb_lock_wait_timeout = 1');
            $connection->transaction(
                fn() => Position::query()->findOrFail($positionId)->attrSave(null, [self::ATTRIBUTE => $value]),
            );
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
