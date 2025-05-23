<?php

namespace App\Http\Permissions;

use App\Models\Facility;
use App\Models\User;

readonly class PermissionObject
{
    public function __construct(
        public ?User $user,
        public ?Facility $facility,
        public bool $unauthorised,
        public bool $loggedIn,
        public bool $unverified,
        public bool $verified,
        public bool $globalAdmin,
        public bool $facilityMember,
        public bool $facilityClient,
        public bool $facilityStaff,
        public bool $facilityAdmin,
        public bool $developer,
    ) {
    }

    public function getByPermission(Permission $permission): bool
    {
        return match ($permission) {
            Permission::any => true,
            Permission::unauthorised => $this->unauthorised,
            Permission::loggedIn => $this->loggedIn,
            Permission::unverified => $this->unverified,
            Permission::verified => $this->verified,
            Permission::globalAdmin => $this->globalAdmin,
            Permission::facilityMember => $this->facilityMember,
            Permission::facilityClient => $this->facilityClient,
            Permission::facilityStaff => $this->facilityStaff,
            Permission::facilityAdmin => $this->facilityAdmin,
            Permission::developer => $this->developer,
        };
    }
}
