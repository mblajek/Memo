<?php

namespace App\Models\UuidEnum;

interface AttributeUuidEnum extends UuidEnum
{
    public function apiName(): string;
}
