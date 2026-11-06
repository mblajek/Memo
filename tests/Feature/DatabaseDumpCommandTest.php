<?php

namespace Tests\Feature;

use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Helpers\DbDumpsTrait;
use Tests\TestCase;

class DatabaseDumpCommandTest extends TestCase
{
    use DatabaseTransactions;
    use DbDumpsTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDbDumps();
        $this->fakeProgram('mariadb-dump', "printf '%s' 'CREATE TABLE t (a INT);'");
    }

    protected function tearDown(): void
    {
        $this->tearDownDbDumps();
        parent::tearDown();
    }

    private function insertRunningDbDump(DatabaseDumpStatus $status, bool $isFromRc): string
    {
        $id = $this->insertDbDump('memo_2026-01-01_10-00-00');
        DB::connection('db_dumps')->table('db_dumps')->where('id', $id)
            ->update(['status' => $status->name, 'is_from_rc' => $isFromRc]);
        return $id;
    }

    private function statusOf(string $id): DatabaseDumpStatus
    {
        return DbDump::query()->findOrFail($id)->status;
    }

    public function testMarksRowsLeftByKilledJobsAsFailed(): void
    {
        $creatingProd = $this->insertRunningDbDump(DatabaseDumpStatus::creating, isFromRc: false);
        $creatingRc = $this->insertRunningDbDump(DatabaseDumpStatus::creating, isFromRc: true);
        $restoring = $this->insertRunningDbDump(DatabaseDumpStatus::restoring, isFromRc: false);

        $this->artisan('fz:db-dump', ['mode' => 'prod'])->assertSuccessful();

        $this->assertSame(DatabaseDumpStatus::create_error, $this->statusOf($creatingProd));
        $this->assertSame(DatabaseDumpStatus::create_error, $this->statusOf($creatingRc));
        $this->assertSame(DatabaseDumpStatus::restore_error, $this->statusOf($restoring));
    }

    public function testLeavesRowsOfRunningJobsAlone(): void
    {
        $creatingProd = $this->insertRunningDbDump(DatabaseDumpStatus::creating, isFromRc: false);
        $creatingRc = $this->insertRunningDbDump(DatabaseDumpStatus::creating, isFromRc: true);
        $restoring = $this->insertRunningDbDump(DatabaseDumpStatus::restoring, isFromRc: false);
        $path = DatabaseDumpHelper::getCurrentDumpPath(isRc: true);
        touch($path);
        $lock = fopen($path, 'r');
        $this->assertTrue(flock($lock, LOCK_EX | LOCK_NB));
        try {
            $this->artisan('fz:db-dump', ['mode' => 'prod'])->assertSuccessful();
        } finally {
            fclose($lock);
        }

        $this->assertSame(DatabaseDumpStatus::create_error, $this->statusOf($creatingProd));
        // A job is running on rc, which can be the dump of this row, or the restore of any row.
        $this->assertSame(DatabaseDumpStatus::creating, $this->statusOf($creatingRc));
        $this->assertSame(DatabaseDumpStatus::restoring, $this->statusOf($restoring));
    }
}
