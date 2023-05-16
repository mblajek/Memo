<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\ResourceTrait;
use App\Http\Resources\UserResource;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'AdminUserResource',
    properties: [
        new OA\Property(property: 'hasPassword', type: 'bool', example: 'true'),
        new OA\Property(property: 'createdAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'updatedAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'hasEmailVerified', type: 'bool', example: 'false'),
        new OA\Property(property: 'createdBy', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'hasGlobalAdmin', type: 'bool', example: 'false'),
        new OA\Property(property: 'members', type: 'array', items: new OA\Items(properties: [])),
    ],
    allOf: [new OA\Schema(ref: '#/components/schemas/UserResource')]
)] /**
 * @method __construct(User $resource)
 * @mixin User
 */
class AdminUserResource extends UserResource
{
    use ResourceTrait;

    protected static function getMappedFields(): array
    {
        return array_merge(parent::getMappedFields(), [
            'hasPassword' => fn(self $user) => ($user->password !== null),
            'createdAt' => true,
            'updatedAt' => true,
            'hasEmailVerified' => fn(self $user) => ($user->email_verified_at !== null),
            'createdBy' => true,
            'hasGlobalAdmin' => fn(self $user) => ($user->global_admin_grant_id !== null),
            'members' => fn() => [],
        ]);
    }
}
