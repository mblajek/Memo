<?php

namespace App\Services\User;

use App\Models\Grant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Throwable;

readonly class CreateUserService
{
    public function __construct(
        private DatabaseManager $db,
    ) {
    }

    /**
     * @throws Throwable
     */
    public function handle(array $data): string
    {
        return $this->db->transaction(fn() => $this->create($data));
    }

    /**
     * @throws Throwable
     */
    private function create(array $data): string
    {
        $grant = null;

        if ($data['has_global_admin']) {
            $grant = new Grant();
            $grant->created_by = Auth::user()->id;
            $grant->saveOrFail();
        }

        $user = new User();

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->email_verified_at = $data['has_email_verified'] === true ? CarbonImmutable::now() : null;
        $user->password = $data['password'] !== null ? Hash::make($data['password']) : null;
        $user->password_expire_at = $data['password_expire_at'];
        $user->created_by = Auth::user()->id;
        $user->global_admin_grant_id = $grant?->id;

        $user->saveOrFail();

        return $user->id;
    }
}
