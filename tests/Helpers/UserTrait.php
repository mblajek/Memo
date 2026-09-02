<?php

namespace Tests\Helpers;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\Facility;
use App\Models\User;

trait UserTrait
{
    protected const string VALID_PASSWORD = 'VET81Ux3n3ff9U76XktpX3';

    public function prepareAdminUser(?Facility $facility = null): void
    {
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem(facility: $facility));
    }

    public function prepareFacilityAdmin(
        Facility $facility,
        ?User $user = null,
        bool $globalAdmin = false,
        bool $facilityStaff = false,
    ): void {
        $creator = new PermissionObjectCreator();
        $creator->user = $user ?? User::query()->findOrFail(User::SYSTEM);
        $creator->facility = $facility;
        $creator->loggedIn = true;
        $creator->verified = true;
        $creator->globalAdmin = $globalAdmin;
        $creator->facilityMember = true;
        $creator->facilityAdmin = true;
        $creator->facilityStaff = $facilityStaff;
        PermissionMiddleware::setPermissions($creator->getPermissionObject());
    }
}
