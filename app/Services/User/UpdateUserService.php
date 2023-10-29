<?php

namespace App\Services\User;

use App\Models\Grant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Throwable;

readonly class UpdateUserService
{
    /**
     * @throws Throwable
     */
    public function handle(User $user, array $data): void
    {
        DB::transaction(fn() => $this->update($user, $data));
    }

    /**
     * @throws Throwable
     */
    private function update(User $user, array $userAttributes): void
    {
        if (array_key_exists('has_email_verified', $userAttributes)) {
            if ($userAttributes['has_email_verified']) {
                if ($user->email_verified_at === null) {
                    $userAttributes['email_verified_at'] = CarbonImmutable::now();
                }
            } else {
                $userAttributes['email_verified_at'] = null;
            }
        }

        if (array_key_exists('has_global_admin', $userAttributes)) {
            $grant = Grant::query()->find($user->global_admin_grant_id);

            if ($userAttributes['has_global_admin']) {
                if ($grant === null) {
                    $grant = Grant::createForUser();
                }
            } else {
                $grant?->delete();
            }

            $userAttributes['global_admin_grant_id'] = $grant?->id;
        }

        if (array_key_exists('password', $userAttributes) && $userAttributes['password'] !== null) {
            $userAttributes['password'] = Hash::make($userAttributes['password']);
        }

        $user->update($userAttributes);
    }
}
