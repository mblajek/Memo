<?php

namespace App\Rules;

use Closure;

use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;
use Illuminate\Support\Arr;
use Illuminate\Validation\Validator;

abstract class AbstractDataRule extends AbstractRule implements DataAwareRule
{
    protected array $data;

    public function setData(array $data): void
    {
        $this->data = $data;
    }
}
