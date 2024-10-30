<?php

namespace App\Models\UuidEnum;

use App\Models\Attribute;
use StringBackedEnum;

/** @mixin StringBackedEnum */
trait AttributeUuidEnumTrait
{
    public function apiName(): string
    {
        return Attribute::getById($this->value)->api_name;
    }
}
