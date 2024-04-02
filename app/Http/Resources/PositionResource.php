<?php

namespace App\Http\Resources;

use App\Models\Position;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PositionResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'dictionaryId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'name', type: 'string', example: 'Test'),
        new OA\Property(property: 'isFixed', type: 'bool', example: true),
        new OA\Property(property: 'isDisabled', type: 'bool', example: false),
        new OA\Property(property: 'defaultOrder', type: 'int', example: 1),
    ],
)] /**
 * @method __construct(Position $resource)
 * @mixin Position
 */
class PositionResource extends AbstractOpenApiResource
{
    protected function withAttrValues(): bool
    {
        return true;
    }

    protected static function getMappedFields(): array
    {
        return ['id', 'dictionaryId', 'facilityId', 'name', 'isFixed', 'isDisabled', 'defaultOrder'];
    }
}
