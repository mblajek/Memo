<?php

namespace App\Http\Resources\Facility;

use App\Http\Resources\AbstractOpenApiResource;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'FacilityClientResource',
    properties: [
    ],
)] /**
 * @method __construct(User $resource)
 * @mixin User
 */
class FacilityClientResource extends AbstractOpenApiResource
{
    protected function withAttrValues(): bool
    {
        return true;
    }

    protected static function getMappedFields(): array
    {
        return [
        ];
    }
}
