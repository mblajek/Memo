<?php

namespace App\Utils\OpenApi;

use OpenApi\Attributes as OA;

class UserParameter extends OA\Parameter
{
    public function __construct()
    {
        parent::__construct(
            name: 'user',
            description: 'User id',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
        );
    }
}
