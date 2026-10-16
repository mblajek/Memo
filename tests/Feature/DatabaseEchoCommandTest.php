<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use LogicException;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Output\BufferedOutput;
use Symfony\Component\Console\Output\ConsoleOutputInterface;
use Symfony\Component\Console\Output\ConsoleSectionOutput;
use Symfony\Component\Console\Output\OutputInterface;
use Tests\TestCase;
use ZipArchive;

class DatabaseEchoCommandTest extends TestCase
{
    use DatabaseTransactions;

    private const string DUMP_NAME = 'memo_2026-01-01_10-00-00';
    private const string INNER_FILE = self::DUMP_NAME . '.sql';
    private const string PASSWORD = 'test-dump-password';
    private const string SQL = 'SELECT 1;';

    private string $dbDumpsFile;
    private string $dumpsDir;
    private string $zipPath;
    private string $dumpId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dbDumpsFile = tempnam(sys_get_temp_dir(), 'db_dumps_test_');
        Config::set('database.connections.db_dumps.database', $this->dbDumpsFile);
        DB::purge('db_dumps');
        Schema::connection('db_dumps')->create('db_dumps', function (Blueprint $table) {
            $table->char('id', 36);
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->char('created_by', 36);
            $table->char('updated_by', 36);
            $table->string('status', 36);
            $table->string('name')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('app_version');
            $table->dateTime('restored_rc_at')->nullable();
            $table->dateTime('restored_prod_at')->nullable();
            $table->boolean('is_from_rc');
            $table->boolean('is_backuped');
        });
        $this->dumpId = Str::uuid()->toString();
        DB::connection('db_dumps')->table('db_dumps')->insert([
            'id' => $this->dumpId,
            'created_at' => '2026-01-01 10:00:00',
            'updated_at' => '2026-01-01 10:00:00',
            'created_by' => User::SYSTEM,
            'updated_by' => User::SYSTEM,
            'status' => 'created',
            'name' => self::DUMP_NAME,
            'file_size' => 100,
            'app_version' => 'test',
            'is_from_rc' => false,
            'is_backuped' => false,
        ]);

        $this->dumpsDir = sys_get_temp_dir() . '/db_dumps_dir_test_' . Str::random(8);
        mkdir("{$this->dumpsDir}/2026-01", recursive: true);
        $this->zipPath = "{$this->dumpsDir}/2026-01/" . self::DUMP_NAME . '.zip';
        Config::set('app.db.dump_path', $this->dumpsDir);
        Config::set('app.db.dump_password', self::PASSWORD);
    }

    protected function tearDown(): void
    {
        DB::purge('db_dumps');
        unlink($this->dbDumpsFile);
        if (file_exists($this->zipPath)) {
            unlink($this->zipPath);
        }
        rmdir("{$this->dumpsDir}/2026-01");
        rmdir($this->dumpsDir);
        parent::tearDown();
    }

    private function createZip(string $innerFile, string $password): void
    {
        $zip = new ZipArchive();
        $zip->open($this->zipPath, ZipArchive::CREATE);
        $zip->addFromString($innerFile, self::SQL);
        $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
        $zip->setPassword($password);
        $zip->close();
    }

    /** @return array{int, string, string} exit code, stdout, stderr */
    private function runEcho(): array
    {
        $stderr = new BufferedOutput();
        $stdout = new class ($stderr) extends BufferedOutput implements ConsoleOutputInterface {
            public function __construct(private OutputInterface $stderr)
            {
                parent::__construct();
            }

            public function getErrorOutput(): OutputInterface
            {
                return $this->stderr;
            }

            public function setErrorOutput(OutputInterface $error): void
            {
                $this->stderr = $error;
            }

            public function section(): ConsoleSectionOutput
            {
                throw new LogicException('Not supported');
            }
        };
        $exitCode = Artisan::call('fz:db-echo', ['id' => $this->dumpId], $stdout);
        return [$exitCode, $stdout->fetch(), $stderr->fetch()];
    }

    private function assertFailsWithError(string $expectedError): void
    {
        [$exitCode, $stdout, $stderr] = $this->runEcho();
        $this->assertSame(Command::FAILURE, $exitCode);
        $this->assertSame('', $stdout);
        $this->assertStringContainsString($expectedError, $stderr);
    }

    public function testEchoesDumpContents(): void
    {
        $this->createZip(self::INNER_FILE, self::PASSWORD);

        [$exitCode, $stdout, $stderr] = $this->runEcho();
        $this->assertSame(Command::SUCCESS, $exitCode);
        $this->assertSame(self::SQL, $stdout);
        $this->assertSame('', $stderr);
    }

    public function testReportsMissingArchive(): void
    {
        $this->assertFailsWithError("Cannot open '{$this->zipPath}': No such file");
    }

    public function testReportsFileThatIsNotZip(): void
    {
        file_put_contents($this->zipPath, 'not a zip archive');

        $this->assertFailsWithError("Cannot open '{$this->zipPath}': Not a zip archive");
    }

    public function testReportsWrongPassword(): void
    {
        $this->createZip(self::INNER_FILE, 'other-password');

        $this->assertFailsWithError(
            "Cannot read file '" . self::INNER_FILE . "' inside '{$this->zipPath}': Wrong password provided",
        );
    }

    public function testReportsMissingFileInsideArchive(): void
    {
        $this->createZip('other.sql', self::PASSWORD);

        $this->assertFailsWithError(
            "Cannot read file '" . self::INNER_FILE . "' inside '{$this->zipPath}': No such file",
        );
    }
}
