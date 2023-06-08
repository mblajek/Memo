<?php

namespace App\Services\User;

use App\Models\Grant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
            $data['email_verified_at'] = $data['has_email_verified'] === true ? CarbonImmutable::now() : null;
        }

        if (array_key_exists('has_global_admin', $data)) {
            $grant = Grant::query()->find($user->global_admin_grant_id);
            $grant?->delete();

            if ($data['has_global_admin']) {
                $grant = new Grant();
                $grant->created_by = Auth::user()->id;
                $grant->save();
            }

            $data['global_admin_grant_id'] = $grant?->id;
        }

        $user->update($data);
    }
}
