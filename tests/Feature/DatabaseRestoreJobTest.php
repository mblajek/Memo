<?php

namespace Tests\Feature;

use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpReadException;
use App\Services\Database\DatabaseDumpsService;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Tests\Helpers\DbDumpsTrait;
use Tests\TestCase;
use Throwable;

class DatabaseRestoreJobTest extends TestCase
{
    use DatabaseTransactions;
    use DbDumpsTrait;

    private const string DUMP_NAME = 'memo_2026-01-01_10-00-00';
    private const string SQL = "CREATE TABLE t (a INT);\nINSERT INTO t VALUES (1);\n";

    private string $dumpId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDbDumps();
        Config::set('app.db.rc_password', 'rc-secret');
        $this->dumpId = $this->insertDbDump(self::DUMP_NAME);
    }

    protected function tearDown(): void
    {
        $this->tearDownDbDumps();
        parent::tearDown();
    }

    private function createZip(string $sql): void
    {
        $this->createDumpZip(self::DUMP_NAME, $sql);
    }

    /** @return array{DbDump, ?Throwable} the dump as stored, and what the job threw */
    private function runRestore(): array
    {
        $job = (new DatabaseDumpsService())->restore(DbDump::query()->findOrFail($this->dumpId), isToRc: true);
        $thrown = null;
        try {
            $job->handle();
        } catch (Throwable $e) {
            $thrown = $e;
        }
        return [DbDump::query()->findOrFail($this->dumpId), $thrown];
    }

    public function testStreamsDumpIntoRestoreProgram(): void
    {
        $this->createZip(self::SQL);
        $inputPath = $this->fakeOutputPath('input');
        $argsPath = $this->fakeOutputPath('args');
        $envPath = $this->fakeOutputPath('env');
        $this->fakeProgram('mariadb', "echo \"\$@\" > '$argsPath'; env > '$envPath'; cat > '$inputPath'");

        [$dbDump, $thrown] = $this->runRestore();

        $this->assertNull($thrown);
        $this->assertSame(DatabaseDumpStatus::created, $dbDump->status);
        $this->assertNotNull($dbDump->restored_rc_at);
        $this->assertNull($dbDump->restored_prod_at);
        $this->assertSame(self::SQL, file_get_contents($inputPath));
        $dbName = DatabaseDumpHelper::getDatabaseName(isRc: true);
        $dbUser = DatabaseDumpHelper::getDatabaseUsername(isRc: true);
        $this->assertSame("$dbName --user=$dbUser\n", file_get_contents($argsPath));
        $this->assertStringContainsString("MYSQL_PWD=rc-secret\n", file_get_contents($envPath));
    }

    public function testFailsWhenRestoreProgramFails(): void
    {
        Log::spy();
        $this->createZip(self::SQL);
        $this->fakeProgram('mariadb', "cat > /dev/null; echo 'ERROR 1064: syntax error' >&2; exit 1");

        [$dbDump, $thrown] = $this->runRestore();

        $this->assertNotNull($thrown);
        $this->assertSame(DatabaseDumpStatus::restore_error, $dbDump->status);
        $this->assertNull($dbDump->restored_rc_at);
        $this->expectErrorLogged('exit status 1, standard error: ERROR 1064: syntax error');
    }

    public function testFailsWhenRestoreProgramStopsReadingEarly(): void
    {
        Log::spy();
        // Larger than a pipe buffer, so that writing it cannot finish before the program exits.
        $this->createZip(str_repeat(self::SQL, 100_000));
        $this->fakeProgram('mariadb', 'exit 0');

        [$dbDump, $thrown] = $this->runRestore();

        $this->assertNotNull($thrown);
        $this->assertSame(DatabaseDumpStatus::restore_error, $dbDump->status);
        $this->expectErrorLogged('exit status 0');
    }

    public function testFailsOnEmptyDump(): void
    {
        Log::spy();
        $this->createZip('');
        $this->fakeProgram('mariadb', 'cat > /dev/null');

        [$dbDump, $thrown] = $this->runRestore();

        $this->assertNotNull($thrown);
        $this->assertSame(DatabaseDumpStatus::restore_error, $dbDump->status);
        $this->expectErrorLogged('the input was empty');
    }

    public function testRestoresNothingFromDamagedDump(): void
    {
        $sql = '';
        for ($i = 0; $i < 20_000; $i++) {
            $sql .= "INSERT INTO t VALUES ($i, '" . md5("$i") . "');\n";
        }
        $this->createZip($sql);
        // A byte in the middle of the encrypted data, past the salt and before the authentication
        // code, which the decryption does not notice. The stream reports it as a CRC error at its end.
        $bytes = file_get_contents(DbDump::fullPath(self::DUMP_NAME));
        $header = unpack('Vsignature/x14/VcompressedSize/x4/vnameLength/vextraLength', $bytes);
        $position = 30 + $header['nameLength'] + $header['extraLength'] + 18
            + intdiv($header['compressedSize'] - 28, 2);
        $bytes[$position] = chr(ord($bytes[$position]) ^ 0xFF);
        file_put_contents(DbDump::fullPath(self::DUMP_NAME), $bytes);
        $inputPath = $this->fakeOutputPath('input');
        $this->fakeProgram('mariadb', "cat > '$inputPath'");

        [$dbDump, $thrown] = $this->runRestore();

        $this->assertInstanceOf(DatabaseDumpReadException::class, $thrown);
        $this->assertMatchesRegularExpression('/is damaged|CRC error/', $thrown->getMessage());
        $this->assertSame(DatabaseDumpStatus::restore_error, $dbDump->status);
        $this->assertFileDoesNotExist($inputPath);
    }

    public function testFailsWhenArchiveIsMissing(): void
    {
        $this->fakeProgram('mariadb', 'cat > /dev/null');

        [$dbDump, $thrown] = $this->runRestore();

        $this->assertInstanceOf(DatabaseDumpReadException::class, $thrown);
        $this->assertStringContainsString('No such file', $thrown->getMessage());
        $this->assertSame(DatabaseDumpStatus::restore_error, $dbDump->status);
    }
}
