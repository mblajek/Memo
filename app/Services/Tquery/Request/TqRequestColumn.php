<?php

namespace App\Services\Tquery\Request;

readonly class TqRequestColumn
{
    public static function fromArray(array $array): self
    {
        return new self(
            type: TqRequestColumnTypeEnum::fromName($array['type']),
            column: $array['column'],
        );
    }

    private function __construct(
        public TqRequestColumnTypeEnum $type,
        public string $column,
    ) {
    }
}
