<?php

namespace App\Models\UuidEnum;

use App\Models\Attribute;

/** @mixin AttributeUuidEnum */
trait AttributeUuidEnumTrait
{
    use UuidEnumTrait;

    public function apiName(): string
    {
        return Attribute::getCacheById($this->value)->api_name;
    }
}
