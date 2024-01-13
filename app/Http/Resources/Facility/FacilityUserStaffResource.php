<?php

namespace App\Http\Resources\Facility;

use App\Http\Resources\AbstractJsonResource;
use App\Models\User;
use OpenApi\Attributes as OA;
use stdClass;

#[OA\Schema(
    schema: 'FacilityUserStaffResource',
    properties: [
        new OA\Property(property: 'user', ref: '#/components/schemas/FacilityUserResource', type: 'ref'),
        new OA\Property(property: 'staff', ref: '#/components/schemas/FacilityStaffResource', type: 'ref'),
    ],
)] /**
 * @method __construct(User $resource)
 * @mixin User
 */
class FacilityUserStaffResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        return [
            'user' => fn(self $user) => FacilityUserResource::make($user),
            'staff' => fn(self $user) => new stdClass() /* FacilityStaffResource */,
        ];
    }
}
