<?php

namespace App\Models\UuidEnum;

use BackedEnum;

/**
 * @property string $value
 * @method static self from(string $value)
 * @method static self|null tryFrom(string $value)
 */
interface UuidEnum extends BackedEnum
{
}
