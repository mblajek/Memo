<?php

namespace App\Models\Attributes;

use App\Models\Value;

class ValueValue
{
    public function __construct(
        public ?Value $valueObject,
        public mixed $valueScalar,
    ) {
    }
}
