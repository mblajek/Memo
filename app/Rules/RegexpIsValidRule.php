<?php

namespace App\Rules;

use Closure;
use Illuminate\Support\Facades\DB;
use Throwable;

final class RegexpIsValidRule extends AbstractRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        try {
            if (is_string($value) && DB::statement('select 1 regexp ?', [$value])) {
                return;
            }
        } catch (Throwable) {
        }
        $this->validator->addFailure($attribute, 'custom.regexp_is_valid');
    }
}
