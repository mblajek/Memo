<?php

namespace App\Utils\OpenApi;

class UserParameter extends UuidPathParameter
{
    public function __construct()
    {
        parent::__construct('user');
    }
}
