<?php

namespace App\Tquery\Engine;

use App\Tquery\Request\TqRequest;
use App\Tquery\Request\TqRequestColumn;
use Closure;
use stdClass;

readonly class TqEngine
{
    // readonly, but mutable
    private TqBuilder $builder;
    private array $columnConfigs;

    public function __construct(
        Closure $getBuilder,
        private TqRequest $request,
    ) {
        $this->columnConfigs = $this->request->allColumns();
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
            'sql' => $this->builder->getSql(true),
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
            $requestColumn->applySelect($this->builder);
        }
    }

    private function applyFilter(): void
    {
        match ($this->request->filter) {
            true => null,
            false => $this->builder->where(fn(null $bind) => 'false', false),
            default => $this->request->filter->applyFilter($this->builder, false)
        };
    }

    private function applySort(): void
    {
        foreach ($this->request->sort as $requestSort) {
            $requestSort->applySort($this->builder);
        }
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
                $columnAlias = $requestColumn->column->columnAlias;
                $array[$columnAlias] = $requestColumn->column->render($row->{$columnAlias});
            }
            return $array;
        })->toArray();
    }


    private function getMeta(): array
    {
        return [
            'columns' => array_map(fn(TqRequestColumn $requestColumn) => [
                'type' => $requestColumn->type->name,
                'column' => $requestColumn->column->columnAlias,
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
