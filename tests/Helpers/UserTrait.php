<?php

namespace Tests\Helpers;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObject;
use App\Models\Facility;
use App\Models\User;

trait UserTrait
{
    protected const VALID_PASSWORD = 'VET81Ux3n3ff9U76XktpX3';

    public function prepareAdminUser(?Facility $facility = null): void
    {
        PermissionMiddleware::setPermissions(
            new PermissionObject(
                user: User::query()->findOrFail(User::SYSTEM),
                facility: $facility,
                unauthorised: false,
                unverified: true,
                verified: true,
                globalAdmin: true,
                facilityMember: false,
                facilityClient: false,
                facilityStaff: false,
                facilityAdmin: false,
                developer: false,
            )
        );
    }
}
