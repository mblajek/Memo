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
    private function update(User $user, array $data): void
    {
        if (array_key_exists('has_email_verified', $data)) {
            if ($data['has_email_verified']) {
                if ($user->email_verified_at === null) {
                    $data['email_verified_at'] = CarbonImmutable::now();
                }
            } else {
                $data['email_verified_at'] = null;
            }
        }

        if (array_key_exists('has_global_admin', $data)) {
            $grant = Grant::query()->find($user->global_admin_grant_id);

            if ($data['has_global_admin']) {
                if ($grant === null) {
                    $grant = Grant::createForUser();
                }
            } else {
                $grant?->delete();
            }

            $data['global_admin_grant_id'] = $grant?->id;
        }

        if (array_key_exists('password', $data)) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
    }
}
