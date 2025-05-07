<?php

namespace App\Http\Resources;

use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'UserResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'name', type: 'string', example: 'Name Surname'),
        new OA\Property(property: 'email', type: 'string', example: 'test@test.pl', nullable: true),
        new OA\Property(property: 'hasEmailVerified', type: 'bool', example: 'false'),
        new OA\Property(property: 'lastLoginFacilityId', type: 'string', format: 'uuid', example: 'UUID', nullable: true),
        new OA\Property(property: 'passwordExpireAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'otpRequiredAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'hasOtpConfigured', type: 'bool', example: 'false'),
    ],
)]
/**
 * @method __construct(User $resource)
 * @mixin User
 */
class UserResource extends AbstractOpenApiResource
{
    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'name' => true,
            'email' => true,
            'hasEmailVerified' => fn(self $user) => ($user->email_verified_at !== null),
            'lastLoginFacilityId' => true,
            'passwordExpireAt' => true,
            'otpRequiredAt' => true,
            'hasOtpConfigured' => fn(self $user) => ($user->otp_secret !== null),
        ];
    }
}
