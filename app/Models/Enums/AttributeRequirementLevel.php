<?php

namespace App\Models\Enums;

enum AttributeRequirementLevel: string
{
    case Required = 'required';
    case Recommended = 'recommended';
    case Optional = 'optional';
    case Empty = 'empty';
}
