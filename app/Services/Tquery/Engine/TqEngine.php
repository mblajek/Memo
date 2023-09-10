<?php

namespace App\Services\Tquery\Engine;

use App\Services\Tquery\Config\TqColumnConfig;
use App\Services\Tquery\Config\TqConfig;
use App\Services\Tquery\Request\TqRequest;
use App\Services\Tquery\Request\TqRequestColumn;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use stdClass;

readonly class TqEngine
{
    // readonly, but mutable
    private Builder $builder;

    /** @param TqColumnConfig[] $columnConfigs */
    public function __construct(
        private TqConfig $config,
        private TqRequest $request,
        private array $columnConfigs,
    ) {
        $this->builder = DB::query();
    }

    public function run(): array
    {
        $this->applyFrom();
        $this->applySelect();
        $this->applyFilter();
        $this->applySort();
        $this->applyPaging();
        return [
            'meta' => $this->getMeta(),
            'data' => $this->getData(),
        ];

        // echo $this->builder->toRawSql();
        // print_r($this->request);
    }

    private function applyFrom(): void
    {
        $this->builder->from($this->config->table->name);
        $configTable = $this->config->table;
        $joinedTables = [$configTable];
        foreach ($this->columnConfigs as $columnConfig) {
            $columnTable = $columnConfig->table;
            if ($columnTable && !in_array($columnTable, $joinedTables, true)) {
                $columnTable->applyJoin(builder: $this->builder, joinBase: $configTable, left: true);
                $joinedTables[] = $columnTable;
            }
        }
    }

    private function applySelect(): void
    {
        foreach ($this->request->columns as $requestColumn) {
            $this->columnConfigs[$requestColumn->column]->applySelect($this->builder, $requestColumn, $this->config);
        }
    }

    private function applyFilter(): void
    {
        // todo
    }

    private function applySort(): void
    {
        foreach ($this->request->sort as $requestSort) {
            $this->columnConfigs[$requestSort->column]->applySort($this->builder, $requestSort, $this->config);
        }
    }

    private function applyPaging(): void
    {
        $this->builder->forPage($this->request->pageIndex, $this->request->pageSize);
    }

    private function getData(): array
    {
        return $this->builder->get()->map(function (stdClass $row) {
            $array = [];
            foreach ($this->request->columns as $requestColumn) {
                $columnAlias = $requestColumn->column;
                $array[$columnAlias] = $this->columnConfigs[$columnAlias]->render($row->{$columnAlias});
            }
            return $array;
        })->toArray();
    }


    private function getMeta(): array
    {
        return [
            'columns' => array_map(fn(TqRequestColumn $requestColumn) => [
                'type' => $requestColumn->type->name,
                'column' => $requestColumn->column,
            ], $this->request->columns),
            'totalDataSize' => $this->builder->getCountForPagination(),
        ];
    }

    /*
       $colHasPassword = $selectedColumns['has_password']->selectName;
         $colHasGlobalAdmin = $selectedColumns['has_global_admin']->selectName;
         $colName = $selectedColumns['name']->selectName;
           $builder->where(function (Builder $b2) use ($colHasGlobalAdmin,  $colName) {
             $b2->orWhere($colName, 'like', '%sau%');
             $b2->orWhere($colName, 'like', '%poz%');
         });
         $builder->where($colHasGlobalAdmin, 1);
    */
}
