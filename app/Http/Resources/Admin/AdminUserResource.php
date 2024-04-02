<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\MemberResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'AdminUserResource',
    properties: [
        new OA\Property(property: 'hasPassword', type: 'bool', example: 'true'),
        new OA\Property(property: 'hasEmailVerified', type: 'bool', example: 'false'),
        new OA\Property(property: 'hasGlobalAdmin', type: 'bool', example: 'false'),
        new OA\Property(
            property: 'members', type: 'array', items: new OA\Items(
            ref: '#/components/schemas/MemberResource'
        )
        ),
    ],
)] /**
 * @method __construct(User $resource)
 * @mixin User
 */
class AdminUserResource extends UserResource
{
    protected static function getMappedFields(): array
    {
        return array_merge(parent::getMappedFields(), [
            'hasPassword' => fn(self $user) => ($user->password !== null),
            'hasEmailVerified' => fn(self $user) => ($user->email_verified_at !== null),
            'hasGlobalAdmin' => fn(self $user) => ($user->global_admin_grant_id !== null),
            'members' => fn(self $user) => (MemberResource::collection($user->members)),
        ]);
    }
}
