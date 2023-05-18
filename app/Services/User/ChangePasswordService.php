<?php

namespace App\Services\User;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Throwable;

class ChangePasswordService
{
    /**
     * @throws Throwable
     */
    public function handle(array $data): void
    {
        $loggedUser = User::query()->findOrFail(Auth::user()->id);

        $loggedUser->password = Hash::make($data['password']);
        $loggedUser->password_expire_at = null;

        $loggedUser->saveOrFail();
    }
}
