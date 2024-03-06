<?php

namespace App\Http\Resources\Facility;

use App\Http\Resources\AbstractJsonResource;
use App\Models\User;
use OpenApi\Attributes as OA;
use stdClass;

#[OA\Schema(
    schema: 'FacilityUserClientResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'name', type: 'string', example: 'Name Surname'),
        new OA\Property(property: 'email', type: 'string', example: 'test@test.pl', nullable: true),
        new OA\Property(property: 'passwordExpireAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'hasPassword', type: 'bool', example: 'true'),
        new OA\Property(property: 'createdAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'updatedAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'hasEmailVerified', type: 'bool', example: 'false'),
        new OA\Property(property: 'createdBy', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'client', ref: '#/components/schemas/FacilityClientResource', type: 'ref'),
    ],
)] /**
 * @method __construct(User $resource)
 * @mixin User
 */
class FacilityUserClientResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'name' => true,
            'email' => true,
            'passwordExpireAt' => true,
            'hasPassword' => fn(self $user) => ($user->password !== null),
            'createdAt' => true,
            'updatedAt' => true,
            'hasEmailVerified' => fn(self $user) => ($user->email_verified_at !== null),
            'createdBy' => true,
            'client' => fn(self $user) => new stdClass() /* FacilityClientResource */,
        ];
    }
}
