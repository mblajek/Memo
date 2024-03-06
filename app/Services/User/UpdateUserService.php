<?php

namespace App\Services\User;

use App\Models\Grant;
use App\Models\User;
use App\Services\System\MergePatchService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Throwable;

readonly class UpdateUserService
{
    public function __construct(
        private MergePatchService $mergePatchService
    ) {
    }

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
                    $grant = Grant::create();
                }
            } else {
                $grant?->delete();
            }

            $userAttributes['global_admin_grant_id'] = $grant?->id;
        }

        $user->update($userAttributes);
    }

    public function getAttributesAfterPatch(User $user, array $requestData)
    {
        $hidden = $user->getHidden();
        $user->makeVisible($hidden);
        $patchedAttributes = $this->mergePatchService->merge($user->attributesToArray(), $requestData);
        $user->makeHidden($hidden);

        // TODO: The logic behind these values is copied from computed attributes of the User class.
        // We should probably create separate classes for API objects and DB objects what would
        // contain this logic and the logic of the `update` method above.
        // Another option: move the logic to the AdminUserResource class.
        if (array_key_exists('password', $requestData)) {
            $patchedAttributes['password'] = ($requestData['password'] !== null)
                ? Hash::make($requestData['password']) : null;
        }
        $patchedAttributes['has_password'] = $patchedAttributes['password'] !== null;
        if (!isset($requestData['has_email_verified'])) {
            $patchedAttributes['has_email_verified'] = $patchedAttributes['email_verified_at'] !== null;
        }
        if (!isset($requestData['has_global_admin'])) {
            $patchedAttributes['has_global_admin'] = $patchedAttributes['global_admin_grant_id'] !== null;
        }
        return $patchedAttributes;
    }
}
