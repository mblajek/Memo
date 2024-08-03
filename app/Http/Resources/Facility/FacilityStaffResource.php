<?php

namespace App\Http\Resources\Facility;

use App\Http\Resources\AbstractOpenApiResource;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'FacilityStaffResource',
    properties: [
        new OA\Property(property: 'hasFacilityAdmin', type: 'bool', example: false),
        new OA\Property(property: 'deactivatedAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
    ],
)] /**
 * @method __construct(User $resource)
 * @property bool has_facility_admin
 * @property string deactivated_at
 * @mixin User
 */
class FacilityStaffResource extends AbstractOpenApiResource
{
    protected static function getMappedFields(): array
    {
        return [
            'hasFacilityAdmin' => true,
            'deactivatedAt' => true,
        ];
    }
}
