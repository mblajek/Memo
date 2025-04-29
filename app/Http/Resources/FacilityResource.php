<?php

namespace App\Http\Resources;

use App\Models\Facility;
use App\Utils\Date\DateHelper;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'FacilityResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'name', type: 'string', example: 'Test'),
        new OA\Property(property: 'url', type: 'string', example: 'test'),
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
        $timezone = DateHelper::getUserTimezone()->getName();
        return [
            'id' => true,
            'name' => true,
            'url' => true,
        ];
    }
}
