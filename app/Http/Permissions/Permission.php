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
    // case sensitiveData;
    // user with is_global_admin
    case globalAdmin;
    // any kind of facility member, for routes with {facility}
    case facilityMember;
    // facility client, for routes with {facility}
    case facilityClient;
    // facility staff member, for routes with {facility}
    case facilityStaff;
    // user with is_facility_admin, for routes with {facility}
    case facilityAdmin;

    public static function fromName(string $name): self
    {
        return constant("self::$name");
    }
}
