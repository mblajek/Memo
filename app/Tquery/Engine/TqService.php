<?php

namespace App\Tquery\Engine;

use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqConfig;
use App\Tquery\Request\TqRequest;
use Illuminate\Http\Request;
use stdClass;

abstract readonly class TqService
{
    protected TqConfig $config;

    public function __construct()
    {
        $this->config = $this->getConfig();
    }

    protected function getBuilder(): TqBuilder
    {
        return TqBuilder::fromTable($this->config->table);
    }

    abstract protected function getConfig(): TqConfig;

    public function getConfigArray(): array
    {
        return [
            'columns' => array_map(fn(TqColumnConfig $column) => array_filter([
                'name' => $column->columnAlias,
                'type' => $column->type->notNullBaseType()->name,
                'nullable' => $column->type->isNullable(),
                'dictionaryId' => $column->dictionaryId,
                'attributeId' => $column->attributeId,
                'transform' => $column->transform,
            ], fn(mixed $value) => $value !== null), array_values($this->config->columns)),
            'customFilters' => new stdClass(),
        ];
    }

    public function query(Request $httpRequest): array
    {
        $request = TqRequest::fromHttpRequest($this->config, $httpRequest);
        $engine = new TqEngine($this->getBuilder(...), $request);
        return $engine->run();
    }
}
