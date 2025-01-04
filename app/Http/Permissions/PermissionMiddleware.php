<?php

namespace App\Http\Permissions;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Models\Facility;
use App\Models\Member;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    public const string SESSION_DEVELOPER_MODE = 'developer_mode';
    // used to log-out on all devices after password change
    public const string SESSION_PASSWORD_HASH_HASH = 'password_hash_hash';


    private static ?PermissionObject $permissionObject = null;

    public static function permissions(): PermissionObject
    {
        return self::$permissionObject ?? FatalExceptionFactory::unexpected()->throw();
    }

    public static function setPermissions(?PermissionObject $permissions): void
    {
        self::$permissionObject = $permissions;
    }

    public static function facility(): Facility
    {
        return PermissionMiddleware::permissions()->facility ?? FatalExceptionFactory::unexpected()->throw();
    }

    /** @throws ApiException */
    public static function user(): User
    {
        return PermissionMiddleware::permissions()->user ?? ExceptionFactory::unauthorised()->throw();
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
    public function handle(Request $request, Closure $next, string ...$permissions): Response
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
            ExceptionFactory::unauthorised()->throw();
        }
        ExceptionFactory::forbidden()->throw();
    }

    private function requestPermissions(Request $request): PermissionObject
    {
        $session = $request->hasSession() ? $request->session() : null;

        $verified = false;
        $unverified = false;
        $globalAdmin = false;
        $user = User::fromAuthenticatable($request->user());
        if ($user && $session?->get(self::SESSION_PASSWORD_HASH_HASH) !== $user->passwordHashHash()) {
            Auth::logout();
            $user = null;
        }

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
            developer: $globalAdmin && $session?->get(self::SESSION_DEVELOPER_MODE),
        );
    }
}
