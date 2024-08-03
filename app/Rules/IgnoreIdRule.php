<?php

namespace App\Rules;

use Illuminate\Database\Eloquent\Model;

interface IgnoreIdRule
{
    public function ignore(Model|string $id): void;
}
