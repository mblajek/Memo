<?php

namespace App\Tquery\Engine\Bind;

final readonly class TqListBind extends TqBind
{
    public int $length;

    protected function __construct(
        private array $value,
    ) {
        $this->length = count($this->value);
    }

    public function asArray(): array
    {
        return $this->value;
    }
}
