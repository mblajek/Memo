<?php

namespace App\Models\Enums;

enum AttributeRequirementLevel: string
{
    case REQUIRED = 'required';
    case RECOMMENDED = 'recommended';
    case OPTIONAL = 'optional';
    case EMPTY = 'empty';
}
