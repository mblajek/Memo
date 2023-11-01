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
    // Dictionary.
    case Dict = 'dict';
}
