<?php

namespace App\Services\User;

use App\Models\Grant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\Auth;
use Throwable;

readonly class UpdateUserService
{
    public function __construct(
        private DatabaseManager $db,
    ) {
    }

    /**
     * @throws Throwable
     */
    public function handle(User $user, array $data): void
    {
        $this->db->transaction(fn() => $this->update($user, $data));
    }

    /**
     * @throws Throwable
     */
    private function update(User $user, array $data): void
    {
        if (isset($data['has_email_verified'])) {
            $data['email_verified_at'] = $data['has_email_verified'] === true ? CarbonImmutable::now() : null;
        }

        if (isset($data['has_global_admin'])) {
            $grant = null;

            if ($data['has_global_admin']) {
                $grant = new Grant();
                $grant->created_by = Auth::user()->id;
                $grant->saveOrFail();
            }

            $data['global_admin_grant_id'] = $grant?->id;
        }

        $user->updateOrFail($data);
    }
}
