<?php

namespace App\Services\Tquery\Config;

use App\Exceptions\FatalExceptionFactory;
use App\Services\Tquery\Request\TqRequest;

final readonly class TqConfig
{
    /** @var array<string, TqColumnConfig> */
    public array $columns;

    public function __construct(
        public TqTableEnum $table,
        array $columns,
    ) {
        $this->columns = array_combine(
            array_map(fn(TqColumnConfig $column) => $column->columnAlias, $columns),
            $columns,
        );
    }

    /** @return array<string, TqColumnConfig> */
    public function getColumnsConfigs(TqRequest $request): array
    {
        $columnAliases = $request->allColumns();
        return array_combine(
            $columnAliases,
            array_map(
                fn(string $columnAlias) => $this->columns[$columnAlias] ?? (throw FatalExceptionFactory::tquery()),
                $columnAliases
            ),
        );
    }
}
