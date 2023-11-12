<?php

namespace App\Http\Resources;

use App\Models\Attribute;
use App\Models\Enums\AttributeModel;
use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use OpenApi\Attributes as OA;
use Illuminate\Support\Str;

#[OA\Schema(
    schema: 'AttributeResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID', nullable: true),
        new OA\Property(property: 'table', type: 'string', enum: AttributeTable::class, example: 'users'),
        new OA\Property(property: 'model', type: 'string', enum: AttributeModel::class, example: 'user'),
        new OA\Property(property: 'name', type: 'string', example: 'attribute'),
        new OA\Property(property: 'apiName', type: 'string', example: 'attribute'),
        new OA\Property(property: 'type', type: 'string', enum: AttributeType::class, example: 'int'),
        new OA\Property(property: 'dictionaryId', type: 'string', format: 'uuid', example: 'UUID', nullable: true),
        new OA\Property(property: 'defaultOrder', type: 'int', example: 1),
        new OA\Property(property: 'isMultiValue', type: 'bool', example: false, nullable: true),
        new OA\Property(property: 'requirementLevel', type: 'string', enum: AttributeRequirementLevel::class, example: 'required'),
    ]
)] /**
 * @method __construct(Attribute $resource)
 * @mixin Attribute
 */
class AttributeResource extends AbstractJsonResource
{

    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'facilityId' => true,
            'table' => true,
            'model' => true,
            'name' => true,
            'apiName' => fn(self $attribute) => Str::camel($attribute->api_name),
            'type' => true,
            'dictionaryId' => true,
            'defaultOrder' => true,
            'isMultiValue' => true,
            'requirementLevel' => true,
        ];
    }
}
