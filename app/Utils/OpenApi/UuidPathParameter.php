<?php

namespace App\Utils\OpenApi;

use OpenApi\Attributes as OA;

class UuidPathParameter extends OA\Parameter
{
    public function __construct(string $name)
    {
        parent::__construct(
            name: $name,
            description: ucfirst($name) . ' id',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
        );
    }
}
