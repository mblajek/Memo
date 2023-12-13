<?php

namespace App\Models\Enums;

enum AttributeType: string
{
    // Standard data types.
    case Bool = 'bool';
    case Date = 'date';
    case Datetime = 'datetime';
    case Int = 'int';
    case String = 'string';
    // Supported table names.
    case Users = 'users';
    case Clients = 'clients';
    case Attributes = 'attributes';
    // Dictionary.
    case Dict = 'dict';

    public function tryGetTable(): ?AttributeTable
    {
        return AttributeTable::tryFrom($this->value);
    }
}
