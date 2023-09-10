<?php

namespace App\Services\Tquery\Engine;

use App\Services\Tquery\Config\TqColumnConfig;
use App\Services\Tquery\Config\TqConfig;
use App\Services\Tquery\Request\TqRequest;
use Illuminate\Http\Request;
use stdClass;

abstract readonly class TqService
{
    private TqConfig $config;

    public function __construct()
    {
        $this->config = $this->getConfig();
    }

    abstract protected function getConfig(): TqConfig;

    public function getConfigArray(): array
    {
        return [
            'columns' => array_map(fn(TqColumnConfig $column) => [
                'column' => $column->columnAlias,
                'type' => $column->type->baseDataType()->name,
            ], array_values($this->config->columns)),
            'customFilters' => new stdClass(),
        ];
    }

    public function query(Request $httpRequest): array
    {
        $request = TqRequest::fromRequest($this->config, $httpRequest);
        $columnConfigs = $this->config->getColumnsConfigs($request);
        $engine = new TqEngine($this->config, $request, $columnConfigs);
        return $engine->run();
    }
}
