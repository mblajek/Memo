<?php

namespace Tests\Feature\Tquery;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/** AI-generated (Opus 4.6) */
abstract class TqueryTestCase extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function prepareFacilityAdmin(Facility $facility): void
    {
        $creator = new PermissionObjectCreator();
        $creator->user = User::query()->findOrFail(User::SYSTEM);
        $creator->facility = $facility;
        $creator->loggedIn = true;
        $creator->verified = true;
        $creator->globalAdmin = true;
        $creator->facilityMember = true;
        $creator->facilityAdmin = true;
        $creator->facilityStaff = true;
        PermissionMiddleware::setPermissions($creator->getPermissionObject());
    }

    protected function prepareDeveloper(): void
    {
        $creator = new PermissionObjectCreator();
        $creator->user = User::query()->findOrFail(User::SYSTEM);
        $creator->loggedIn = true;
        $creator->verified = true;
        $creator->globalAdmin = true;
        $creator->developer = true;
        PermissionMiddleware::setPermissions($creator->getPermissionObject());
    }

    protected static function columns(string ...$columns): array
    {
        return array_map(fn(string $column) => ['type' => 'column', 'column' => $column], $columns);
    }

    protected static function paging(int $size, int $number = 1): array
    {
        return ['size' => $size, 'number' => $number];
    }

    protected static function sort(string $column, bool $desc = false): array
    {
        return ['type' => 'column', 'column' => $column, 'desc' => $desc];
    }

    protected static function filterColumn(string $column, string $op, mixed $val = null): array
    {
        $filter = ['type' => 'column', 'column' => $column, 'op' => $op];
        if ($op !== 'null') {
            $filter['val'] = $val;
        }
        return $filter;
    }

    protected static function filterGroup(string $op, array $filters, bool $inv = false): array
    {
        $group = ['type' => 'op', 'op' => $op, 'val' => $filters];
        if ($inv) {
            $group['inv'] = true;
        }
        return $group;
    }

    protected function tpiGet(string $url): array
    {
        $result = $this->get($url);
        $result->assertOk();
        return $result->json();
    }

    protected function tpiPost(string $url, array $body): array
    {
        $result = $this->post($url, $body);
        $result->assertOk();
        return $result->json();
    }

    protected function assertTqueryData(array $response, ?int $expectedCount = null): array
    {
        $this->assertArrayHasKey('meta', $response);
        $this->assertArrayHasKey('totalDataSize', $response['meta']);
        $this->assertArrayHasKey('totalDataPages', $response['meta']);
        $this->assertArrayHasKey('data', $response);
        if ($expectedCount !== null) {
            $this->assertCount($expectedCount, $response['data']);
        }
        return $response['data'];
    }
}
