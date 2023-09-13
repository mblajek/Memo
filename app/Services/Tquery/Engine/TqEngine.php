<?php

namespace App\Services\Tquery\Engine;

use App\Services\Tquery\Config\TqColumnConfig;
use App\Services\Tquery\Config\TqConfig;
use App\Services\Tquery\Request\TqRequest;
use App\Services\Tquery\Request\TqRequestColumn;
use Closure;
use stdClass;

readonly class TqEngine
{
    // readonly, but mutable
    private TqBuilder $builder;

    /** @param TqColumnConfig[] $columnConfigs */
    public function __construct(
        Closure $getBuilder,
        private TqConfig $config,
        private TqRequest $request,
        private array $columnConfigs,
    ) {
        $this->builder = $getBuilder();
    }

    public function run(): array
    {
        $this->applyJoin();
        $this->applySelect();
        $this->applyFilter();
        $this->applySort();
        $this->applyPaging();
        return [
            // todo: only in debug
            'sql' => $this->builder->getRawSql(),
            'meta' => $this->getMeta(),
            'data' => $this->getData(),
        ];
    }

    private function applyJoin(): void
    {
        foreach ($this->columnConfigs as $columnConfig) {
            $columnConfig->applyJoin($this->builder);
        }
    }

    private function applySelect(): void
    {
        foreach ($this->request->columns as $requestColumn) {
            $this->columnConfigs[$requestColumn->column]->applySelect($this->builder, $requestColumn);
        }
    }

    private function applyFilter(): void
    {
        // todo
    }

    private function applySort(): void
    {
        foreach ($this->request->sort as $requestSort) {
            $this->columnConfigs[$requestSort->column]->applySort($this->builder, $requestSort);
        }
        $this->builder->orderBy("`{$this->config->table->name}`.`id`", desc: false);
    }

    private function applyPaging(): void
    {
        $this->builder->applyPaging($this->request->number, $this->request->size);
    }

    private function getData(): array
    {
        return $this->builder->getData()->map(function (stdClass $row) {
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
            'totalDataSize' => $this->builder->getCount(),
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
