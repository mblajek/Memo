<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

class AutoMigrateTest extends TestCase
{
    private const string INTERVAL_CACHE_KEY = 'db_auto_migrate_interval';
    private const int HOLD_MICROSECONDS = 2_000_000;

    /** @var resource|null */
    private $holder = null;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('app.db.auto_migrate', true);
        Cache::forget(self::INTERVAL_CACHE_KEY);
    }

    protected function tearDown(): void
    {
        if ($this->holder) {
            proc_terminate($this->holder);
            proc_close($this->holder);
        }
        parent::tearDown();
    }

    private function lockName(): string
    {
        return DB::getDatabaseName() . '.' . AppServiceProvider::AUTO_MIGRATE_LOCK;
    }

    private function autoMigrate(): void
    {
        $this->app->getProvider(AppServiceProvider::class)->autoMigrate();
    }

    /** A separate process holds the lock, as a concurrent auto-migration would. */
    private function holdLockInOtherProcess(): void
    {
        $config = Config::get('database.connections.' . DB::getDefaultConnection());
        $script = <<<'PHP'
            $pdo = new PDO(getenv('LOCK_DSN'), getenv('LOCK_USER'), getenv('LOCK_PASSWORD'));
            if ($pdo->query('select get_lock(' . $pdo->quote(getenv('LOCK_NAME')) . ', 10)')->fetchColumn() != 1) {
                exit(1);
            }
            echo "locked\n";
            usleep((int)getenv('LOCK_HOLD_MICROSECONDS'));
            PHP;
        $this->holder = proc_open(
            [PHP_BINARY, '-r', $script],
            [1 => ['pipe', 'w']],
            $pipes,
            env_vars: [
                'LOCK_DSN' => "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']}",
                'LOCK_USER' => $config['username'],
                'LOCK_PASSWORD' => (string)$config['password'],
                'LOCK_NAME' => $this->lockName(),
                'LOCK_HOLD_MICROSECONDS' => (string)self::HOLD_MICROSECONDS,
            ],
        );
        $this->assertSame("locked\n", fgets($pipes[1]));
    }

    public function testMigrationWaitsForConcurrentRun(): void
    {
        $this->holdLockInOtherProcess();
        $start = hrtime(true);
        Artisan::shouldReceive('call')->once()->with('migrate', ['--step' => true, '--force' => true])
            ->andReturnUsing(function () use ($start) {
                $this->assertGreaterThan(self::HOLD_MICROSECONDS * 3 / 4, (hrtime(true) - $start) / 1000);
                $this->assertSame(
                    1,
                    DB::scalar('select is_used_lock(?) = connection_id()', [$this->lockName()]),
                );
                return 0;
            });
        $this->autoMigrate();
        $this->assertSame(1, DB::scalar('select is_free_lock(?)', [$this->lockName()]));
        $this->assertTrue(Cache::has(self::INTERVAL_CACHE_KEY));
    }

    public function testFailedMigrationReleasesLock(): void
    {
        Artisan::shouldReceive('call')->once()->andThrow(new RuntimeException('migration failed'));
        try {
            $this->autoMigrate();
            $this->fail('Expected the migration failure to propagate');
        } catch (RuntimeException $e) {
            $this->assertSame('migration failed', $e->getMessage());
        }
        $this->assertSame(1, DB::scalar('select is_free_lock(?)', [$this->lockName()]));
        $this->assertFalse(Cache::has(self::INTERVAL_CACHE_KEY));
    }
}
