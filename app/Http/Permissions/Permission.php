<?php

namespace App\Http\Permissions;

enum Permission
{
    // everyone
    case any;

    // only unauthorised user
    case unauthorised;

    // logged user, with unverified email
    case unverified;

    // logged user with verified email
    case verified;

    // user granted to see client's sensitive data - todo: global or facility
    // contains: verified
    // case sensitiveData;

    // user with is_global_admin
    // contains: verified
    case globalAdmin;

    // any kind of facility member, for routes with {facility}
    // contains: verified
    case facilityMember;

    // facility client, for routes with {facility}
    // contains: verified, facilityMember
    case facilityClient;

    // facility staff member, for routes with {facility}
    // contains: verified, facilityMember
    case facilityStaff;

    // user with is_facility_admin, for routes with {facility}
    // contains: verified, facilityMember
    case facilityAdmin;

    public static function fromName(string $name): self
    {
        return constant("self::$name");
    }
}
