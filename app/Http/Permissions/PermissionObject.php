<?php

namespace App\Http\Permissions;

use App\Http\Resources\ResourceTrait;

class PermissionObject
{
    public function __construct(
        public readonly bool $unauthorised,
        public readonly bool $unverified,
        public readonly bool $verified,
        public readonly bool $globalAdmin,
        public readonly bool $facilityMember,
        public readonly bool $facilityClient,
        public readonly bool $facilityStaff,
        public readonly bool $facilityAdmin,
    ) {
    }

    public function getByPermission(Permission $permission): bool
    {
        return match ($permission) {
            Permission::any => true,
            Permission::unauthorised => $this->unauthorised,
            Permission::unverified => $this->unverified,
            Permission::verified => $this->verified,
            Permission::globalAdmin => $this->globalAdmin,
            Permission::facilityMember => $this->facilityMember,
            Permission::facilityClient => $this->facilityClient,
            Permission::facilityStaff => $this->facilityStaff,
            Permission::facilityAdmin => $this->facilityAdmin,
        };
    }
}
