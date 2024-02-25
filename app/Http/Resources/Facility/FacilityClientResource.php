<?php

namespace App\Http\Resources\Facility;

use App\Http\Resources\AbstractJsonResource;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'FacilityClientResource',
    properties: [
    ]
)] /**
 * @method __construct(User $resource)
 * @mixin User
 */
class FacilityClientResource extends AbstractJsonResource
{
    protected function withAttrValues(): bool
    {
        return true;
    }

    protected static function getMappedFields(): array
    {
        return [
            // todo: get from attributes
            'genderDictId' => true,
        ];
    }
}
