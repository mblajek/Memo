<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\DataAwareRule;

abstract class AbstractDataRule extends AbstractRule implements DataAwareRule
{
    protected array $data;

    public function setData(array $data): void
    {
        $this->data = $data;
    }
}
