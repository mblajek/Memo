<?php

namespace App\Http\Permissions;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    public const PERMISSIONS_KEY = 'permissions-key';

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
        $permissionObject = $this->requestPermissions($request);
        foreach ($permissions as $permissionCode) {
            $permission = Permission::fromName($permissionCode);
            if ($permissionObject->getByPermission($permission)) {
                return $next($request);
            }
        }
        if ($permissionObject->getByPermission(Permission::unauthorised)) {
            throw ExceptionFactory::unauthorised();
        }
        throw ExceptionFactory::forbidden();
    }

    private function requestPermissions(Request $request): PermissionObject
    {
        $attributes = $request->attributes;
        $permissionObject = $attributes->get(self::PERMISSIONS_KEY);
        if ($permissionObject instanceof PermissionObject) {
            return $permissionObject;
        }
        $unauthorised = false;
        $unverified = false;
        $verified = false;
        $globalAdmin = false;

        /** @var User|null $user */
        $user = $request->user();
        if ($user) {
            $verified = ($user->email_verified_at !== null);
            $unverified = !$verified;
            $globalAdmin = ($user->global_admin_grant_id !== null);
        } else {
            $unauthorised = true;
        }
        $permissionObject = new PermissionObject(
            unauthorised: $unauthorised,
            unverified: $unverified,
            verified: $verified,
            globalAdmin: $globalAdmin,
            // todo
            facilityMember: false,
            facilityClient: false,
            facilityStaff: false,
            facilityAdmin: false,
        );
        $attributes->set(self::PERMISSIONS_KEY, $permissionObject);
        return $permissionObject;
    }
}
