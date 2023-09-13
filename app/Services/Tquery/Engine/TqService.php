<?php

namespace App\Services\Tquery\Engine;

use App\Services\Tquery\Config\TqColumnConfig;
use App\Services\Tquery\Config\TqConfig;
use App\Services\Tquery\Request\TqRequest;
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
        return TqBuilder::make($this->config->table);
    }

    abstract protected function getConfig(): TqConfig;

    public function getConfigArray(): array
    {
        return [
            'columns' => array_map(fn(TqColumnConfig $column) => [
                'name' => $column->columnAlias,
                'type' => $column->type->notNullBaseType()->name,
                'nullable' => $column->type->isNullable(),
            ], array_values($this->config->columns)),
            'customFilters' => new stdClass(),
        ];
    }

    public function query(Request $httpRequest): array
    {
        $request = TqRequest::fromHttpRequest($this->config, $httpRequest);
        $columnConfigs = $this->config->getColumnsConfigs($request);
        $engine = new TqEngine($this->getBuilder(...), $this->config, $request, $columnConfigs);
        return $engine->run();
    }
}
