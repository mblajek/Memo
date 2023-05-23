<?php

namespace App\Http\Permissions;

readonly class PermissionObject
{
    public function __construct(
        public bool $unauthorised,
        public bool $unverified,
        public bool $verified,
        public bool $globalAdmin,
        public bool $facilityMember,
        public bool $facilityClient,
        public bool $facilityStaff,
        public bool $facilityAdmin,
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
