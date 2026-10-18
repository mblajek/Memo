<?php

namespace Tests\Feature;

use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use LogicException;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Output\BufferedOutput;
use Symfony\Component\Console\Output\ConsoleOutputInterface;
use Symfony\Component\Console\Output\ConsoleSectionOutput;
use Symfony\Component\Console\Output\OutputInterface;
use Tests\Helpers\DbDumpsTrait;
use Tests\TestCase;

class DatabaseEchoCommandTest extends TestCase
{
    use DatabaseTransactions;
    use DbDumpsTrait;

    private const string DUMP_NAME = 'memo_2026-01-01_10-00-00';
    private const string INNER_FILE = self::DUMP_NAME . '.sql';
    private const string SQL = 'SELECT 1;';

    private string $zipPath;
    private string $dumpId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDbDumps();
        $this->dumpId = $this->insertDbDump(self::DUMP_NAME);
        $this->zipPath = DbDump::fullPath(self::DUMP_NAME);
        mkdir(dirname($this->zipPath));
    }

    protected function tearDown(): void
    {
        $this->tearDownDbDumps();
        parent::tearDown();
    }

    private function createZip(string $innerFile, string $password, string $sql = self::SQL): void
    {
        $this->createDumpZip(self::DUMP_NAME, $sql, $innerFile, $password);
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
        $this->createZip(self::INNER_FILE, DatabaseDumpHelper::getDatabaseDumpPassword());

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
        $this->createZip('other.sql', DatabaseDumpHelper::getDatabaseDumpPassword());

        $this->assertFailsWithError(
            "Cannot read file '" . self::INNER_FILE . "' inside '{$this->zipPath}': No such file",
        );
    }

    public function testReportsEmptyDump(): void
    {
        $this->createZip(self::INNER_FILE, DatabaseDumpHelper::getDatabaseDumpPassword(), sql: '');

        $this->assertFailsWithError("The dump inside '{$this->zipPath}' is empty");
    }
}
