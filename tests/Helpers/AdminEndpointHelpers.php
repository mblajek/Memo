<?php

namespace Tests\Helpers;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\User;
use Illuminate\Testing\TestResponse;

/** Shared permission and assertion helpers for the admin endpoint tests. */
trait AdminEndpointHelpers
{
    protected function actAsVerifiedNonAdmin(): void
    {
        $creator = new PermissionObjectCreator();
        $creator->user = User::factory()->create();
        $creator->loggedIn = true;
        $creator->verified = true;
        PermissionMiddleware::setPermissions($creator->getPermissionObject());
    }

    /** @return list<string> the validation error codes reported for the given field */
    protected function fieldCodes(TestResponse $result, string $field): array
    {
        return array_values(array_column(
            array_filter($result->json('errors') ?? [], fn(array $e) => ($e['field'] ?? null) === $field),
            'code',
        ));
    }
}
