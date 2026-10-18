<?php

namespace App\Tquery\OpenApi;

use App\Http\Permissions\PermissionDescribe;
use Attribute;
use OpenApi\Attributes as OA;

#[Attribute(Attribute::TARGET_METHOD)]
class OpenApiGet extends OA\Get
{
    public function __construct(
        string $path,
        PermissionDescribe $permissions,
        string $summary,
        string $tag,
        array $parameters = [],
    ) {
        parent::__construct(
            path: $path,
            description: $permissions,
            summary: $summary,
            tags: [$tag],
            parameters: $parameters,
            responses: [
                new OA\Response(
                    response: 200, description: 'OK', content: new OA\JsonContent(properties: [
                    new OA\Property(
                        property: 'columns', type: 'array', items: new OA\Items(
                        required: ['name', 'type', 'nullable'],
                        properties: [
                            new OA\Property(property: 'name', type: 'string', example: 'id'),
                            new OA\Property(
                                property: 'type', type: 'string',
                                enum: [
                                    'bool', 'date', 'datetime', 'int', 'string', 'uuid', 'dict', 'text',
                                    'dict_list', 'uuid_list', 'string_list', 'list', 'count',
                                ],
                                example: 'uuid',
                            ),
                            new OA\Property(property: 'nullable', type: 'bool', example: false),
                            new OA\Property(property: 'dictionaryId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(property: 'attributeId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(property: 'transform', type: 'string', example: 'count'),
                        ],
                    )
                    ),
                    new OA\Property(
                        property: 'customFilters', type: 'object',
                        example: '{"visitsFilter": {"associatedColumn": "recentVisits"}}',
                    ),
                ])
                ),
            ]
        );
    }
}
