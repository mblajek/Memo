<?php

namespace App\Http\Permissions;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Models\Facility;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Session\Session;
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
        $creator = new PermissionObjectCreator();

        $session = $request->hasSession() ? $request->session() : null;

        if ($user = User::fromAuthenticatable($request->user())) {
            if (self::checkSessionPasswordHashHash($user, $session)) {
                $creator->loggedIn = true;
                $creator->user = $user;
                $creator->verified = ($user->email_verified_at !== null);
                $creator->unverified = !$creator->verified;
            } else {
                Auth::logout();
            }
        }

        if ($creator->verified) {
            $creator->globalAdmin = ($user->global_admin_grant_id !== null);
            $creator->developer = $creator->globalAdmin && $session?->get(self::SESSION_DEVELOPER_MODE);

            $facility = self::facilityFromRequestRoute($request);
            $member = $facility ? $user->memberByFacility($facility) : null;

            if ($member) {
                $creator->facility = $facility;
                $creator->facilityMember = true;
                $creator->facilityAdmin = ($member->facility_admin_grant_id !== null);
                $creator->facilityStaff = ($member->isActiveStaff() === true);
                $creator->facilityClient = ($member->client_id !== null);
            }
        }

        return $creator->getPermissionObject();
    }

    private static function facilityFromRequestRoute(Request $request): ?Facility
    {
        $facility = $request->route('facility');
        return ($facility instanceof Facility) ? $facility : null;
    }

    private static function checkSessionPasswordHashHash(User $user, ?Session $session): bool
    {
        return $session && $user->password
            && ($session->get(self::SESSION_PASSWORD_HASH_HASH) === $user->passwordHashHash());
    }
}
