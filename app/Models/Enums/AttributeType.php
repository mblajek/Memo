<?php

namespace App\Models\Enums;

enum AttributeType: string
{
    // Standard data types.
    case STRING = 'string';
    case DECIMAL0 = 'decimal0';
    case DECIMAL2 = 'decimal2';
    case BOOL = 'bool';
    case DATE = 'date';
    case DATETIME = 'datetime';
    // Supported table names.
    case USERS = 'users';
    // Dictionary.
    case DICT = 'dict';
}
