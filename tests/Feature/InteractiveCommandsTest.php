<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
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
}
