<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Annotations as OA;

/**
 * @method __construct(User $resource)
 * @mixin User
 *
 * @OA\Schema(
 *     schema="UserResource",
 *         @OA\Property(property="id", type="string", format="uuid", example="UUID"),
 *         @OA\Property(property="name", type="string", example="Name Surname"),
 *         @OA\Property(property="email", type="bool", example="test@test.pl", nullable=true),
 *         @OA\Property(property="isEmailVerified", type="bool", example="false"),
 *         @OA\Property(property="lastLoginFacilityId", type="string", example="UUID", nullable=true),
 * )
 */
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
