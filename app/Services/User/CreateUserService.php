<?php

namespace App\Services\User;

use App\Models\Grant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Throwable;

readonly class CreateUserService
{
    /**
     * @throws Throwable
     */
    public function handle(array $data): string
    {
        return DB::transaction(fn() => $this->create($data));
    }

    /**
     * @throws Throwable
     */
    private function create(array $data): string
    {
        $user = new User();

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->email_verified_at =
            (array_key_exists('has_email_verified', $data) && $data['has_email_verified'] === true)
            ? CarbonImmutable::now() : null;
        $user->password = isset($data['password']) ? Hash::make($data['password']) : null;
        $user->password_expire_at = $data['password_expire_at'] ?? null;
        $user->managed_by_facility_id = $data['managed_by_facility_id'] ?? null;
        $user->global_admin_grant_id = $data['has_global_admin'] ? Grant::create()->id : null;
        $user->otp_required_at = $data['otp_required_at'] ?? null;

        $user->save();

        return $user->id;
    }
}
