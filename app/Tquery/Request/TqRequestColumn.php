<?php

namespace App\Tquery\Request;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqConfig;
use App\Tquery\Engine\TqBuilder;

readonly class TqRequestColumn
{
    public static function fromArray(TqConfig $config, array $array): self
    {
        return new self(
            type: TqRequestColumnTypeEnum::fromName($array['type']),
            column: $config->columns[$array['column']] ?? (throw FatalExceptionFactory::tquery()),
        );
    }

    public function applySelect(TqBuilder $builder): void
    {
        $builder->select($this->column->getSelectQuery(), $this->column->columnAlias);
    }

    private function __construct(
        public TqRequestColumnTypeEnum $type,
        public TqColumnConfig $column,
    ) {
    }
}
