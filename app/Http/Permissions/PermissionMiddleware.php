<?php

namespace App\Http\Permissions;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Models\Facility;
use App\Models\Member;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    private static ?PermissionObject $permissionObject = null;

    public static function permissions(): ?PermissionObject
    {
        return self::$permissionObject;
    }

    public static function reset(): void
    {
        self::$permissionObject = null;
    }

    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure(Request): (Response) $next
     * @param string ...$permissions
     * @return Response
     * @throws ApiException
     */
    public function handle(Request $request, Closure $next, string  ...$permissions): Response
    {
        if (!self::$permissionObject) {
            self::$permissionObject = $this->requestPermissions($request);
        }
        foreach ($permissions as $permissionCode) {
            $permission = Permission::fromName($permissionCode);
            if (self::$permissionObject->getByPermission($permission)) {
                return $next($request);
            }
        }
        if (self::$permissionObject->getByPermission(Permission::unauthorised)) {
            throw ExceptionFactory::unauthorised();
        }
        throw ExceptionFactory::forbidden();
    }

    private function requestPermissions(Request $request): PermissionObject
    {
        $verified = false;
        $unverified = false;
        $globalAdmin = false;
        /** @var User|null $user */
        $user = $request->user();
        $authorised = ($user !== null);
        if ($authorised) {
            $verified = ($user->email_verified_at !== null);
            $unverified = !$verified;
        }

        /** @var Member|null $member */
        $member = null;
        $facility = null;
        if ($verified) {
            $globalAdmin = ($user->global_admin_grant_id !== null);
            /** @var Facility|null $facility */
            $facility = $request->route('facility');
            if (!($facility instanceof Facility)) {
                $facility = null;
            }
            if ($facility) {
                $member = $user->members->first(fn(Member $member) => $member->facility_id === $facility->id);
            }
        }

        return new PermissionObject(
            user: $user,
            facility: $facility,
            unauthorised: !$authorised,
            unverified: $unverified,
            verified: $verified,
            globalAdmin: $globalAdmin,
            facilityMember: $member && $member->id,
            facilityClient: $member && $member->client_id,
            facilityStaff: $member && $member->staff_member_id,
            facilityAdmin: $member && $member->facility_admin_grant_id,
        );
    }
}
