<?php

namespace App\Services\User;

use App\Models\Grant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Throwable;

class CreateUserService
{
    /**
     * @throws Throwable
     */
    public function handle(array $data): string
    {
        $user = new User();

        if ($data['hasGlobalAdmin'] !== null) {
            $grant = new Grant();
            $grant->created_by = Auth::user()->id;
        }

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->email_verified_at = $data['hasEmailVerified'] === true ? CarbonImmutable::now() : null;
        $user->password = $data['password'] !== null ? Hash::make($data['password']) : null;
        $user->password_expire_at = $data['passwordExpireAt'];

        $grant = null;
        if ($data['hasGlobalAdmin'] !== null) {
            $grant = new Grant();
            $grant->created_by = Auth::user()->id;
            $grant->saveOrFail();
        }

        $user->global_admin_grant_id = $grant;

        $user->saveOrFail();

        return $user->id;
    }
}
