<?php

namespace App\Services\User;

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

        $user->saveOrFail();

        $this->logService->addEntry(
            request: $request,
            source: 'user_password_change',
            logLevel: LogLevel::INFO,
            message: $user->email, // quite useless
            user: $user,
        );
    }
}
