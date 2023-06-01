<?php

namespace Tests\Helpers;

use App\Models\Grant;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

trait UserTrait
{
    public function prepareAdminUser(): void
    {
        /** @var Grant $grant */
        $grant = Grant::factory()->create();
        /** @var User $adminUser */
        $adminUser = User::factory()->create(['global_admin_grant_id' => $grant->id]);
        Auth::setUser($adminUser);
    }
}
