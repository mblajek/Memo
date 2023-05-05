<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    use ResourceTrait;

    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'name' => true,
            'email' => true,
            'isEmailVerified' => fn(self $user) => ($user->email_verified_at !== null),
            'lastLoginFacilityId' => true,
        ];
    }
}
