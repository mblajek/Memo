<?php

namespace App\Tquery\Request;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Engine\TqBuilder;

readonly class TqRequestSort
{
    public static function fromArray(TqConfig $config, array $array): self
    {
        return new self(
            type: TqRequestColumnTypeEnum::fromName($array['type']),
            column: $config->columns[$array['column']] ?? (throw FatalExceptionFactory::tquery()),
            desc: $array['desc'] ?? false,
        );
    }

    public function applySort(TqBuilder $builder, string $collation): void
    {
        $sortQuery = $this->column->getSortQuery();
        if ($this->column->type->notNullBaseType() === TqDataTypeEnum::string) {
            $sortQuery = "convert($sortQuery using utf8mb4) collate $collation";
        }
        $builder->orderBy($sortQuery, $this->desc);
    }

    private function __construct(
        public TqRequestColumnTypeEnum $type,
        public TqColumnConfig $column,
        public bool $desc,
    ) {
    }
}
