<?php

namespace App\Services\Tquery\Request;

readonly class TqRequestSort
{
    public static function fromArray(array $array): self
    {
        return new self(
            type: TqRequestColumnTypeEnum::fromName($array['type']),
            column: $array['column'],
            desc: $array['desc'] ?? false,
        );
    }

    private function __construct(
        public TqRequestColumnTypeEnum $type,
        public string $column,
        public bool $desc,
    ) {
    }
}
