<?php

namespace App\Http\Permissions;

use App\Models\Facility;
use App\Models\User;

class PermissionObjectCreator
{
    public ?User $user = null;
    public ?Facility $facility = null;
    public bool $loggedIn = false;
    public bool $unverified = false;
    public bool $verified = false;
    public bool $globalAdmin = false;
    public bool $facilityMember = false;
    public bool $facilityClient = false;
    public bool $facilityStaff = false;
    public bool $facilityAdmin = false;
    public bool $developer = false;

    public function getPermissionObject(): PermissionObject
    {
        return new PermissionObject(
            user: $this->user,
            facility: $this->facility,
            unauthorised: !$this->user,
            loggedIn: $this->loggedIn,
            unverified: $this->unverified,
            verified: $this->verified,
            globalAdmin: $this->globalAdmin,
            facilityMember: $this->facilityMember,
            facilityClient: $this->facilityClient,
            facilityStaff: $this->facilityStaff,
            facilityAdmin: $this->facilityAdmin,
            developer: $this->developer,
        );
    }
}
