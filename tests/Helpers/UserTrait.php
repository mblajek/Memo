<?php

namespace Tests\Helpers;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\Facility;

trait UserTrait
{
    protected const string VALID_PASSWORD = 'VET81Ux3n3ff9U76XktpX3';

    public function prepareAdminUser(?Facility $facility = null): void
    {
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem(facility: $facility));
    }
}
