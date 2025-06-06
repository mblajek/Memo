<?php

namespace App\Http\Resources;

use App\Models\Facility;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'FacilityResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'name', type: 'string', example: 'Test'),
        new OA\Property(property: 'url', type: 'string', example: 'test'),
        new OA\Property(property: 'hasMeetingNotification', type: 'bool'),
    ],
)]
/**
 * @method __construct(Facility $resource)
 * @mixin Facility
 */
class FacilityResource extends AbstractOpenApiResource
{
    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'name' => true,
            'url' => true,
            'hasMeetingNotification' => fn(self $facility)
                => $facility->hasMeetingNotification(),
        ];
    }
}
