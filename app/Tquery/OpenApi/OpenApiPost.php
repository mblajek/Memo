<?php

namespace App\Tquery\OpenApi;

use App\Http\Permissions\PermissionDescribe;
use Attribute;
use OpenApi\Attributes as OA;

#[Attribute(Attribute::TARGET_METHOD)]
class OpenApiPost extends OA\Post
{
    public function __construct(
        string $path,
        PermissionDescribe $permissions,
        string $summary,
        string $tag,
    ) {
        parent::__construct(
            path: $path,
            description: $permissions,
            summary: $summary,
            requestBody: new OA\RequestBody(
                content: new OA\JsonContent(
                    required: ['name', 'url'],
                    properties: [
                        new OA\Property(
                            property: 'columns', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'type', type: 'string', example: 'column'),
                            new OA\Property(property: 'column', type: 'string', example: 'id'),
                        ])
                        ),
                        new OA\Property(
                            property: 'filter', properties: [
                            new OA\Property(property: 'type', type: 'string', example: 'op'),
                            new OA\Property(property: 'op', type: 'string', example: '&'),
                            new OA\Property(property: 'inv', type: 'bool', example: false),
                            new OA\Property(
                                property: 'val', type: 'array', items: new OA\Items(properties: [
                                new OA\Property(property: 'type', type: 'string', example: 'column'),
                                new OA\Property(property: 'column', type: 'string', example: 'name'),
                                new OA\Property(property: 'op', type: 'string', example: '%v%'),
                                new OA\Property(property: 'val', type: 'string', example: 'abc'),
                            ])
                            ),
                        ]
                        ),
                        new OA\Property(
                            property: 'sort', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'type', type: 'string', example: 'column'),
                            new OA\Property(property: 'column', type: 'string', example: 'id'),
                            new OA\Property(property: 'desc', type: 'bool', example: 'false'),
                        ])
                        ),
                        new OA\Property(
                            property: 'paging', properties: [
                            new OA\Property(property: 'number', type: 'int', example: '1'),
                            new OA\Property(property: 'size', type: 'int', example: '20'),
                        ]
                        ),
                    ]
                )
            ),
            tags: [$tag],
            responses: [
                new OA\Response(
                    response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                    new OA\Property(property: 'meta', properties: [
                        new OA\Property(
                            property: 'columns', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'type', type: 'string', example: 'column'),
                            new OA\Property(property: 'name', type: 'string', example: 'id'),
                        ])
                        ),
                        new OA\Property(property: 'totalDataSize', type: 'int', example: 15),
                    ]),
                    new OA\Property(
                        property: 'data', type: 'array', items: new OA\Items(example: '{"id": "UUID", "name": "abc"}')
                    ),
                ])
                ),
                new OA\Response(response: 400, description: 'Bad Request'),
                new OA\Response(response: 401, description: 'Unauthorised'),
            ]
        );
    }
}
