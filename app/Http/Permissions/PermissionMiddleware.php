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
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    public const string SESSION_DEVELOPER_MODE = 'developer_mode';
    // used to log-out on all devices after password change
    public const string SESSION_PASSWORD_HASH_HASH = 'password_hash_hash';

    // The session is written as a whole when a request ends, so a request that started earlier
    // may replace it with an outdated copy. What must not be undone this way is also kept in
    // the cache, by session id, for as long as an outdated copy may live.
    private const string CACHE_LOGGED_OUT_SESSION = 'logged_out_session:';
    private const string CACHE_SESSION_PASSWORD_HASH_HASH = 'session_password_hash_hash:';
    private const int MAX_REQUEST_SECONDS = 600;


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
        return self::permissions()->facility ?? FatalExceptionFactory::unexpected()->throw();
    }

    public static function initialized(): bool
    {
        return (bool)(self::$permissionObject);
    }

    /** @throws ApiException */
    public static function user(): User
    {
        return self::permissions()->user ?? ExceptionFactory::unauthorised()->throw();
    }

    /** Marks the session as logged out, whatever its contents say from now on. */
    public static function sessionLoggedOut(Session $session): void
    {
        Cache::put(self::CACHE_LOGGED_OUT_SESSION . $session->getId(), true, self::outdatedSessionSeconds());
    }

    /**
     * Keeps the session good for a new password of the user, whatever its contents say. To be
     * called before the new password is saved, so that no request sees the password without it.
     */
    public static function sessionChangePassword(Session $session, User $user): void
    {
        Cache::put(
            self::CACHE_SESSION_PASSWORD_HASH_HASH . $session->getId(),
            $user->passwordHashHash(),
            self::outdatedSessionSeconds(),
        );
    }

    /**
     * Binds the session to the current password of the user. Enough for a session with a new id,
     * which has no outdated copies; a change of the password needs sessionChangePassword() first.
     */
    public static function sessionSetPassword(Session $session, User $user): void
    {
        $session->put(self::SESSION_PASSWORD_HASH_HASH, $user->passwordHashHash());
    }

    /** How long an outdated copy of a session may live: written by a late request, then unused. */
    private static function outdatedSessionSeconds(): int
    {
        return config('session.lifetime') * 60 + self::MAX_REQUEST_SECONDS;
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
        self::$permissionObject ??= self::requestPermissions($request);

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

    private static function requestPermissions(Request $request): PermissionObject
    {
        $creator = new PermissionObjectCreator();

        $session = $request->hasSession() ? $request->session() : null;

        if ($user = User::fromAuthenticatable($request->user())) {
            if (
                $session && !Cache::has(self::CACHE_LOGGED_OUT_SESSION . $session->getId())
                && self::checkSessionPasswordHashHash($user, $session)
            ) {
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

            $creator->facility = self::facilityFromRequestRoute($request);
            $member = $creator->facility ? $user->memberByFacility($creator->facility) : null;

            if ($member) {
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
        /** @var ?Facility */
        return $request->route('facility');
    }

    private static function checkSessionPasswordHashHash(User $user, Session $session): bool
    {
        if (!$user->password) {
            return false;
        }
        $hashHash = $user->passwordHashHash();
        // A match needs no confirmation: an outdated copy of the session can only bring back the
        // value for an earlier password, which never equals the one for the current password.
        if (hash_equals($hashHash, (string)$session->get(self::SESSION_PASSWORD_HASH_HASH))) {
            return true;
        }
        // An outdated copy of the session may have replaced the value set for the current password.
        $cached = Cache::get(self::CACHE_SESSION_PASSWORD_HASH_HASH . $session->getId());
        if (hash_equals($hashHash, (string)$cached)) {
            $session->put(self::SESSION_PASSWORD_HASH_HASH, $hashHash);
            return true;
        }
        return false;
    }
}
