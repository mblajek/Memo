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
                    response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                    new OA\Property(property: 'data', properties: [
                        new OA\Property(
                            property: 'columns', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'name', type: 'string', example: 'id'),
                            new OA\Property(
                                property: 'type', type: 'string',
                                enum: ['bool', 'date', 'datetime', 'int', 'string'],
                                example: 'uuid',
                            ),
                        ])
                        ),
                        new OA\Property(
                            property: 'customFilters', type: 'object',
                            example: '{"visitsFilter": {"associatedColumn": "recentVisits"}}',
                        ),
                    ]),
                ])
                ),
            ]
        );
    }
}
