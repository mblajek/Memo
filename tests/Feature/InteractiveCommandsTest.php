<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class InteractiveCommandsTest extends TestCase
{
    use DatabaseTransactions;

    public static function nonInteractiveProvider(): array
    {
        return [
            'fz:user -n' => ['fz:user', '--no-interaction'],
            'fz:user -q' => ['fz:user', '--quiet'],
            'fz:db-restore -n' => ['fz:db-restore', '--no-interaction'],
            'fz:db-restore -q' => ['fz:db-restore', '--quiet'],
        ];
    }

    #[DataProvider('nonInteractiveProvider')]
    public function testFailsWhenNotInteractive(string $command, string $option): void
    {
        $usersBefore = User::query()->count();

        $this->artisan($command, [$option => true])
            ->expectsOutputToContain('interactive')
            ->assertFailed();

        $this->assertSame($usersBefore, User::query()->count());
    }

    public function testCreatesUserInteractively(): void
    {
        $this->artisan('fz:user')
            ->expectsQuestion('Name (with surname)', 'Interactive Test User')
            ->expectsQuestion('E-mail (optional)', null)
            ->expectsOutputToContain('Created user')
            ->assertSuccessful();

        $this->assertTrue(User::query()->where('name', 'Interactive Test User')->exists());
    }

    public function testDbRestoreFailsWhenRetryWithNewDumpDeclined(): void
    {
        Bus::fake();
        $dbDumpsFile = tempnam(sys_get_temp_dir(), 'db_dumps_test_');
        Config::set('database.connections.db_dumps.database', $dbDumpsFile);
        DB::purge('db_dumps');
        try {
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
            // Too old to count as a fresh PROD dump, so restoring to PROD is refused.
            DB::connection('db_dumps')->table('db_dumps')->insert([
                'id' => Str::uuid()->toString(),
                'created_at' => '2026-01-01 10:00:00',
                'updated_at' => '2026-01-01 10:00:00',
                'created_by' => User::SYSTEM,
                'updated_by' => User::SYSTEM,
                'status' => 'created',
                'name' => 'old-prod-dump',
                'file_size' => 100,
                'app_version' => 'test',
                'is_from_rc' => false,
                'is_backuped' => false,
            ]);

            $this->artisan('fz:db-restore')
                ->expectsChoice('Use dump from', 'a', ['a', 'b', 'prod', 'rc'])
                ->expectsChoice('Select dump', 'a', ['a', 'z', 'old-prod-dump', '(show older dumps)'])
                ->expectsChoice('Restore to:', 'a', ['a', 'b', 'prod', 'rc'])
                ->expectsConfirmation('Are you sure to overwrite PROD?', 'yes')
                ->expectsConfirmation('Are you sure?', 'yes')
                ->expectsOutputToContain('no fresh database dump')
                ->expectsConfirmation('Create dump and retry?', 'no')
                ->assertFailed();

            Bus::assertNothingDispatched();
            $this->assertSame('created', DB::connection('db_dumps')->table('db_dumps')->value('status'));
        } finally {
            DB::purge('db_dumps');
            unlink($dbDumpsFile);
        }
    }
}
