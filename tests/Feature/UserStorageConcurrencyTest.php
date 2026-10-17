<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\User\StorageService;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * A put to the user storage interleaved with a concurrent put of another key, simulated on a second
 * connection. The user must be committed to be visible to it, so this test cannot use
 * DatabaseTransactions and removes the user itself.
 */
class UserStorageConcurrencyTest extends TestCase
{
    use UserTrait;

    private const string OTHER_CONNECTION = 'user_storage_concurrency';
    private const int LOCK_WAIT_TIMEOUT = 1205;

    private ?User $user = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        Config::set(
            'database.connections.' . self::OTHER_CONNECTION,
            Config::get('database.connections.' . DB::getDefaultConnection()),
        );
        $this->user = User::factory()->create();
    }

    protected function tearDown(): void
    {
        if ($this->user) {
            User::query()->whereKey($this->user->id)->delete();
        }
        DB::purge(self::OTHER_CONNECTION);
        parent::tearDown();
    }

    public function testPutAndGet(): void
    {
        $service = new StorageService();
        $service->put($this->user, 'a', '{"x":1}');
        self::assertSame(['a', 'b'], $service->put($this->user, 'b', '[2]')->getData(true));
        self::assertSame(['b'], $service->put($this->user, 'a', 'null')->getData(true));
        self::assertSame(['b'], $service->get($this->user, '')->getData(true));
        self::assertSame([2], $service->get($this->user, 'b')->getData(true));
        self::assertNull($service->get($this->user, 'a')->getData(true));
    }

    public function testConcurrentPutOfAnotherKeyIsNotLost(): void
    {
        $service = new StorageService();
        $service->put($this->user, 'existing', '1');

        $otherPut = $this->putOnOtherConnectionAfterNextQuery('other', '2');
        $service->put($this->user, 'mine', '3');

        self::assertNotNull($otherPut->committed, 'the concurrent put should have run');
        $expectedKeys = $otherPut->committed ? ['existing', 'other', 'mine'] : ['existing', 'mine'];
        self::assertEqualsCanonicalizing($expectedKeys, $service->get($this->user, '')->getData(true));
        self::assertFalse($otherPut->committed, 'the concurrent put should wait for the lock');
    }

    /** Puts the key on the other connection right after the next query on this one. */
    private function putOnOtherConnectionAfterNextQuery(string $key, string $contents): object
    {
        $mainConnection = DB::getDefaultConnection();
        $otherPut = (object)['armed' => true, 'committed' => null];
        DB::listen(function (QueryExecuted $query) use ($otherPut, $mainConnection, $key, $contents) {
            if (!$otherPut->armed || $query->connectionName !== $mainConnection) {
                return;
            }
            $otherPut->armed = false;
            $otherPut->committed = $this->putOnOtherConnection($key, $contents);
        });
        return $otherPut;
    }

    /** @return bool whether the put was committed, false if the user's row was locked */
    private function putOnOtherConnection(string $key, string $contents): bool
    {
        $defaultConnection = DB::getDefaultConnection();
        DB::setDefaultConnection(self::OTHER_CONNECTION);
        try {
            DB::statement('SET SESSION innodb_lock_wait_timeout = 1');
            // probed first, because a failed put reports any error as a validation error
            DB::transaction(fn() => DB::table('users')->lockForUpdate()->find($this->user->id));
            (new StorageService())->put($this->user, $key, $contents);
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
