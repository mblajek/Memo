<?php

namespace App\Services\User;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\User;
use App\Services\System\LogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Psr\Log\LogLevel;
use Throwable;

readonly class ChangePasswordService
{
    public function __construct(
        private LogService $logService,
    ) {
    }

    /**
     * @throws Throwable
     */
    public function handle(Request $request, User $user, string $password): void
    {
        $user->password = Hash::make($password);
        $user->password_expire_at = null;

        // Before saving: from the moment the password changes, the session must be good for it.
        PermissionMiddleware::sessionChangePassword($request->session(), $user);
        $user->saveOrFail();
        PermissionMiddleware::sessionSetPassword($request->session(), $user);

        $this->logService->addEntry(
            request: $request,
            source: 'user_password_change',
            logLevel: LogLevel::INFO,
            message: null,
            user: $user,
        );
    }
}
