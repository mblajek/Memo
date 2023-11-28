<?php

namespace App\Http\Resources;

use App\Models\Dictionary;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'DictionaryResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'name', type: 'string', example: 'Test'),
        new OA\Property(property: 'isFixed', type: 'bool', example: true),
        new OA\Property(property: 'isExtendable', type: 'bool', example: false),
        new OA\Property(
            property: 'positions', type: 'array', items: new OA\Items(
            ref: '#/components/schemas/PositionResource'
        )
        ),
    ]
)] /**
 * @method __construct(Dictionary $resource)
 * @mixin Dictionary
 */
class DictionaryResource extends AbstractJsonResource
{
    protected function withAttrValues(): bool
    {
        return true;
    }

    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'facilityId' => true,
            'name' => true,
            'isFixed' => true,
            'isExtendable' => true,
            'positions' => fn(self $dictionary) => PositionResource::collection($dictionary->getSortedPositions()),
        ];
    }
}
