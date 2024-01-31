<?php

namespace App\Tquery\Engine\Bind;

final readonly class TqSingleBind extends TqBind
{
    protected function __construct(
        private bool|int|string $value,
    ) {
    }

    public function asArray(): array
    {
        return [$this->value];
    }
}
