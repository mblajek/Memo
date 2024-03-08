<?php

namespace App\Http\Resources;

use App\Models\Attribute;
use App\Models\Enums\AttributeRequirementLevel;
use OpenApi\Attributes as OA;
use Illuminate\Support\Str;

#[OA\Schema(
    schema: 'AttributeResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID', nullable: true),
        new OA\Property(property: 'model', type: 'string', enum: ['user', 'staffMember', '...'], example: 'user'),
        new OA\Property(property: 'name', type: 'string', example: 'attribute'),
        new OA\Property(property: 'apiName', type: 'string', example: 'attribute'),
        new OA\Property(
            property: 'typeModel',
            type: 'string',
            enum: ['int', 'bool', 'string', 'user', 'staffMember', '...'],
            example: 'int'
        ),
        new OA\Property(property: 'dictionaryId', type: 'string', format: 'uuid', example: 'UUID', nullable: true),
        new OA\Property(property: 'defaultOrder', type: 'int', example: 1),
        new OA\Property(property: 'isMultiValue', type: 'bool', example: false, nullable: true),
        new OA\Property(property: 'isFixed', type: 'bool', example: false),
        new OA\Property(
            property: 'requirementLevel',
            type: 'string',
            enum: AttributeRequirementLevel::class,
            example: 'required'
        ),
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
            'model' => fn(self $attribute) => lcfirst($attribute->table->name),
            'name' => fn(self $attribute) => Str::camel($attribute->name),
            'apiName' => fn(self $attribute) => Str::camel($attribute->api_name),
            'type' => fn(self $attribute) => lcfirst($attribute->type->tryGetTable()?->name ?? $attribute->type->value),
            'typeModel' => fn(self $attribute) => lcfirst($attribute->type->tryGetTable()?->name ?? '') ?: null,
            'dictionaryId' => true,
            'isFixed' => true,
            'defaultOrder' => true,
            'isMultiValue' => true,
            'requirementLevel' => true,
        ];
    }
}
