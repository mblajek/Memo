<?php

namespace Tests\Feature;

use App\Exceptions\ApiException;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpsService;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Mockery;
use Symfony\Component\ErrorHandler\Error\FatalError;
use Tests\Helpers\DbDumpsTrait;
use Tests\TestCase;
use Throwable;
use ZipArchive;

class DatabaseDumpJobTest extends TestCase
{
    use DatabaseTransactions;
    use DbDumpsTrait;

    private const string SQL = "CREATE TABLE t (a INT);\nINSERT INTO t VALUES (1);\n";

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDbDumps();
    }

    protected function tearDown(): void
    {
        $this->tearDownDbDumps();
        parent::tearDown();
    }

    private function fakeDump(string $sql = self::SQL): void
    {
        $this->fakeProgram('mariadb-dump', "printf '%s' '$sql'");
    }

    /** @return array{DbDump, ?Throwable} the dump as stored, and what the job threw */
    private function runDump(bool $isFromRc = false): array
    {
        $job = (new DatabaseDumpsService())->create(isFromRc: $isFromRc);
        $thrown = null;
        try {
            $job->handle();
        } catch (Throwable $e) {
            $thrown = $e;
        }
        return [DbDump::query()->findOrFail($job->dbDump->id), $thrown];
    }

    private function readSql(DbDump $dbDump): string
    {
        $sql = null;
        DatabaseDumpHelper::readDumpSql($dbDump, function (mixed $stream) use (&$sql): void {
            $sql = stream_get_contents($stream);
        });
        return $sql;
    }

    private function currentDumpPath(): string
    {
        return DatabaseDumpHelper::getCurrentDumpPath(isRc: false);
    }

    public function testCreatesEncryptedArchiveOfTheDump(): void
    {
        $this->fakeDump();

        [$dbDump, $thrown] = $this->runDump();

        $this->assertNull($thrown);
        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        $this->assertFalse((bool)$dbDump->is_backuped);
        $zipPath = DbDump::fullPath($dbDump->name);
        $this->assertSame(filesize($zipPath), $dbDump->file_size);
        $this->assertSame(0400, fileperms($zipPath) & 0777);
        $this->assertSame(self::SQL, $this->readSql($dbDump));

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::RDONLY);
        $this->assertSame(ZipArchive::EM_AES_256, $zip->statIndex(0)['encryption_method']);
        $zip->close();

        // The plaintext does not stay on the disk, but the file does, as it is the lock.
        $this->assertSame('', file_get_contents($this->currentDumpPath()));
        $this->assertSame(0600, fileperms($this->currentDumpPath()) & 0777);
    }

    public function testPassesPasswordInEnvironmentOnly(): void
    {
        putenv('MEMO_TEST_SECRET=app-secret');
        try {
            $argsPath = $this->fakeOutputPath('args');
            $envPath = $this->fakeOutputPath('env');
            $this->fakeProgram('mariadb-dump', "echo \"\$@\" > '$argsPath'; env > '$envPath'; echo 'SELECT 1;'");

            [$dbDump] = $this->runDump();
        } finally {
            putenv('MEMO_TEST_SECRET');
        }

        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        $dbName = DatabaseDumpHelper::getDatabaseName(isRc: false);
        $dbUser = DatabaseDumpHelper::getDatabaseUsername();
        $this->assertSame("$dbName --user=$dbUser\n", file_get_contents($argsPath));
        $env = file_get_contents($envPath);
        $this->assertStringContainsString('MYSQL_PWD=' . DatabaseDumpHelper::getDatabasePassword() . "\n", $env);
        $this->assertStringNotContainsString('MEMO_TEST_SECRET', $env);
    }

    public function testDumpsRcDatabaseWithRcCredentials(): void
    {
        Config::set('app.db.rc_password', 'rc-secret');
        $argsPath = $this->fakeOutputPath('args');
        $envPath = $this->fakeOutputPath('env');
        $this->fakeProgram('mariadb-dump', "echo \"\$@\" > '$argsPath'; env > '$envPath'; echo 'SELECT 1;'");

        [$dbDump] = $this->runDump(isFromRc: true);

        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        $this->assertTrue((bool)$dbDump->is_from_rc);
        $dbName = DatabaseDumpHelper::getDatabaseName(isRc: true);
        $dbUser = DatabaseDumpHelper::getDatabaseUsername(isRc: true);
        $this->assertSame("$dbName --user=$dbUser\n", file_get_contents($argsPath));
        $this->assertStringContainsString("MYSQL_PWD=rc-secret\n", file_get_contents($envPath));
    }

    public function testFailsWhenDumpProgramFails(): void
    {
        Log::spy();
        $this->fakeProgram('mariadb-dump', "echo 'partial'; echo 'Access denied' >&2; exit 2");

        [$dbDump, $thrown] = $this->runDump();

        $this->assertNotNull($thrown);
        $this->assertSame(DatabaseDumpStatus::create_error, $dbDump->status);
        $this->assertNull($dbDump->name);
        $this->expectErrorLogged('exit status 2, standard error: Access denied');
        $this->assertSame('', file_get_contents($this->currentDumpPath()));
    }

    public function testFailsOnEmptyDump(): void
    {
        Log::spy();
        $this->fakeProgram('mariadb-dump', 'exit 0');

        [$dbDump, $thrown] = $this->runDump();

        $this->assertNotNull($thrown);
        $this->assertSame(DatabaseDumpStatus::create_error, $dbDump->status);
        $this->assertNull($dbDump->name);
        $this->expectErrorLogged('The dump of the database is empty');
    }

    public function testDropsWhatInterruptedDumpLeftBehind(): void
    {
        $this->fakeDump();
        file_put_contents($this->currentDumpPath(), 'leftover of an interrupted dump that is longer than the new one');
        chmod($this->currentDumpPath(), 0644);

        [$dbDump] = $this->runDump();

        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        $this->assertSame(self::SQL, $this->readSql($dbDump));
        $this->assertSame(0600, fileperms($this->currentDumpPath()) & 0777);
    }

    public function testRefusesToStartWhileAnotherDumpIsRunning(): void
    {
        touch($this->currentDumpPath());
        $lock = fopen($this->currentDumpPath(), 'r');
        $this->assertTrue(flock($lock, LOCK_EX | LOCK_NB));
        try {
            (new DatabaseDumpsService())->create(isFromRc: false);
            $this->fail('No exception thrown');
        } catch (ApiException $e) {
            $this->assertSame('exception.db.db_dump_already_running', $e->errorCode);
        } finally {
            fclose($lock);
        }
        $this->assertSame(0, DbDump::query()->count());
    }

    public function testConcurrentCheckIsNotTakenForRunningDump(): void
    {
        touch($this->currentDumpPath());
        $check = fopen($this->currentDumpPath(), 'r');
        $this->assertTrue(flock($check, LOCK_SH | LOCK_NB));
        try {
            $this->assertFalse(DatabaseDumpHelper::isDumpRunning(isRc: false));
        } finally {
            fclose($check);
        }
    }

    public function testFailsWhenAnotherDumpStartsInTheMeantime(): void
    {
        Log::spy();
        $this->fakeDump();
        $job = (new DatabaseDumpsService())->create(isFromRc: false);
        touch($this->currentDumpPath());
        $lock = fopen($this->currentDumpPath(), 'r');
        $this->assertTrue(flock($lock, LOCK_EX | LOCK_NB));
        file_put_contents($this->currentDumpPath(), 'being written by the other dump');
        try {
            $job->handle();
            $this->fail('No exception thrown');
        } catch (ApiException $e) {
            $this->assertSame('exception.db.db_dump_already_running', $e->errorCode);
        } finally {
            fclose($lock);
        }
        $this->assertSame(DatabaseDumpStatus::create_error, DbDump::query()->findOrFail($job->dbDump->id)->status);
        Log::shouldHaveReceived('warning')->with(Mockery::on(fn(string $m) => str_contains($m, 'holds the lock')));
        // The file of the other dump is left alone.
        $this->assertSame('being written by the other dump', file_get_contents($this->currentDumpPath()));
    }

    public function testWaitsForLockTakenForAMoment(): void
    {
        $this->fakeDump();
        $job = (new DatabaseDumpsService())->create(isFromRc: false);
        touch($this->currentDumpPath());
        $holder = proc_open(
            [PHP_BINARY, '-r', '$f = fopen($argv[1], "r"); flock($f, LOCK_EX); echo "locked\n"; usleep(300_000);',
                $this->currentDumpPath()],
            [1 => ['pipe', 'w']],
            $pipes,
        );
        try {
            $this->assertSame("locked\n", fgets($pipes[1]));

            $job->handle();
        } finally {
            proc_close($holder);
        }

        $this->assertSame(DatabaseDumpStatus::created, DbDump::query()->findOrFail($job->dbDump->id)->status);
    }

    private function reportFatalError(): void
    {
        $this->app->make(ExceptionHandler::class)->report(new FatalError('Allowed memory size exhausted', 0, [
            'type' => E_ERROR,
            'message' => 'Allowed memory size exhausted',
            'file' => __FILE__,
            'line' => __LINE__,
        ]));
    }

    public function testFatalErrorDuringTheJobDropsPlaintextAndMarksDump(): void
    {
        $this->fakeDump();
        file_put_contents($this->currentDumpPath(), 'leftover of an interrupted dump');
        $job = (new DatabaseDumpsService())->create(isFromRc: false);
        $atFatalError = null;
        Log::spy();
        // The leftover is reported while the job holds the lock, and before it empties the file.
        Log::shouldReceive('warning')->once()->andReturnUsing(function () use ($job, &$atFatalError): void {
            $this->reportFatalError();
            clearstatcache();
            $atFatalError = [
                'size' => filesize($this->currentDumpPath()),
                'status' => DbDump::query()->findOrFail($job->dbDump->id)->status,
            ];
        });

        $job->handle();

        $this->assertSame(['size' => 0, 'status' => DatabaseDumpStatus::create_error], $atFatalError);
    }

    public function testFatalErrorAfterTheJobLeavesItsDumpAlone(): void
    {
        $this->fakeDump();
        [$dbDump] = $this->runDump();
        file_put_contents($this->currentDumpPath(), 'being written by another dump');

        $this->reportFatalError();

        $this->assertSame(DatabaseDumpStatus::created, DbDump::query()->findOrFail($dbDump->id)->status);
        $this->assertSame('being written by another dump', file_get_contents($this->currentDumpPath()));
    }

    public function testSendsArchiveToBackupEndpoint(): void
    {
        Config::set('app.db.backup_auth', 'backup-auth');
        Config::set('app.db.backup_url', 'https://backup.test/upload');
        $sent = null;
        Http::fake(function (Request $request) use (&$sent) {
            // The body is read here, as the archive is closed once the request is done.
            $sent = ['auth' => $request->header('x-memo-auth'), 'body' => $request->body()];
            return Http::response('backup OK');
        });
        $this->fakeDump();

        [$dbDump] = $this->runDump();

        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        $this->assertTrue((bool)$dbDump->is_backuped);
        $this->assertSame(['backup-auth'], $sent['auth']);
        $this->assertStringContainsString(file_get_contents(DbDump::fullPath($dbDump->name)), $sent['body']);
    }

    public function testKeepsDumpWhenBackupEndpointRejectsIt(): void
    {
        Config::set('app.db.backup_auth', 'backup-auth');
        Config::set('app.db.backup_url', 'https://backup.test/upload');
        Http::fake(['*' => Http::response('Unauthorized', 401)]);
        $this->fakeDump();

        [$dbDump, $thrown] = $this->runDump();

        $this->assertNull($thrown);
        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        $this->assertFalse((bool)$dbDump->is_backuped);
    }

    public function testKeepsDumpWhenBackupEndpointIsUnreachable(): void
    {
        Log::spy();
        Config::set('app.db.backup_auth', 'backup-auth');
        Config::set('app.db.backup_url', 'https://backup.test/upload');
        Http::fake(['*' => Http::failedConnection('Connection refused')]);
        $this->fakeDump();

        [$dbDump, $thrown] = $this->runDump();

        $this->assertNull($thrown);
        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        $this->assertFalse((bool)$dbDump->is_backuped);
        $this->expectErrorLogged('Cannot reach the backup endpoint: Connection refused');
    }

    public function testDoesNotSendRcDumpToBackupEndpoint(): void
    {
        Config::set('app.db.backup_auth', 'backup-auth');
        Config::set('app.db.backup_url', 'https://backup.test/upload');
        Http::fake();
        $this->fakeDump();

        [$dbDump] = $this->runDump(isFromRc: true);

        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        Http::assertNothingSent();
    }
}
