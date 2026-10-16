<?php

namespace Tests\Feature;

use App\Http\Middleware\SendIntegrationEvents;
use App\Models\Attribute;
use App\Models\Enums\AttributeTable;
use App\Models\Facility;
use App\Models\IntegrationEventOut;
use App\Models\Member;
use App\Models\StaffMember;
use App\Models\User;
use App\Models\Value;
use App\Services\IntegrationEvents\IntegrationEventType;
use Closure;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class SendIntegrationEventsTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private string $dir;
    private string $file;
    private Facility $facility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->dir = sys_get_temp_dir() . '/integration_events_test_' . bin2hex(random_bytes(4));
        $this->file = "$this->dir/integration_events.db";
        Config::set('database.connections.integration_events.database', $this->file);
        DB::purge('integration_events');
        $this->artisan('fz:create-integration-events-db')->assertExitCode(0);
        // The middleware state is static, so earlier tests may have left it on with events queued.
        $this->switchEventsOff();
        IntegrationEventOut::query()->delete();
        $this->facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($this->facility);
    }

    protected function tearDown(): void
    {
        $this->switchEventsOff();
        DB::purge('integration_events');
        if (file_exists($this->file)) {
            unlink($this->file);
        }
        if (is_dir($this->dir)) {
            rmdir($this->dir);
        }
        parent::tearDown();
    }

    private function switchEventsOn(): void
    {
        Config::set('database.connections.integration_events.database', $this->file);
    }

    /** Flushes the queued events into the test database, then disables the middleware. */
    private function switchEventsOff(): void
    {
        $this->switchEventsOn();
        $this->handleRequest(fn() => null);
        Config::set('database.connections.integration_events.database', null);
        $this->handleRequest(fn() => null);
    }

    private function handleRequest(Closure $action): void
    {
        (new SendIntegrationEvents())->handle(Request::create('/'), function () use ($action): Response {
            $action();
            return new Response();
        });
    }

    public function testStaffMemberValueEmitsUserEvent(): void
    {
        $user = User::factory()->create();
        $staffMember = new StaffMember();
        $staffMember->saveOrFail();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'staff_member_id' => $staffMember->id,
        ]);
        $attribute = Attribute::factory()->create(['table' => AttributeTable::StaffMember->value]);

        $this->switchEventsOn();
        $this->handleRequest(function () use ($attribute, $staffMember): void {
            (new Value([
                'attribute_id' => $attribute->id,
                'object_id' => $staffMember->id,
                'string_value' => 'value',
                'default_order' => 1,
            ]))->saveOrFail();
        });

        self::assertSame(
            [[
                'facility_id' => $this->facility->id,
                'type' => IntegrationEventType::user,
                'object_id' => $user->id,
            ]],
            IntegrationEventOut::query()->get()
                ->map(fn(IntegrationEventOut $event) => [
                    'facility_id' => $event->facility_id,
                    'type' => $event->type,
                    'object_id' => $event->object_id,
                ])->all(),
        );
    }
}
