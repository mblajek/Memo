<?php

namespace Tests\Helpers;

use App\Models\Grant;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

trait UserTrait
{
    protected const VALID_PASSWORD = 'VET81Ux3n3ff9U76XktpX3';
    public function prepareAdminUser(): void
    {
        /** @var Grant $grant */
        $grant = Grant::factory()->create();
        /** @var User $adminUser */
        $adminUser = User::factory()->create(['global_admin_grant_id' => $grant->id]);
        Auth::setUser($adminUser);
    }
}
